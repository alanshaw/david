var express = require('express');
var tracker = require('./tracker');

var app = express();

app.post('/:pkg/track', function(req, res) {
	
	tracker.addPackage(req.body.packageJsonUrl, function(err, data) {
		
		if(err) {
			console.log('Failed to add package to tracker', err);
			res.json(500, {err: 'Failed to add package to tracker'});
			return;
		}
		
		console.log('Package added to tracker', data.name, data.version, data.dependencies);
		
		res.json(data);
	});
});

app.get('/:pkg/deps/updated', function(req, res) {
	
	tracker.getUpdatedDependencies(req.params.pkg, function(err, deps) {
		
		if(err) {
			console.log('Failed to get updated dependencies', err);
			res.json(500, {err: 'Failed to get updated dependencies'});
			return;
		}
		
		res.json(deps);
	});
});

app.listen(process.argv[2]);

console.log('David listening on port', process.argv[2]);

/*
// TODO: Move into unit test
// Add a package to the tracker
tracker.addPackage('https://raw.github.com/alanshaw/grunt-jsio/master/package.json', function(err, data) {
	
	if(err) {
		console.log('Failed to add package to tracker', err);
		return;
	}
	
	console.log('Package added to tracker', data.name, data.version, data.dependencies);
	
	// Listen for when version change events occur
	tracker.on('dependencyVersionChange', function(pkgData, oldVersion) {
		console.log('Dependency ' + pkgData.name + ' changed version from ' + oldVersion + ' to ' + pkgData.version);
	});
	
	// Schedule a dependency version update
	tracker.updateDependencyVersions(function(err) {
		
		if(err) {
			console.log('Failed to update dependency versions', err);
			return;
		}
		
		console.log('Dependencies updated!');
	});
});

*/