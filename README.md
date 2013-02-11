<img src="https://raw.github.com/alanshaw/david-www/master/david.png"/>

David [![Build Status](https://travis-ci.org/alanshaw/david.png)](https://travis-ci.org/alanshaw/david) [![Dependency Status](https://david-dm.org/alanshaw/david.png)](https://david-dm.org/alanshaw/david)
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
		console.log('Latest dependency information for', manifest.name);
		listDependencies(deps);
	});
	
	david.getUpdatedDependencies(manifest, false, function(err, deps) {
		console.log('Dependencies with newer versions for', manifest.name);
		listDependencies(deps);
	});
	
	david.getUpdatedDependencies(manifest, true, function(err, deps) {
		console.log('Dependencies with newer STABLE versions for', manifest.name);
		listDependencies(deps);
	});
	
	function listDependencies(deps) {
		Object.keys(deps, function(depName) {
			var required = deps[depName].required || '*';
			var stable = deps[depName].stable || 'None';
			var latest = deps[depName].latest;
			console.log(depName + 'Required: ' + required + ' Stable: ' + stable + ' Latest: ' + latest);
		});
	}
	
```

Both `getDependencies` and `getUpdatedDependencies` return an object result, whose keys are package names. The values are objects which contain the following properties:

- `required` - The version required according to the manifest
- `stable` - The latest stable version available
- `latest` - The latest version available (including build and patch versions)


### Cache

David caches packages it looks up from NPM for 1 day. You can set the cache duration by calling `setCacheDuration` and passing it a [moment](http://momentjs.com/docs/) [duration](http://momentjs.com/docs/#/durations/).

N.B. Packages are actually cached forever, but are refreshed according to this duration.


### Events

David will let you know when versions for packages it has cached change. Listen to the following events:

#### stableVersionChange(name, fromVersion, toVersion)

Fired when a dependency stable version changed from a stable version to a stable version.

Note: fromVersion may be undefined

#### latestVersionChange(name, fromVersion, toVersion)

Fired when a latest version changed from stable or build or patch version to stable or build or patch version

Note: fromVersion may be undefined