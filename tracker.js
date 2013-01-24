/**
 * Keeps track of the packages David is meant to be watching as well as the NPM packages they depend on.
 * 
 * Allows users of the module to add packages to the watch list as well as query what dependencies have been updated.
 * 
 * Events:
 * dependencyVersionChange(packageData, oldVersion)
 */

var util = require("util");
var events = require("events");
var request = require('request');
var npm = require('npm');

// Give this module ability to emit events (and for others to listen)
util.inherits(module.exports, events.EventEmitter);

function Package(name, version) {
	// TODO: Sanitise name && dependencies names
	this.name = name;
	this.version = version;
	this.dependencies = {};
}

Package.prototype.toJSON = function() {
	return JSON.stringify({
		name: this.name,
		version: this.version,
		dependencies: this.dependencies
	});
};

/**
 * Cache of the npm packages that projects depend on. Keyed by Package.name.
 */
var deps = {};

/**
 * Packages users have submitted to the site. Keyed by Package.name.
 */
var pkgs = {};

/**
 * Update version information for the provided NPM package. Emits a packageVersionChange event if the version number
 * changes.
 * 
 * @param {String} pkgName
 */
function updateDependencyVersion(pkgName) {
	
	npm.commands.view([pkgName, 'dist-tags.latest'], function(error, version) {
		
		if(error) {
			console.error(error);
			return;
		}
		
		console.log('Found latest version', pkgName, version);
		
		if(!deps[pkgName]) {
			
			deps[pkgName] = new Package(pkgName, version);
			
			module.exports.emit('dependencyVersionChange', JSON.parse(deps[pkgName].toJSON()));
			
		} else {
			
			var oldVersion = deps[pkgName].version;
			
			if(oldVersion != version) {
				
				deps[pkgName].version = version;
				
				module.exports.emit('dependencyVersionChange', JSON.parse(deps[pkgName].toJSON()), oldVersion);
			}
		}
		
		// TODO: Update package dependencies
	});
}

/**
 * Update the cache of dependencies versions our packages are depending on
 * 
 * @param {Function<Error>} [callback] Callback invoked after the packages have been updated
 */
module.exports.updateDependencyVersions = function(callback) {
	
	process.nextTick(function() {
		
		for(var pkgName in deps) {
			
			if(!deps.hasOwnProperty(pkgName)) continue;
			
			console.log('Updating package version', pkgName);
			
			updateDependencyVersion(pkgName);
		}
		
		if(callback) callback();
	});
};

/**
 * Add a package to the list of packages we keep track of dependencies of
 * 
 * @param {String} packageJsonUrl URL of the package.json file
 * @param {Function<Error, Object>} [callback] Callback that receives details of the created package
 * @return {boolean}
 */
module.exports.addPackage = function(packageJsonUrl, callback) {
	
	process.nextTick(function() {
		
		console.log('Adding package', packageJsonUrl);
		
		request(packageJsonUrl, function(error, response, body) {
			
			if(!error && response.statusCode == 200) {
				
				console.log('Successfully retrieved package.json');
				
				var data = JSON.parse(body);
				
				var pkg = new Package(data.name, data.version);
					
				pkg.dependencies = data.dependencies;
				
				pkgs[data.name] = pkg;
				
				if(callback) callback(null, JSON.parse(pkg.toJSON()));
				
			} else {
				
				if(callback) {
					
					if(!error) {
						callback(new Error('Failed to add package. HTTP response was: ' + response.statusCode));
					} else {
						callback(error);
					}
				}
			}
		});
	});
};

/**
 * Get a list of updated packages for the passed package name.
 * 
 * @param {String} pkgName
 * @param {Function<Error, Array<Object>>} callback Function that receives the results
 */
module.exports.getUpdatedDependencies = function(pkgName, callback) {
	
	process.nextTick(function() {
		
		var pkg = pkgs[pkgName];
		
		callback(new Error('Package ' + pkgName + ' not found. Did you add it yet?'));
		
		var updatedPkgs = [];
		
		Object.keys(pkg.dependencies).forEach(function(pkgName) {
			
			if(!deps[pkgName]) return;
			
			var projectVersion = pkg.dependencies[pkgName];
			
			if(projectVersion != deps[pkgName].version) {
				updatedPkgs.push(JSON.parse(deps[pkgName].toJSON()));
			}
		});
		
		callback(null, updatedPkgs);
	});
}