
var request = require('request');
var exec = require('child_process').exec;


function Package(name, version, dependencies) {
	this.name = name;
	this.version = version;
	this.dependencies = dependencies;
}

function Project(repository, pkg) {
	this.repository = repository;
	this.pkg = pkg;
}

/**
 * The packages that have been submitted to the site that presumably people are interested in.
 * @type {Object}
 */
var pkgs = {
	/*
	'grunt': {
		version: '0.8.1', 
		dependencies: [
			'foo', 'bar'
		]
	}
	*/
};

var projects = {};

function parsePackageVersion(npmOutput) {
	
}

function updatePackageVersions() {
	
	for(var projectName in projects) {
		
		if(!projects.hasOwnProperty(projectName)) continue;
		
		exec('npm view ' + projectName + ' dist-tags.latest', function(err, stdout, stdin) {
			
			try {
				
				var version = parsePackageVersion(stdout);
				
			} catch(e) {
				console.log('Failed to parse package version', stdout, e);
			}
		});
	}
}

// Every hour, update the dependencies
setTimeout(updatePackageVersions, 1000 * 60 * 60);

// To expose ///////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @param {String} packageJsonUrl URL of the package.json file
 * @return {boolean}
 */
function addProject(packageJsonUrl) {
	
	request(packageJsonUrl, function(error, response, body) {
		
		if (!error && response.statusCode == 200) {
			
			var data = JSON.parse(body);
			
			// 200 OK
			if(projects[data.name]) return true;
			
			projects[data.name] = new Project(
				packageJsonUrl,
				new Package(data.name, data.version, data.dependencies)
			);
		}
	});
}

module.exports.addProject = addProject;