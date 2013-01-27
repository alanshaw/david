/**
 * Keeps a cache of dependencies it has recently looked up versions for. Allows users to get a list of their package 
 * dependencies that are out of date.
 * 
 * Events:
 * dependencyVersionChange(packageData, oldVersion)
 */

var events = require('events');
var npm = require('npm');
var moment = require('moment');
var semver = require('semver');

// Give this module ability to emit events (and for others to listen)
var exports = new events.EventEmitter();

function Package(name, version) {
	this.name = name;
	this.version = version;
	this.expires = moment().add(Package.TTL);
}

Package.prototype.toJSON = function() {
	return JSON.stringify({
		name: this.name,
		version: this.version
	});
};

Package.TTL = moment.duration({days: 1});

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
				
				callback(null, dep);
			});
		});
	});
}

/**
 * Get a list packages for the passed manifest.
 * 
 * @param {String} manifest Parsed package.json file contents
 * @param {Function<Error, Object>} callback Function that receives the results
 */
exports.getDependencies = function(manifest, callback) {
	
	process.nextTick(function() {
		
		var pkgs = {};
		var depNames = Object.keys(manifest.dependencies || {});
		
		if(!depNames.length) {
			callback(null, pkgs);
			return;
		}
		
		var processedDeps = 0;
		
		depNames.forEach(function(depName) {
			
			getDependency(depName, function(err, dep) {
				
				processedDeps++;
				
				if(err) {
					console.log('Failed to get dependency', depName, err);
				} else {
					pkgs[depName] = dep.version;
				}
				
				if(processedDeps == depNames.length) {
					callback(null, pkgs);
				}
			});
		});
	});
};

/**
 * Get a list of updated packages for the passed manifest.
 * 
 * @param {String} manifest Parsed package.json file contents
 * @param {Function<Error, Object>} callback Function that receives the results
 */
exports.getUpdatedDependencies = function(manifest, callback) {
	
	process.nextTick(function() {
		
		var updatedPkgs = {};
		var depNames = Object.keys(manifest.dependencies || {});
		
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
					
					var pkgDepVersion = manifest.dependencies[depName];
					
					var range = semver.validRange(pkgDepVersion);
					
					if(!range || !semver.satisfies(dep.version, range)) {
						updatedPkgs[depName] = dep.version;
					}
				}
				
				if(processedDeps == depNames.length) {
					callback(null, updatedPkgs);
				}
			});
		});
	});
};

/**
 * Set the TTL for cached packages.
 * 
 * @param {moment.duration} duration Time period the packages will be cahced for, expressed as a moment.duration.
 */
exports.setCacheDuration = function(duration) {
	Package.TTL = duration;
};

module.exports = exports;