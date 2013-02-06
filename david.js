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

(function() {
	
	"use strict";
	
	// Give this module ability to emit events (and for others to listen)
	var exports = new events.EventEmitter();
	
	function Package(name, stable, latest) {
		this.name = name;
		this.stable = stable;
		this.latest = latest;
		this.expires = moment().add(Package.TTL);
	}
	
	Package.TTL = moment.duration({days: 1});
	
	/**
	 * Cache of the npm packages that projects depend on. Keyed by package name.
	 */
	var dependencies = {};
	
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
				
				npm.commands.view([pkgName, 'versions'], function(err, data) {
					
					if(err) {
						callback(err);
						return;
					}
					
					var latest = Object.keys(data)[0],
						versions = data[latest].versions,
						stable = getLatestStable(versions),
						oldStable = dep ? dep.stable : undefined,
						oldLatest = dep ? dep.latest : undefined;
					
					dep = dependencies[pkgName] = new Package(pkgName, stable, latest);
					
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
		return version && version.indexOf('-') == -1 && version.indexOf('+') == -1;
	}
	
	/**
	 * Get the latest stable version from a list of versions in ascending order.
	 * 
	 * @param {Array<String>} versions
	 * @return {String}
	 */
	function getLatestStable(versions) {
		
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
						pkgs[depName] = {
							required: manifest.dependencies[depName],
							stable: dep.stable,
							latest: dep.latest
						};
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
						
						var pkgDepVersion = manifest.dependencies[depName] || '*';
						
						// TODO: Handle tags correctly
						if(pkgDepVersion != 'latest' && pkgDepVersion != '*') {
							
							var range = semver.validRange(pkgDepVersion);
							
							if(!range || !semver.satisfies(dep.latest, range)) {
								updatedPkgs[depName] = {
									required: pkgDepVersion,
									stable: dep.stable,
									latest: dep.latest
								};
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
	 * @param {moment.duration} duration Time period the packages will be cahced for, expressed as a moment.duration.
	 */
	exports.setCacheDuration = function(duration) {
		Package.TTL = duration;
	};
	
	module.exports = exports;
	
})();