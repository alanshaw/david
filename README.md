<img src="https://raw.github.com/alanshaw/david-www/master/david.png"/>

David [![Dependency Status](http://david-dm.org/alanshaw/david/status.png)](http://david-dm.org/alanshaw/david)
=====

Nodejs module that tells you when your package NPM dependencies are out of date.

Getting Started
---------------

Install [Node.js](http://nodejs.org/)

Install david:

	cd /your/project/directory
	npm install david

Use:

```javascript
	
	var david = require('david');
	
	// Your package.json
	var manifest = {
		name: 'xxx',
		dependencies: {
			'yyy': '~0.0.0',
			'zzz': '~0.0.0',
		}
	};
	
	david.getDependencies(manifest, function(err, deps) {
		console.log('Latest dependency versions for', manifest.name);
		Object.keys(deps, function(depName) {
			console.log(depName + ' - ' + deps[depName]);
		});
	});
	
	david.getUpdatedDependencies(manifest, function(err, deps) {
		console.log('Out of date dependencies and their versions for', manifest.name);
		Object.keys(deps, function(depName) {
			console.log(depName + ' - ' + deps[depName]);
		});
	});
	
```

