var request = require('request');

var exports = {};

exports.getManifest = function(url, callback) {
	
	request(url, function(err, response, body) {
		
		if(!err && response.statusCode == 200) {
			
			console.log('Successfully retrieved package.json');
			
			var data = JSON.parse(body);
			
			if(!data) {
				callback(new Error('Failed to parse package.json'));
			} else {
				
				console.log('Got manifest', data.name, data.version);
				
				callback(null, data);
			}
			
		} else if(!err) {
			
			callback(new Error('Failed to add package. HTTP response was: ' + response.statusCode));
			
		} else {
			
			callback(err);
		}
	});
};

exports.getGithubManifestUrl = function(username, repo) {
	return 'https://raw.github.com/' + username + '/' + repo + '/master/package.json';
};

module.exports = exports;