/**
 * Keeps track of the packages David is meant to be watching as well as the NPM packages they depend on.
 * 
 * Allows users of the module to add packages to the watch list as well as query what dependencies have been updated.
 * 
 * Events:
 * dependencyVersionChange(packageData, oldVersion)
 */

var events = require("events");
var npm = require('npm');
var moment = require('moment');

// Give this module ability to emit events (and for others to listen)
var exports = new events.EventEmitter();

function Package(name, version) {
	// TODO: Sanitise name && dependencies names
	this.name = name;
	this.version = version;
	this.dependencies = {};
	this.expires = moment().add(Package.TTL);
}

Package.prototype.toJSON = function() {
	return JSON.stringify({
		name: this.name,
		version: this.version,
		dependencies: this.dependencies
	});
};

Package.TTL = moment.duration({days: 1});

Package.fromManifest = function(manifest) {
	
	// Make a copy of the passed manifest incase its values are changed elsewhere
	manifest = JSON.parse(JSON.stringify(manifest));
	
	var pkg = new Package(manifest.name, manifest.version);
	
	pkg.dependencies = manifest.dependencies || {};
	
	return pkg;
};

/**
 * Cache of the npm packages that projects depend on. Keyed by package name.
 */
var dependencies = {};

/**
 * Get a package for a given dependency name, guaranteed to be less old than Package.TTL
 * 
 * @param pkgName
 * @param callback
 */
function getDependency(pkgName, callback) {
	
	process.nextTick(function() {
		
		var dep = dependencies[pkgName];
		
		if(dep && dep.expires > new Date()) {
			callback(null, dep);
			return;
		}
		
		npm.load({}, function(err) {
			
			if(err) callback(err);
			
			npm.commands.view([pkgName, 'dist-tags.latest'], function(err, data) {
				
				if(err) callback(err);
				
				var version = Object.keys(data)[0];
				
				console.log('Found latest version', pkgName, version);
				
				var oldVersion = dep ? dep.version : undefined;
				
				dep = dependencies[pkgName] = new Package(pkgName, version);
				
				if(oldVersion != version) {
					exports.emit('dependencyVersionChange', JSON.parse(dep.toJSON()), oldVersion);
				}
				
				// TODO: Update package dependencies
				
				callback(null, dep);
			});
		});
	});
}

/**
 * Get a list of updated packages for the passed manifest.
 * 
 * @param {String} manifest Parsed package.json file contents
 * @param {Function<Error, Array<Object>>} callback Function that receives the results
 */
exports.getUpdatedDependencies = function(manifest, callback) {
	
	process.nextTick(function() {
		
		var pkg = Package.fromManifest(manifest);
		var updatedPkgs = [];
		var depNames = Object.keys(pkg.dependencies);
		
		if(!depNames.length) {
			callback(null, updatedPkgs);
			return;
		}
		
		var processedDeps = 0;
		
		depNames.forEach(function(depName) {
			
			getDependency(depName, function(err, dep) {
				
				processedDeps++;
				
				if(err) {
					
					console.log('Failed to get dependency', depName, err);
					
				} else {
					
					var pkgDepVersion = pkg.dependencies[depName];
					
					// TODO: function to determine when a package version using semver syntax is considered different from absolute version number
					if(pkgDepVersion != dep.version) {
						updatedPkgs.push(JSON.parse(dep.toJSON()));
					}
				}
				
				if(processedDeps == depNames.length) {
					callback(null, updatedPkgs);
				}
			});
		});
	});
};

module.exports = exports;