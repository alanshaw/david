var test = require("tape")
  , fs = require("fs")
  , path = require("path")
  , rimraf = require("rimraf")
  , childProcess = require("child_process")
  , depTypes = ["dependencies", "devDependencies", "optionalDependencies"]

function cp (src, dest, cb) {
  fs.createReadStream(src)
    .pipe(fs.createWriteStream(dest))
    .on("finish", cb)
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

var davidPath = path.join(__dirname, "..", "bin", "david")
var tmpPath = path.join(__dirname, "tmp")
var fixturesPath = path.join(__dirname, "fixtures")

function runDavid (args, fixture, cb) {
  rimraf(tmpPath, function (er) {
    if (er) return cb(er)

    fs.mkdir(tmpPath, function (er) {
      if (er) return cb(er)

      fs.mkdir(path.join(tmpPath, fixture), function (er) {
        if (er) return cb(er)

        var fixturePkgPath = path.join(fixturesPath, fixture, "package.json")
        var tmpPkgPath = path.join(tmpPath, fixture, "package.json")

        cp(fixturePkgPath, tmpPkgPath, function () {
          args = [davidPath].concat(args)
          var opts = {cwd: path.join(tmpPath, fixture)}
          var proc = childProcess.execFile("node", args, opts, cb)

          proc.stdout.pipe(process.stdout)
          proc.stderr.pipe(process.stderr)
        })
      })
    })
  })
}

test("Test update and save dependencies, devDependencies & optionalDependencies", function (t) {
  t.plan(11)

  runDavid(["update"], "test-update", function (er) {
    t.ifError(er)

    // Should have installed dependencies
    var pkg = JSON.parse(fs.readFileSync("test/fixtures/test-update/package.json"))
      , depNames = Object.keys(pkg.dependencies)
      , devDepNames = Object.keys(pkg.devDependencies)
      , optionalDepNames = Object.keys(pkg.optionalDependencies)

    depNames.concat(devDepNames).concat(optionalDepNames).forEach(function (depName) {
      t.ok(fs.existsSync("test/tmp/test-update/node_modules/" + depName), depName + " expected to be installed")
    })
    // Version numbers should have changed
    var updatedPkg = JSON.parse(fs.readFileSync("test/tmp/test-update/package.json"))

    depNames.forEach(function (depName) {
      t.notEqual(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + " version expected to have changed")
    })

    devDepNames.forEach(function (depName) {
      t.notEqual(pkg.devDependencies[depName], updatedPkg.devDependencies[depName], depName + " version expected to have changed")
    })

    optionalDepNames.forEach(function (depName) {
      t.notEqual(pkg.optionalDependencies[depName], updatedPkg.optionalDependencies[depName], depName + " version expected to have changed")
    })

    t.end()
  })
})

test("Test update & save only async and request dependencies", function (t) {
  t.plan(13)

  runDavid(["update", "async", "request"], "test-update", function (er) {
    t.ifError(er)

    // Should have installed dependencies
    var pkg = JSON.parse(fs.readFileSync("test/fixtures/test-update/package.json"))
      , depNames = Object.keys(pkg.dependencies)
      , devDepNames = Object.keys(pkg.devDependencies)
      , optionalDepNames = Object.keys(pkg.optionalDependencies)

    depNames.concat(devDepNames).concat(optionalDepNames).forEach(function (depName) {
      if (depName === "async" || depName === "request") {
        t.ok(fs.existsSync("test/tmp/test-update/node_modules/" + depName), depName + " expected to be installed")
      } else {
        t.ok(!fs.existsSync("test/tmp/test-update/node_modules/" + depName), depName + " not expected to be installed")
      }
    })

    // Version numbers should have changed
    var updatedPkg = JSON.parse(fs.readFileSync("test/tmp/test-update/package.json"))

    // Ensure the dependencies still exist
    t.ok(updatedPkg.dependencies.async)
    t.ok(updatedPkg.devDependencies.request)

    depNames.forEach(function (depName) {
      if (depName === "async") {
        t.notEqual(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + " version expected to have changed")
      } else {
        t.equal(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + " version not expected to have changed")
      }
    })

    devDepNames.forEach(function (depName) {
      if (depName === "request") {
        t.notEqual(pkg.devDependencies[depName], updatedPkg.devDependencies[depName], depName + " version expected to have changed")
      } else {
        t.equal(pkg.devDependencies[depName], updatedPkg.devDependencies[depName], depName + " version not expected to have changed")
      }
    })

    optionalDepNames.forEach(function (depName) {
      t.equal(pkg.optionalDependencies[depName], updatedPkg.optionalDependencies[depName], depName + " version not expected to have changed")
    })

    t.end()
  })
})

test("Test print-only output with unregistered dependency in each type", function (t) {
  t.plan(10)

  runDavid([], "test-unregistered", function (er, stdout) {
    // There are dependencies to be updated, so we expect non zero exit code
    t.ok(er.code, "Exited with non zero exit code")

    // Should have installed+registered dependencies
    var pkg = JSON.parse(fs.readFileSync("test/fixtures/test-unregistered/package.json"))
    filterUnregistered(pkg)

    var depNames = Object.keys(pkg.dependencies)
      , devDepNames = Object.keys(pkg.devDependencies)
      , optionalDepNames = Object.keys(pkg.optionalDependencies)

    t.ok(depNames.length > 0);
    depNames.forEach(function (depName) {
      t.ok(new RegExp(depName, "m").test(stdout.toString()), depName + " expected to be outdated")
    })

    t.ok(devDepNames.length > 0);
    devDepNames.forEach(function (depName) {
      t.ok(new RegExp(depName, "m").test(stdout.toString()), depName + " expected to be outdated")
    })

    t.ok(optionalDepNames.length > 0);
    optionalDepNames.forEach(function (depName) {
      t.ok(new RegExp(depName, "m").test(stdout.toString()), depName + " expected to be outdated")
    })

    t.ok(/Error: 404 Not Found: unregistered--/m.test(stdout.toString()))
    t.ok(/Error: 404 Not Found: unregistereddev--/m.test(stdout.toString()))
    t.ok(/Error: 404 Not Found: unregisteredopt--/m.test(stdout.toString()))

    t.end()
  })
})

test("Test default exit response to unregistered dependency", function (t) {
  t.plan(4)

  runDavid([], "test-unregistered", function (er, stdout) {
    // There are dependencies to be updated, so we expect non zero exit code
    t.ok(er.code, "Exited with non zero exit code")
    t.ok(/Error: 404 Not Found: unregistered--/m.test(stdout.toString()))
    t.ok(/Error: 404 Not Found: unregistereddev--/m.test(stdout.toString()))
    t.ok(/Error: 404 Not Found: unregisteredopt--/m.test(stdout.toString()))
    t.end()
  })
})

test("Test update with unregistered dependency in each type", function (t) {
  t.plan(12)

  runDavid(["update"], "test-unregistered", function (er, stdout) {
    // Should have installed+registered dependencies
    var pkg = JSON.parse(fs.readFileSync("test/fixtures/test-unregistered/package.json"))
    filterUnregistered(pkg)

    var depNames = Object.keys(pkg.dependencies)
      , devDepNames = Object.keys(pkg.devDependencies)
      , optionalDepNames = Object.keys(pkg.optionalDependencies)

    depNames.concat(devDepNames).concat(optionalDepNames).forEach(function (depName) {
      t.ok(fs.existsSync("test/tmp/test-unregistered/node_modules/" + depName), depName + " expected to be installed")
    })

    // Version numbers should have changed
    var updatedPkg = JSON.parse(fs.readFileSync("test/tmp/test-unregistered/package.json"))

    t.ok(depNames.length > 0);
    depNames.forEach(function (depName) {
      t.notEqual(pkg.dependencies[depName], updatedPkg.dependencies[depName], depName + " version expected to have changed")
    })

    t.ok(devDepNames.length > 0);
    devDepNames.forEach(function (depName) {
      t.notEqual(pkg.devDependencies[depName], updatedPkg.devDependencies[depName], depName + " version expected to have changed")
    })

    t.ok(optionalDepNames.length > 0);
    optionalDepNames.forEach(function (depName) {
      t.notEqual(pkg.optionalDependencies[depName], updatedPkg.optionalDependencies[depName], depName + " version expected to have changed")
    })

    t.ok(/Error: 404 Not Found: unregistered--/m.test(stdout.toString()))
    t.ok(/Error: 404 Not Found: unregistereddev--/m.test(stdout.toString()))
    t.ok(/Error: 404 Not Found: unregisteredopt--/m.test(stdout.toString()))

    t.end()
  })
})

test("Test SCM dependency output", function (t) {
  t.plan(1)

  runDavid([], "test-scm", function (er, stdout) {
    t.ok(/Error: SCM dependency: git\+https:\/\/github.com\/foo\/bar\.git/m.test(stdout.toString()))
    t.end()
  })
})

test("Test exit code for SCM dependency", function (t) {
  t.plan(1)

  runDavid([], "test-exit-code", function (er) {
    t.notOk(er, "Expected no error")
    t.end()
  })
})