<p align="center"><a href="https://david-dm.org"><img src="https://raw.github.com/alanshaw/david-www/master/david-logo.png" alt="David" height="50" /></a></p>
<p align="center">
<a href="https://www.npmjs.com/package/david"><img src="https://img.shields.io/npm/v/david.svg" alt="npm version"></a>
<a href="http://inch-ci.org/github/alanshaw/david"><img src="http://inch-ci.org/github/alanshaw/david.svg?branch=master" alt="Inline docs"></a>
<a href="https://travis-ci.org/alanshaw/david"><img src="https://travis-ci.org/alanshaw/david.svg" alt="Build Status"></a>
<a href="https://coveralls.io/r/alanshaw/david?branch=master"><img src="http://img.shields.io/coveralls/alanshaw/david.svg?style=flat" alt="Coverage Status"></a>
<a href="https://david-dm.org/alanshaw/david"><img src="https://david-dm.org/alanshaw/david.svg" alt="Dependency Status"></a>
<a href="https://david-dm.org/alanshaw/david/?type=dev"><img src="https://david-dm.org/alanshaw/david/dev-status.svg" alt="devDependency Status"></a>
</p>

Node.js module that tells you when your package npm dependencies are out of date.


## Getting Started

Install [Node.js](http://nodejs.org/).

Install david:

```sh
cd /your/project/directory
npm install david
```

Use:

```javascript
var david = require('david');

// Your package.json
var manifest = {
  name: 'xxx',
  dependencies: {
    'aaa': '~0.0.0',
    'bbb': '~0.0.0'
  },
  devDependencies: {
    'yyy': '~0.0.0',
    'zzz': '~0.0.0'
  }
};

david.getDependencies(manifest, function (er, deps) {
  console.log('latest dependencies information for', manifest.name);
  listDependencies(deps);
});

david.getDependencies(manifest, { dev: true }, function (er, deps) {
  console.log('latest devDependencies information for', manifest.name);
  listDependencies(deps);
});

david.getUpdatedDependencies(manifest, function (er, deps) {
  console.log('dependencies with newer versions for', manifest.name);
  listDependencies(deps);
});

david.getUpdatedDependencies(manifest, { dev: true }, function (er, deps) {
  console.log('devDependencies with newer versions for', manifest.name);
  listDependencies(deps);
});

david.getUpdatedDependencies(manifest, { stable: true }, function (er, deps) {
  console.log('dependencies with newer STABLE versions for', manifest.name);
  listDependencies(deps);
});

david.getUpdatedDependencies(manifest, { dev: true, stable: true }, function (er, deps) {
  console.log('devDependencies with newer STABLE versions for', manifest.name);
  listDependencies(deps);
});

function listDependencies(deps) {
  Object.keys(deps).forEach(function(depName) {
    var required = deps[depName].required || '*';
    var stable = deps[depName].stable || 'None';
    var latest = deps[depName].latest;
    console.log('%s Required: %s Stable: %s Latest: %s', depName, required, stable, latest);
  });
}
```

Both `getDependencies` and `getUpdatedDependencies` return an object result,
whose keys are package names. The values are objects which contain the following properties:

* `required` - The version required according to the manifest
* `stable` - The latest stable version available
* `latest` - The latest version available (including build and patch versions)


## CLI

If you install David globally with `npm install -g david`, you can run `david`
in your project directory to see which dependencies are out of date.

You can also run `david --global` to see your outdated global dependencies.

### Update to latest

To update all your project dependencies to the latest **stable** versions,
and save to your `package.json`, run:

```sh
david update
```

To update a particular project dependency to the latest **stable** version,
and save to your `package.json`, run:

```sh
david update package-name
```

You can also update global dependencies to latest versions:

```sh
david update --global
```

To update all your project dependencies to the latest versions
(including unstable versions), pass the `--unstable` flag:

```sh
david update --unstable
```

### Alternate registry

```sh
david update --registry http://registry.nodejitsu.com/
```

### Non-npm and SCM (Git) dependencies

If you have dependencies that are not published to npm, david will print a warning message by default. To throw an error and exit, pass the `error404` option:

```sh
david --error404
```

If using david programmatically, pass `error: {E404: true}` in the options object.

If you have dependencies whose versions are SCM URLs, david will print a warning message by default. To throw an error and exit, pass the `errorSCM` option:

```sh
david --errorSCM
```

If using david programmatically, pass `error: {ESCM: true}` in the options object.

### Specify package.json path

Use `-p, --package` to specify the path to your package.json.

### Ignore dependencies

To tell david to ignore dependencies, add a `david.ignore` property to your `package.json` which lists the dependencies david should ignore. If using david programmatically you can also pass this as an option. Globs are also supported. e.g.

**package.json**
```json
{
  "david": {
    "ignore": ["async", "underscore", "@types/*"]
  }
}
```

---

<p align="center">
<a href="https://github.com/feross/standard"><img src="https://cdn.rawgit.com/feross/standard/master/badge.svg" alt="js-standard-style"></a>
</p>
hello david what up I miss you
