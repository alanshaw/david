<img src="https://raw.github.com/alanshaw/david-www/master/david.png" title="David"/> [![Build Status](https://travis-ci.org/alanshaw/david.png)](https://travis-ci.org/alanshaw/david) [![Dependency Status](https://david-dm.org/alanshaw/david.png)](https://david-dm.org/alanshaw/david) [![Coverage Status](https://coveralls.io/repos/alanshaw/david/badge.png?branch=master)](https://coveralls.io/r/alanshaw/david?branch=master)
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
		'aaa': '~0.0.0',
		'bbb': '~0.0.0',
	},
	devDependencies: {
		'yyy': '~0.0.0',
		'zzz': '~0.0.0',
	}
};

david.getDependencies(manifest, function(err, deps) {
	console.log('latest dependencies information for', manifest.name);
	listDependencies(deps);
});

david.getDependencies(manifest, {dev: true}, function(err, deps) {
	console.log('latest devDependencies information for', manifest.name);
	listDependencies(deps);
});

david.getUpdatedDependencies(manifest, function(err, deps) {
	console.log('dependencies with newer versions for', manifest.name);
	listDependencies(deps);
});

david.getUpdatedDependencies(manifest, {dev: true}, function(err, deps) {
	console.log('devDependencies with newer versions for', manifest.name);
	listDependencies(deps);
});

david.getUpdatedDependencies(manifest, {stable: true}, function(err, deps) {
	console.log('dependencies with newer STABLE versions for', manifest.name);
	listDependencies(deps);
});

david.getUpdatedDependencies(manifest, {dev: true, stable: true}, function(err, deps) {
	console.log('devDependencies with newer STABLE versions for', manifest.name);
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


CLI
---

If you install David globally (`npm install -g david`), you can run `david` in your project directory to see which dependencies are out of date.

You can also run `david --global` to see your outdated global dependencies.

### Update to latest

To update all your project dependencies to the latest _stable_ versions, and save to your `package.json`, run:

```sh
david update
```

You can also update global dependencies to latest versions:

```sh
david update --global
```

To update all your project dependencies to the latest versions (including unstable versions), pass the `--unstable` flag:

```sh
david update --unstable
```


Cache
-----

David caches packages it looks up from NPM for 1 day. You can set the cache duration by calling `setCacheDuration` and passing it a [moment](http://momentjs.com/docs/) [duration](http://momentjs.com/docs/#/durations/).

N.B. Packages are actually cached forever, but are refreshed according to this duration. You can control the number of packages david will cache by calling `setCacheSize`.


Events
------

David will let you know when versions for packages it has cached change. Listen to the following events:

### stableVersionChange(name, fromVersion, toVersion)

Fired when a dependency stable version changed from a stable version to a stable version.

N.B. fromVersion may be undefined

### latestVersionChange(name, fromVersion, toVersion)

Fired when a latest version changed from stable or build or patch version to stable or build or patch version

N.B. fromVersion may be undefined.

N.B. These events are retroactive. David will only fire them after a call to `getDependencies` or `getUpdatedDependencies` when one or more of the dependencies for the passed manifest have been updated in NPM since david last cached them. The events are not guaranteed to be fired for each version change. If david caches 0.0.1 and version 0.0.2 and 0.0.3 are released before the cache expires, david will only fire an event with 0.0.1 and 0.0.3 as the `fromVersion` and `toVersion` respectively.


Release History
---------------

 * 2013-08-04   v1.9.0   CLI added `--unstable` flag to view/update to latest _unstable_ dependency versions
 * 2013-07-30   v1.8.0   CLI added `david update` to update dependencies to latest _stable_ versions and save to your project `package.json`
 * 2013-06-27   v1.7.0   Updated to use semver 2 module. Simplified code that determines if a version is greater than a range
 * 2013-03-28   v1.6.0   Use setImmediate instead of process.nextTick. David now requires NodeJS 0.10.x
 * 2013-03-27   v1.5.0   CLI added --global flag to find outdated global dependencies
 * 2013-03-15   v1.4.0   Allow set the maximum number of dependencies that can be stored in the cache
 * 2013-03-14   v1.3.0   Added CLI support
 * 2013-03-05   v1.2.0   David can now get dependency information for devDependencies
 * 2013-02-07   v1.1.0   Adds onlyStable param to getUpdatedDependencies to filter by dependencies that are updated and stable
 * 2013-02-06   v1.0.0   Return latest stable version as well as latest version (including patch and build versions). API return values changed. Events changed.
