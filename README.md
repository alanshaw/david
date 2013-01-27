<img src="https://raw.github.com/alanshaw/david/master/david.png"/>

David
=====

Nodejs based web service that tells you when your project npm dependencies are out of date. To use David, your project must include a [package.json](https://npmjs.org/doc/json.html) file in the root of your repository.

Currently David works with package.json files found in _public_ github repositories only.

Getting Started
---------------

Install [Node.js](http://nodejs.org/)

Install david:

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

