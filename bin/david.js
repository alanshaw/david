#!/usr/bin/env node

var david = require('../');
var fs = require('fs');
var util = require('util');
var cwd = process.cwd();
var packageFile = cwd + '/package.json';

if (!fs.existsSync(packageFile)) {
  console.log('package.json does not exist');
  return;
}

var package = require(cwd + '/package.json');

var blue  = '\033[34m';
var reset = '\033[0m';
var green = '\033[32m';
var gray = '\033[90m';
var yellow = '\033[33m';

var printDeps = function(deps, type) {
  if (Object.keys(deps).length == 0) {
    return;
  }
  if (type) {
    type += ' ';
  } else {
    type = '';
  }
  var oneline = ['npm install'];
  if (type == 'Dev ') {
    oneline.push('--save-dev');
  } else {
    oneline.push('--save');
  }

  console.log('');
  console.log('%sOutdated %sDependencies%s', yellow, type, reset);
  console.log('');

  for (var name in deps) {
    var dep = deps[name];
    oneline.push(name+'@'+dep.stable);
    console.log('%s%s%s %s(package:%s %s, %slatest: %s%s%s)%s', 
                green,
                name,
                reset,

                gray,
                blue,
                dep.required,

                gray,
                blue,
                dep.stable,
                gray,
                reset
               );
  }
  console.log('');
  console.log('%s%s%s', gray, oneline.join(' '), reset);
  console.log('');
}

david.getUpdatedDependencies(package, { stable: true }, function(err, deps) {

  var primaryDeps = deps;

  david.getUpdatedDependencies(package, { dev: true, stable: true }, function(err, deps) {
    var devDeps = deps;


    printDeps(primaryDeps);
    printDeps(devDeps, 'Dev');


  });

});

