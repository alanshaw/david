var fs = require("fs")
  , rimraf = require("rimraf")
  , childProcess = require("child_process")

function cp (src, dest, cb) {
  var rs = fs.createReadStream(src)
  rs.on("end", function() { cb(null) })
  rs.pipe(fs.createWriteStream(dest))
}

module.exports = {
  setUp: function (cb) {
    rimraf("test/tmp", function (er) {
      if (er) throw er
      fs.mkdir("test/tmp", cb)
    })
  },
  "Test update and save dependencies, devDependencies & optionalDependencies": function (test) {
    
    fs.mkdir("test/tmp/test-update", function (er) {
      test.ifError(er)
      
      cp("test/fixtures/test-update/package.json", "test/tmp/test-update/package.json", function () {
        
        var proc = childProcess.exec("node ../../../bin/david update", {cwd: "test/tmp/test-update"}, function (er) {
          test.ifError(er)
          
          // Should have installed dependencies
          var pkg = JSON.parse(fs.readFileSync("test/fixtures/test-update/package.json"))
            , depNames = Object.keys(pkg.dependencies)
            , devDepNames = Object.keys(pkg.devDependencies)
            , optionalDepNames = Object.keys(pkg.optionalDependencies)
          
          depNames.concat(devDepNames).concat(optionalDepNames).forEach(function (depName) {
            test.ok(fs.existsSync("test/tmp/test-update/node_modules/" + depName), depName + " expected to be installed")
          })
          
          // Version numbers should have changed
          var updatedPkg = JSON.parse(fs.readFileSync("test/tmp/test-update/package.json"))
          
          depNames.forEach(function (depName) {
            test.notEqual(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + " version expected to have changed")
          })
          
          devDepNames.forEach(function (depName) {
            test.notEqual(pkg.devDependencies[depName], updatedPkg.devDependencies[depName], depName + " version expected to have changed")
          })
          
          optionalDepNames.forEach(function (depName) {
            test.notEqual(pkg.optionalDependencies[depName], updatedPkg.optionalDependencies[depName], depName + " version expected to have changed")
          })
          
          test.done()
        })
        
        proc.stdout.on("data", function (data) {
          console.log(data.toString().trim())
        })
        
        proc.stderr.on("data", function (data) {
          console.error(data.toString().trim())
        })
      })
    })
  },
  "Test update & save only async and grunt dependencies": function (test) {
    
    fs.mkdir("test/tmp/test-filtered-update", function (er) {
      test.ifError(er)
      
      cp("test/fixtures/test-update/package.json", "test/tmp/test-filtered-update/package.json", function () {
        
        var proc = childProcess.exec("node ../../../bin/david update async grunt", {cwd: "test/tmp/test-filtered-update"}, function (er) {
          test.ifError(er)
          
          // Should have installed dependencies
          var pkg = JSON.parse(fs.readFileSync("test/fixtures/test-update/package.json"))
            , depNames = Object.keys(pkg.dependencies)
            , devDepNames = Object.keys(pkg.devDependencies)
            , optionalDepNames = Object.keys(pkg.optionalDependencies)
          
          depNames.concat(devDepNames).concat(optionalDepNames).forEach(function (depName) {
            if (depName == "async" || depName == "grunt") {
              test.ok(fs.existsSync("test/tmp/test-filtered-update/node_modules/" + depName), depName + " expected to be installed")
            } else {
              test.ok(!fs.existsSync("test/tmp/test-filtered-update/node_modules/" + depName), depName + " not expected to be installed")
            }
          })
          
          // Version numbers should have changed
          var updatedPkg = JSON.parse(fs.readFileSync("test/tmp/test-filtered-update/package.json"))
          
          depNames.forEach(function (depName) {
            if (depName == "async") {
              test.notEqual(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + " version expected to have changed")
            } else {
              test.equal(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + " version not expected to have changed")
            }
          })
          
          devDepNames.forEach(function (depName) {
            if (depName == "grunt") {
              test.notEqual(pkg.devDependencies[depName], updatedPkg.devDependencies[depName], depName + " version expected to have changed")
            } else {
              test.equal(pkg.devDependencies[depName], updatedPkg.devDependencies[depName], depName + " version not expected to have changed")
            }
          })
          
          optionalDepNames.forEach(function (depName) {
            test.equal(pkg.optionalDependencies[depName], updatedPkg.optionalDependencies[depName], depName + " version not expected to have changed")
          })
          
          test.done()
        })
        
        proc.stdout.on("data", function (data) {
          console.log(data.toString().trim())
        })
        
        proc.stderr.on("data", function (data) {
          console.error(data.toString().trim())
        })
      })
    })
  }
}