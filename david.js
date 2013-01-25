var express = require('express');
var tracker = require('./tracker');
var manifest = require('./manifest');

var app = express();

/**
 * Get updated dependencies for the GitHub :repo owned by :user 
 */
app.get('/:user/:repo/deps/updated', function(req, res) {
	
	var url = manifest.getGithubManifestUrl(req.params.user, req.params.repo);
	
	manifest.getManifest(url, function(err, manifest) {
		
		if(err) {
			console.log('Failed to get manifest', err);
			res.json(500, {err: 'Failed to get package.json'});
			return;
		}
		
		tracker.getUpdatedDependencies(manifest, function(err, deps) {
			
			if(err) {
				console.log('Failed to get updated dependencies', err);
				res.json(500, {err: 'Failed to get updated dependencies'});
				return;
			}
			
			res.json(deps);
		});
	});
});

/**
 * Get all dependencies for GitHub :repo owned by :user 
 */
app.get('/:user/:repo/deps', function(req, res) {
	
	var url = manifest.getGithubManifestUrl(req.params.user, req.params.repo);
	
	manifest.getManifest(url, function(err, manifest) {
		
		if(err) {
			console.log('Failed to get manifest', err);
			res.json(500, {err: 'Failed to get package.json'});
			return;
		}
		
		res.json(manifest.dependencies);
	});
});

if(!process.argv[2]) {
	console.log('No port specified');
	return;
}

app.listen(process.argv[2]);

console.log('David listening on port', process.argv[2]);