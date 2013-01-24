var tracker = require('./tracker');

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

