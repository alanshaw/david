var fs = require('fs');
var rimraf = require('rimraf');
var childProcess = require('child_process');

function cp (src, dest, cb) {
  var rs = fs.createReadStream(src);
  
  rs.on('end', function() {
    return cb(null);
  });
  
  rs.pipe(fs.createWriteStream(dest, {mode: 0666}));
}

module.exports = {
  setUp: function (cb) {
    rimraf('test/tmp', function (er) {
      if (er) throw er;
      fs.mkdir('test/tmp', cb);
    });
  },
  'Test install and save dependencies and devDependencies': function (test) {
    
    fs.mkdir('test/tmp/test-install', function (er) {
      test.ifError(er);
      
      cp('test/fixtures/test-install/package.json', 'test/tmp/test-install/package.json', function () {
        
        var proc = childProcess.exec('cd test/tmp/test-install && node ../../../bin/david update', function (er) {
          test.ifError(er);
          
          // Should have installed dependencies
          var pkg = JSON.parse(fs.readFileSync('test/fixtures/test-install/package.json'));
          var depNames = Object.keys(pkg.dependencies);
          var devDepNames = Object.keys(pkg.devDependencies);
          
          depNames.forEach(function (depName) {
            test.ok(fs.existsSync('test/tmp/test-install/node_modules/' + depName), depName + " expected to be installed");
          });
          
          devDepNames.forEach(function (depName) {
            test.ok(fs.existsSync('test/tmp/test-install/node_modules/' + depName), depName + " expected to be installed");
          });
          
          // Version numbers should have changed
          var updatedPkg = JSON.parse(fs.readFileSync('test/tmp/test-install/package.json'));
          
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