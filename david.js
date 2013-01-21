/**
 * Events:
 * packageVersionChange(package, oldVersion)
 */

var util = require("util");
var events = require("events");
var request = require('request');
var exec = require('child_process').exec;

// Give this module ability to emit events (and for others to listen)
util.inherits(module.exports, events.EventEmitter);

function Package(name, version, dependencies) {
	// TODO: Sanitise name && dependencies names
	this.name = name;
	this.version = version;
	this.dependencies = dependencies;
}

function Project(repository, pkg) {
	this.repository = repository;
	this.pkg = pkg;
}

/**
 * Cache of the npm packages that projects depend on. Keyed by Package.name.
 */
var pkgs = {};

/**
 * Projects users have submitted to the site. Keyed by Project.pkg.name.
 */
var projects = {};

/**
 * Update version information for the provided npm package. Emits a packageVersionChange event if the version number
 * changes.
 * 
 * @param {String} pkgName
 */
function updatePackageVersion(pkgName) {
	
	exec('npm view ' + pkgName + ' dist-tags.latest', function(error, stdout, stdin) {
			
			if(error) {
				console.error(error);
				return;
			}
			
			var version = stdout.trim();
			
			console.log('Found latest version', pkgName, version);
			
			if(!pkgs[pkgName]) {
				
				pkgs[pkgName] = new Package(pkgName, version, []);
				
				module.exports.emit('packageVersionChange', pkgs[pkgName]);
				
			} else {
				
				var oldVersion = pkgs[pkgName].version;
				
				if(oldVersion != version) {
					
					pkgs[pkgName].version = version;
					
					module.exports.emit('packageVersionChange', pkgs[pkgName], oldVersion);
				}
			}
			
			module.exports.emit('packageVersionChange');
			
			// TODO: Update package dependencies
	});
}

/**
 * Update the cache of all package versions
 */
module.exports.updatePackageVersions = function() {
	
	var updatedPkgs = {};
	
	for(var projectName in projects) {
		
		if(!projects.hasOwnProperty(projectName)) continue;
		
		console.log('Updating package versions for project', projectName);
		
		var project = projects[projectName];
		
		for(var pkgName in project.pkg.dependencies) {
			
			if(!project.pkg.dependencies.hasOwnProperty(pkgName)) continue;
			
			console.log('Updating package version', pkgName);
			
			if(updatedPkgs[pkgName]) continue;
			
			updatedPkgs[pkgName] = true;
			
			updatePackageVersion(pkgName);
		}
	}
};

/**
 * Add a project to the list of projects we keep track of dependencies of
 * 
 * @param {String} packageJsonUrl URL of the package.json file
 * @return {boolean}
 */
module.exports.addProject = function(packageJsonUrl) {
	
	console.log('Adding project', packageJsonUrl);
	
	request(packageJsonUrl, function(error, response, body) {
		
		if(!error && response.statusCode == 200) {
			
			console.log('Successfully retrieved package.json');
			
			var data = JSON.parse(body);
			
			// 200 OK
			if(projects[data.name]) return;
			
			projects[data.name] = new Project(
				packageJsonUrl,
				new Package(data.name, data.version, data.dependencies)
			);
		}
	});
};

/**
 * Get a project by its package name
 * 
 * @param {String} pkgName
 * @return {Project}
 */
function findProject(pkgName) {
	
	for(var projectName in projects) {
		
		if(!projects.hasOwnProperty(projectName)) continue;
		
		if(projects[projectName].pkg.name == pkgName) {
			return projects[projectName];
		}
	}
	
	return null;
}

/**
 * Get a list of updated packages for the passed project package name.
 * 
 * @param pkgName
 * @return {Array<Object>}
 */
module.exports.getUpdatedPackages = function(pkgName) {
	
	var project = findProject(pkgName);
	
	var updatedPkgs = [];
	
	if(!project) return updatedPkgs;
	
	Object.keys(project.pkg.dependencies).forEach(function(pkgName) {
		
		if(!pkgs[pkgName]) return;
		
		var projectVersion = project.pkg.dependencies[pkgName];
		
		if(projectVersion != pkgs[pkgName].version) {
			
			updatedPkgs.push({
				name: pkgName,
				version: pkgs[pkgName].version,
				// TODO: Clone dependencies
				dependencies: {}
			});
		}
	});
	
	return updatedPkgs;
}