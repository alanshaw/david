var fs = require("fs")
  , rimraf = require("rimraf")
  , childProcess = require("child_process")
  , depTypes = ["dependencies", "devDependencies", "optionalDependencies"]

function cp (src, dest, cb) {
  var rs = fs.createReadStream(src)
  rs.on("end", function() { cb(null) })
  rs.pipe(fs.createWriteStream(dest))
}

function filterUnregistered (pkg) {
  depTypes.forEach(function (depType) {
    Object.keys(pkg[depType]).forEach(function (depName) {
      if (/^unregistered/.test(depName)) {
        delete pkg[depType][depName]
      }
    })
  })
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

        var proc = childProcess.exec("node ../../../bin/david update --registry http://registry.nodejitsu.com/", { cwd: "test/tmp/test-update" }, function (er) {
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
  "Test update & save only async and request dependencies": function (test) {

    fs.mkdir("test/tmp/test-filtered-update", function (er) {
      test.ifError(er)

      cp("test/fixtures/test-update/package.json", "test/tmp/test-filtered-update/package.json", function () {

        var proc = childProcess.exec("node ../../../bin/david update async request", {cwd: "test/tmp/test-filtered-update"}, function (er) {
          test.ifError(er)

          // Should have installed dependencies
          var pkg = JSON.parse(fs.readFileSync("test/fixtures/test-update/package.json"))
            , depNames = Object.keys(pkg.dependencies)
            , devDepNames = Object.keys(pkg.devDependencies)
            , optionalDepNames = Object.keys(pkg.optionalDependencies)

          depNames.concat(devDepNames).concat(optionalDepNames).forEach(function (depName) {
            if (depName === "async" || depName === "request") {
              test.ok(fs.existsSync("test/tmp/test-filtered-update/node_modules/" + depName), depName + " expected to be installed")
            } else {
              test.ok(!fs.existsSync("test/tmp/test-filtered-update/node_modules/" + depName), depName + " not expected to be installed")
            }
          })

          // Version numbers should have changed
          var updatedPkg = JSON.parse(fs.readFileSync("test/tmp/test-filtered-update/package.json"))

          // Ensure the dependencies still exist
          test.ok(updatedPkg.dependencies.async)
          test.ok(updatedPkg.devDependencies.request)

          depNames.forEach(function (depName) {
            if (depName === "async") {
              test.notEqual(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + " version expected to have changed")
            } else {
              test.equal(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + " version not expected to have changed")
            }
          })

          devDepNames.forEach(function (depName) {
            if (depName === "request") {
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
  },
  "Test print-only output with unregistered dependency in each type": function (test) {

    fs.mkdir("test/tmp/test-unregistered", function (er) {
      test.ifError(er)

      cp("test/fixtures/test-unregistered/package.json", "test/tmp/test-unregistered/package.json", function () {

        var stdout = ""

        var proc = childProcess.exec("node ../../../bin/david --warn404 --registry http://registry.nodejitsu.com/", { cwd: "test/tmp/test-unregistered" }, function (er) {
          test.ifError(er)

          // Should have installed+registered dependencies
          var pkg = JSON.parse(fs.readFileSync("test/fixtures/test-unregistered/package.json"))
          filterUnregistered(pkg)

          var depNames = Object.keys(pkg.dependencies)
            , devDepNames = Object.keys(pkg.devDependencies)
            , optionalDepNames = Object.keys(pkg.optionalDependencies)

          test.ok(depNames.length > 0);
          depNames.forEach(function (depName) {
            test.ok(new RegExp("Outdated Dependencies[\\s\\S]*" + depName + "[\\s\\S]*Outdated Dev", "m").test(stdout), depName + " expected to be outdated")
          })

          test.ok(devDepNames.length > 0);
          devDepNames.forEach(function (depName) {
            test.ok(new RegExp("Outdated Dev Dependencies[\\s\\S]*" + depName + "[\\s\\S]*Outdated Opt", "m").test(stdout), depName + " expected to be outdated")
          })

          test.ok(optionalDepNames.length > 0);
          optionalDepNames.forEach(function (depName) {
            test.ok(new RegExp("Outdated Optional Dependencies[\\s\\S]*" + depName, "m").test(stdout), depName + " expected to be outdated")
          })

          test.ok(/Unregistered Dep[\s\S]*unregistered--/m.test(stdout))
          test.ok(/Unregistered Dev[\s\S]*unregistereddev--/m.test(stdout))
          test.ok(/Unregistered Opt[\s\S]*unregisteredopt--/m.test(stdout))

          test.done()
        })

        proc.stdout.on("data", function (data) {
          data = data.toString();
          stdout += data;
          console.log(data.trim())
        })

        proc.stderr.on("data", function (data) {
          console.error(data.toString().trim())
        })
      })
    })
  },
  "Test default exit response to unregistered dependency": function (test) {

    var stderr = ""

    var proc = childProcess.exec("node ../../../bin/david --registry http://registry.nodejitsu.com/", { cwd: "test/fixtures/test-unregistered" }, function (er) {
      test.ifError(er)
      test.ok(/Failed to get updated dependencies\/devDependencies.*unregistered--.*E404/.test(stderr))
      test.done()
    })

    proc.stdout.on("data", function (data) {
      console.log(data.toString().trim())
    })

    proc.stderr.on("data", function (data) {
      data = data.toString()
      stderr += data
      console.error(data.toString().trim())
    })
  },
  "Test update with unregistered dependency in each type": function (test) {

    fs.mkdir("test/tmp/test-unregistered", function (er) {
      test.ifError(er)

      cp("test/fixtures/test-unregistered/package.json", "test/tmp/test-unregistered/package.json", function () {

        var stdout = ""

        var proc = childProcess.exec("node ../../../bin/david update --warn404 --registry http://registry.nodejitsu.com/", { cwd: "test/tmp/test-unregistered" }, function (er) {
          test.ifError(er)

          // Should have installed+registered dependencies
          var pkg = JSON.parse(fs.readFileSync("test/fixtures/test-unregistered/package.json"))
          filterUnregistered(pkg)

          var depNames = Object.keys(pkg.dependencies)
            , devDepNames = Object.keys(pkg.devDependencies)
            , optionalDepNames = Object.keys(pkg.optionalDependencies)

          depNames.concat(devDepNames).concat(optionalDepNames).forEach(function (depName) {
            test.ok(fs.existsSync("test/tmp/test-unregistered/node_modules/" + depName), depName + " expected to be installed")
          })

          // Version numbers should have changed
          var updatedPkg = JSON.parse(fs.readFileSync("test/tmp/test-unregistered/package.json"))

          test.ok(depNames.length > 0);
          depNames.forEach(function (depName) {
            test.notEqual(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + " version expected to have changed")
          })

          test.ok(devDepNames.length > 0);
          devDepNames.forEach(function (depName) {
            test.notEqual(pkg.devDependencies[depName], updatedPkg.devDependencies[depName], depName + " version expected to have changed")
          })

          test.ok(optionalDepNames.length > 0);
          optionalDepNames.forEach(function (depName) {
            test.notEqual(pkg.optionalDependencies[depName], updatedPkg.optionalDependencies[depName], depName + " version expected to have changed")
          })

          test.ok(/Unregistered Dep[\s\S]*unregistered--/m.test(stdout))
          test.ok(/Unregistered Dev[\s\S]*unregistereddev--/m.test(stdout))
          test.ok(/Unregistered Opt[\s\S]*unregisteredopt--/m.test(stdout))

          test.done()
        })

        proc.stdout.on("data", function (data) {
          data = data.toString();
          stdout += data;
          console.log(data.trim())
        })

        proc.stderr.on("data", function (data) {
          console.error(data.toString().trim())
        })
      })
    })
  }
}
