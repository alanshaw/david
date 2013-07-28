var fs = require('fs');
var rimraf = require('rimraf');
var childProcess = require('child_process');

function cp (src, dest, cb) {
  var rs = fs.createReadStream(src);
  
  rs.on('end', function() {
    return cb(null);
  });
  
  rs.pipe(fs.createWriteStream(dest));
}

module.exports = {
  setUp: function (cb) {
    rimraf('test/tmp', function (er) {
      if (er) throw er;
      fs.mkdir('test/tmp', cb);
    });
  },
  'Test install dependencies and devDependencies': function (test) {
    
    fs.mkdir('test/tmp/test-install', function (er) {
      test.ifError(er);
      
      cp('test/fixtures/test-install/package.json', 'test/tmp/test-install/package.json', function () {
        
        var proc = childProcess.exec('cd test/tmp/test-install && node ../../../bin/david install', function (er) {
          test.ifError(er);
          
          // Should have installed dependencies
          var pkg = require('./fixtures/test-install/package.json');
          var depNames = Object.keys(pkg.dependencies).concat(Object.keys(pkg.devDependencies));
          
          depNames.forEach(function (depName) {
            test.ok(fs.existsSync('test/tmp/test-install/node_modules/' + depName), depName + " expected to be installed");
          });
          
          test.done();
        });
        
        proc.stdout.on('data', function (data) {
          console.log(data.toString().trim());
        });
        
        proc.stderr.on('data', function (data) {
          console.error(data.toString().trim());
        });
      });
    });
  },
  'Test install and save dependencies and devDependencies': function (test) {
    
    fs.mkdir('test/tmp/test-install', function (er) {
      test.ifError(er);
      
      cp('test/fixtures/test-install/package.json', 'test/tmp/test-install/package.json', function () {
        
        var proc = childProcess.exec('cd test/tmp/test-install && node ../../../bin/david install --save', function (er) {
          test.ifError(er);
          
          // Should have installed dependencies
          var pkg = require('./fixtures/test-install/package.json');
          var depNames = Object.keys(pkg.dependencies);
          var devDepNames = Object.keys(pkg.devDependencies);
          
          depNames.forEach(function (depName) {
            test.ok(fs.existsSync('test/tmp/test-install/node_modules/' + depName), depName + " expected to be installed");
          });
          
          devDepNames.forEach(function (depName) {
            test.ok(fs.existsSync('test/tmp/test-install/node_modules/' + depName), depName + " expected to be installed");
          });
          
          // Version numbers should have changed
          var updatedPkg = require('./tmp/test-install/package.json');
          
          depNames.forEach(function (depName) {
            test.notEqual(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + ' version expected to have changed');
          });
          
          devDepNames.forEach(function (depName) {
            test.notEqual(pkg.devDependencies[depName], updatedPkg.devDependencies[depName], depName + ' version expected to have changed');
          });
          
          test.done();
        });
        
        proc.stdout.on('data', function (data) {
          console.log(data.toString().trim());
        });
        
        proc.stderr.on('data', function (data) {
          console.error(data.toString().trim());
        });
      });
    });
  }
};