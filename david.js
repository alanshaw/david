/**
 * david
 * https://github.com/alanshaw/david
 *
 * Copyright (c) 2013 Alan Shaw
 * Licensed under the MIT license.
 */

var events = require('events');
var npm = require('npm');
var moment = require('moment');
var semver = require('semver');
var semverext = require('./semverext');

// Give this module ability to emit events (and for others to listen)
var exports = new events.EventEmitter();

function Package(name, stable, latest) {
	this.name = name;
	this.stable = stable;
	this.latest = latest;
	this.expires = moment().add(Package.TTL);
}

Package.TTL = moment.duration({days: 1});

var dependencies = {}; // Cache of the npm packages that projects depend on. Keyed by package name.
var dependenciesCount = 0; // The current number of dependencies in the cache
var maxDependencies = Infinity; // The maximum number of dependencies allowed in the cache

/**
 * Cache a dependency if maxDependencies > 0.
 * 
 * @param {Package} dep
 * @return {Package} The cached dependency
 */
function cacheDependency(dep) {
	
	// Do we cache?
	if(maxDependencies > 0) {
		
		// Is it a new entry?
		if(!dependencies[dep.name]) {
			
			// Have we cached too many?
			if(dependenciesCount + 1 > maxDependencies) {
				
				var foundExpired = false,
					depNames = Object.keys(dependencies),
					now = new Date(),
					oldestDepName = depNames[0];
				
				// Find an expired dependency to remove from the cache
				for(var i = 0, len = depNames.length; i < len; ++i) {
					
					if(dependencies[depNames[i]].expires < now) {
						foundExpired = true;
						delete dependencies[depNames[i]];
						break;
					} else if(dependencies[depNames[i]].expires < dependencies[oldestDepName].expires) {
						// Keep track of the oldest dependency incase we don't find an expired dependency
						oldestDepName = depNames;
					}
				}
				
				if(!foundExpired) {
					delete dependencies[oldestDepName];
				}
				
			} else {
				dependenciesCount++;
			}
		}
		
		dependencies[dep.name] = dep;
	}
	
	return dep;
}

/**
 * Get a package for a given dependency name, guaranteed to be less old than Package.TTL
 * 
 * @param {String} pkgName
 * @param {Function<Error, Package>} callback
 */
function getDependency(pkgName, callback) {
	
	process.nextTick(function() {
		
		var dep = dependencies[pkgName];
		
		if(dep && dep.expires > new Date()) {
			callback(null, dep);
			return;
		}
		
		npm.load({}, function(err) {
			
			if(err) {
				callback(err);
				return;
			}
			
			npm.commands.view([pkgName, 'versions'], true, function(err, data) {
				
				if(err) {
					callback(err);
					return;
				}
				
				// Get the latest dep in this tick (as it might have been updated in a tick between when it was first assigned and now)
				dep = dependencies[pkgName];
				
				var latest = Object.keys(data)[0],
					versions = data[latest].versions,
					stable = getLatestStable(versions),
					oldStable = dep ? dep.stable : undefined,
					oldLatest = dep ? dep.latest : undefined;
				
				dep = cacheDependency(new Package(pkgName, stable, latest));
				
				if(oldStable != stable) {
					exports.emit('stableVersionChange', pkgName, oldStable, stable);
				}
				
				if(oldLatest != latest) {
					exports.emit('latestVersionChange', pkgName, oldLatest, latest);
				}
				
				callback(null, dep);
			});
		});
	});
}

/**
 * Determine if a version is a stable version or not.
 * 
 * @param {String} version
 * @return {Boolean}
 */
function isStable(version) {
	return !(/[a-z+\-]/i.test(version || ''));
}

/**
 * Get the latest stable version from a list of versions in ascending order.
 * 
 * @param {Array<String>} versions
 * @return {String}
 */
function getLatestStable(versions) {
	
	versions = versions.slice();
	
	while(versions.length) {
		
		var version = versions.pop();
		
		if(isStable(version)) {
			return version;
		}
	}
	
	return null;
}

/**
 * Get a list of dependencies for the passed manifest.
 * 
 * @param {Object} manifest Parsed package.json file contents
 * @param {Object|Function<Error, Object>} [options] Options or callback
 * @param {Boolean} [options.dev] Consider devDependencies
 * @param {Function<Error, Object>} callback Function that receives the results
 */
exports.getDependencies = function(manifest, options, callback) {
	
	process.nextTick(function() {
		
		// Allow callback to be passed as second parameter
		if(!callback) {
			callback = options;
			options = {};
		} else {
			options = options || {};
		}
		
		var pkgs = {};
		var deps = manifest[options.dev ? 'devDependencies' : 'dependencies'] || {};
		var depNames = Object.keys(deps);
		
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
					pkgs[depName] = {required: deps[depName], stable: dep.stable, latest: dep.latest};
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
 * @param {Object} manifest Parsed package.json file contents
 * @param {Object|Function<Error, Object>} [options] Options or callback
 * @param {Boolean} [options.stable] Consider only stable packages
 * @param {Boolean} [options.dev] Consider devDependencies
 * @param {Function<Error, Object>} callback Function that receives the results
 */
exports.getUpdatedDependencies = function(manifest, options, callback) {
	
	process.nextTick(function() {
		
		// Allow callback to be passed as second parameter
		if(!callback) {
			callback = options;
			options = {};
		} else {
			options = options || {};
		}
		
		var updatedPkgs = {};
		var deps = manifest[options.dev ? 'devDependencies' : 'dependencies'] || {};
		var depNames = Object.keys(deps);
		
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
					
					var pkgDepVersion = deps[depName] || '*';
					
					// TODO: Handle tags correctly
					if(pkgDepVersion != 'latest' && pkgDepVersion != '*') {
						
						var range = semver.validRange(pkgDepVersion) || '';
						var version = options.stable ? dep.stable : dep.latest;
						var addToUpdatedPkgs = false;
						
						if(version) {
							
							if(!range) {
								
								addToUpdatedPkgs = true;
								
							} else if(!semver.satisfies(version, range)) {
								
								if(options.stable && semverext.gtr(version, range)) {
									
									addToUpdatedPkgs = true;
									
								} else if(!options.stable) {
									
									addToUpdatedPkgs = true;
								}
							}
						}
						
						if(addToUpdatedPkgs) {
							updatedPkgs[depName] = {required: pkgDepVersion, stable: dep.stable, latest: dep.latest};
						}
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
 * @param {moment.duration} duration Time period the packages will be cacched for, expressed as a moment.duration.
 */
exports.setCacheDuration = function(duration) {
	Package.TTL = duration;
};

/**
 * Set the maximum number of dependencies that can be stored in the cache.
 * 
 * @param {Integer} size
 */
exports.setCacheSize = function(size) {
	maxDependencies = size;
};

module.exports = exports;
