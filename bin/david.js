#!/usr/bin/env node

var david = require('../');
var argv = require('optimist').argv;
var fs = require('fs');
var util = require('util');
var npm = require('npm');
var cwd = process.cwd();
var packageFile = cwd + '/package.json';

var blue  = '\033[34m';
var reset = '\033[0m';
var green = '\033[32m';
var gray = '\033[90m';
var yellow = '\033[33m';

function printDeps (deps, type) {
  if (!Object.keys(deps).length) {
    return;
  }
  
  type = type ? type + ' ' : '';

  var oneline = ['npm install'];
  
  if (type == 'Dev ') {
    oneline.push('--save-dev');
  } else if (type == 'Global ') {
    oneline.push('--global');
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

// Get updated deps and devDeps
function getDeps (pkg, cb) {
  
  david.getUpdatedDependencies(pkg, { stable: true }, function (er, deps) {
    if (er) return cb(er);
    
    david.getUpdatedDependencies(pkg, { dev: true, stable: true }, function (er, devDeps) {
      cb(er, deps, devDeps);
    });
  });
}

function installDeps (deps, opts, cb) {
  
  var installArgs = [];
  
  for (var name in deps) {
    var dep = deps[name];
    installArgs.push(name + '@' + dep.stable);
  }
  
  npm.load({global: opts.global}, function (er) {
    if (er) return cb(er);
    
    if (opts.save) {
      npm.config.set('save' + (opts.dev ? '-dev' : ''), true);
    }
    
    npm.commands.install(installArgs, cb);
  });
}

if (argv.g || argv.global) {

  npm.load({ global: true }, function(err) {
    if (err) {
      throw err;
    }
    npm.commands.ls([], true, function(err, data) {
      if (err) {
        throw err;
      }
      var pkg = {
        name: 'Global Dependencies',
        dependencies: {}
      };
      
      for (var key in data.dependencies) {
        pkg.dependencies[key] = data.dependencies[key].version;
      }
      
      getDeps(pkg, function (er, deps, devDeps) {
        if (er) return console.error('Failed to get updated dependencies/devDependencies', er);
        
        if (argv._.indexOf('install') == -1) {
          
          printDeps(deps, 'Global');
          
        } else {
          
          installDeps(deps, {global: true}, function (er) {
            if (er) return console.error('Failed to install global dependencies', er);
          });
        }
      });
    });
  });

} else {

  if (!fs.existsSync(packageFile)) {
    return console.error('package.json does not exist');
  }

  var pkg = require(cwd + '/package.json');
  
  getDeps(pkg, function (er, deps, devDeps) {
    if (er) return console.error('Failed to get updated dependencies/devDependencies', er);
    
    if (argv._.indexOf('install') == -1) {
      
      printDeps(deps);
      printDeps(devDeps, 'Dev');
      
    } else {
      
      installDeps(deps, {save: argv.save}, function (er) {
        if (er) return console.error('Failed to install/save dependencies', er);
        
        installDeps(devDeps, {save: argv.save, dev: true}, function (er) {
          if (er) return console.error('Failed to install/save devDependencies', er);
        });
      });
    }
  });
}


