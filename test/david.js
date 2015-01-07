/* jshint camelcase: false */

var test = require("tape")
  , rewire = require("rewire")
  , semver = require("semver")
  , david = rewire("../lib/david")

function mockNpm (versions, depName, latestTag) {
  depName = depName || "testDepName"

  var npmData = {}
  var time = {}

  versions.forEach(function (value, index) { time[value] = new Date(index).toISOString() })
  latestTag = latestTag || versions[versions.length - 1]
  versions.sort(function (a, b) { return semver.compare(a, b) })
  npmData[latestTag] = { versions: versions, time: time }

  // Mock out NPM
  return {
    load: function (config, cb) {
      cb()
    },
    commands: {
      view: function (args, silent, cb) {
        process.nextTick(function () {
          if (args[0] === depName) {
            cb(null, npmData)
          } else {
            cb(new Error(), null)
          }
        })
      }
    }
  }
}

test("Test getDependencies returns an empty object when passed a manifest with no dependencies", function (t) {
  t.plan(3)

  david.getDependencies({}, function (er, deps) {
    t.equal(er, null)
    t.ok(deps)
    t.strictEqual(Object.keys(deps).length, 0)
    t.end()
  })
})

test("Test getUpdatedDependencies returns an empty object when passed a manifest with no dependencies", function (t) {
  t.plan(3)

  david.getUpdatedDependencies({}, function (er, deps) {
    t.equal(er, null)
    t.ok(deps)
    t.strictEqual(Object.keys(deps).length, 0)
    t.end()
  })
})

test("Test getDependencies returns desired result when only stable versions are available", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "~0.0.2"
    }
  }

  david.getDependencies(manifest, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "~0.0.2")
    t.strictEqual(deps.testDepName.stable, "0.0.3")
    t.strictEqual(deps.testDepName.latest, "0.0.3")
    t.end()
  })
})

test("Test getDependencies returns correct result when both stable and unstable versions are available", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3", "0.0.4-beta"])

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "~0.0.3"
    }
  }

  david.getDependencies(manifest, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "~0.0.3")
    t.strictEqual(deps.testDepName.stable, "0.0.3")
    t.strictEqual(deps.testDepName.latest, "0.0.4-beta")
    t.end()
  })
})

test("Test getUpdatedDependencies returns an empty object when there are no updated stable or unstable dependencies available", function (t) {
  t.plan(2)

  var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "~0.0.3"
    }
  }

  david.getUpdatedDependencies(manifest, function (er, deps) {
    t.ok(deps)
    t.strictEqual(Object.keys(deps).length, 0)
    t.end()
  })
})

test("Test getUpdatedDependencies returns correct dependency updates when only stable updates are available", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "0.0.1"
    }
  }

  david.getUpdatedDependencies(manifest, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "0.0.1")
    t.strictEqual(deps.testDepName.stable, "0.0.3")
    t.strictEqual(deps.testDepName.latest, "0.0.3")
    t.end()
  })
})

test("Test getUpdatedDependencies returns correct dependency updates when both unstable and stable updates are available", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.1.2", "0.1.3", "0.1.4+build.11.e0f985a"])

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "~0.0.1"
    }
  }

  david.getUpdatedDependencies(manifest, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "~0.0.1")
    t.strictEqual(deps.testDepName.stable, "0.1.3")
    t.strictEqual(deps.testDepName.latest, "0.1.4+build.11.e0f985a")
    t.end()
  })
})

test("Test getUpdatedDependencies returns correct dependency updates when latest tag point to the stable version", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.1.2", "0.1.3", "0.1.4"], "testDepName", "0.1.3")

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "~0.0.1"
    }
  }

  david.getUpdatedDependencies(manifest, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "~0.0.1")
    t.strictEqual(deps.testDepName.stable, "0.1.3")
    t.strictEqual(deps.testDepName.latest, "0.1.4")
    t.end()
  })
})

test("Test getUpdatedDependencies returns correct dependency updates when unstable version is not the most recent version", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.1.2", "0.2.0", "0.1.4"], "testDepName", "0.1.4")

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "~0.0.1"
    }
  }

  david.getUpdatedDependencies(manifest, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "~0.0.1")
    t.strictEqual(deps.testDepName.stable, "0.1.4")
    t.strictEqual(deps.testDepName.latest, "0.2.0")
    t.end()
  })
})

test("Test getUpdatedDependencies returns correct dependency updates when versions is not sorted by time", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.1.2", "0.1.3", "0.1.4-alpha9", "0.1.4-alpha10"])

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "~0.0.1"
    }
  }

  david.getUpdatedDependencies(manifest, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "~0.0.1")
    t.strictEqual(deps.testDepName.stable, "0.1.3")
    t.strictEqual(deps.testDepName.latest, "0.1.4-alpha10")
    t.end()
  })
})

test("Test getDependencies returns correct dependencies when there is no stable version", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.0-alpha1", "0.0.0-alpha2", "0.0.0-alpha3"], "testDepName", "0.0.0-alpha3")

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "~0.0.0"
    }
  }

  david.getDependencies(manifest, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "~0.0.0")
    t.strictEqual(deps.testDepName.stable, null)
    t.strictEqual(deps.testDepName.latest, "0.0.0-alpha3")
    t.end()
  })
})

test("Positive getUpdatedDependencies onlyStable=true tests", function (t) {

  var dataSets = [
    // [array of versions, required range, expected stable version]
    [["0.6.0", "0.6.1-1", "0.7.0"], "~0.6.1-1", "0.7.0"],
    [["0.0.1", "0.1.0", "0.1.3-beta", "0.1.3", "0.2.0"], "~0.1.3", "0.2.0"],
    [["0.0.1", "0.1.0", "0.1.3-beta", "0.1.3", "0.2.0"], "~0.0.1", "0.2.0"],
    [["0.0.1", "0.1.0", "0.1.3-beta", "0.1.3", "0.2.0"], "0.0.x", "0.2.0"],
    [["0.0.1", "0.1.0", "0.1.3-beta", "0.1.3", "0.2.0"], "0.0.1 || 0.1.3", "0.2.0"],
    [["0.0.1", "0.1.0", "0.1.3-beta", "0.1.3", "0.2.0"], "<0.1.0 || 0.1.3", "0.2.0"],
    [["0.1.3", "0.2.0-pre"], "0.1.2", "0.1.3"]
  ]

  t.plan(5 * dataSets.length)

  var done = 0
  var tests = []

  dataSets.forEach(function (data, i) {

    tests.push(function () {

      var testDepName = "testDepName" + i
      var npmMock = mockNpm(data[0], testDepName)

      david.__set__("npm", npmMock)

      var manifest = { dependencies: {} }

      manifest.dependencies[testDepName] = data[1]

      david.getUpdatedDependencies(manifest, { stable: true }, function (er, deps) {

        t.ok(deps)
        t.ok(deps[testDepName])
        t.strictEqual(deps[testDepName].required, data[1])
        t.strictEqual(deps[testDepName].stable, data[2])
        t.strictEqual(deps[testDepName].latest, data[0][data[0].length - 1])

        done++

        if (done === dataSets.length) {
          t.end()
        } else {
          tests[done]()
        }
      })
    })
  })

  tests[0]()
})

test("Negative getUpdatedDependencies onlyStable=true tests", function (t) {

  var dataSets = [
    [["0.6.0", "0.6.1-1"], "~0.6.1-1"],
    [["0.6.0"], "~0.6.0"],
    [["0.5.0"], "~0.6.0"],
    [[], "~0.6.0"],
    [["0.0.1-beta", "0.0.1", "0.0.2", "0.3.0-pre"], "~0.3.0"],
    [["0.0.1-beta", "0.0.1", "0.0.2", "0.3.0-pre"], "latest"],
    [["0.0.1-beta", "0.0.1", "0.0.2", "0.3.0-pre"], "*"],
    [["0.0.1", "0.1.4+build.11.e0f985a"], ""],
    [["0.0.1"], ">=0.0.1"],
    [["0.0.1", "0.0.2", "0.0.3", "0.0.4"], "<=0.0.2 || >0.0.4"],
    [["0.0.1", "0.0.2", "0.0.3", "0.0.4"], "<=0.0.2 || ~0.0.4"],
    [["0.0.1", "0.0.2", "0.0.3", "0.0.4", "0.1.0-beta"], "<=0.0.2 || ~0.0.4"]

  ]

  t.plan(3 * dataSets.length)

  var done = 0
  var tests = []

  dataSets.forEach(function (data, i) {

    tests.push(function () {

      var npmMock = mockNpm(data[0], "testDepName" + i)

      david.__set__("npm", npmMock)

      var manifest = { dependencies: {} }

      manifest.dependencies["testDepName" + i] = data[1]

      david.getUpdatedDependencies(manifest, { stable: true }, function (er, deps) {

        t.ok(deps)
        t.equal(deps["testDepName" + i], undefined)
        t.strictEqual(Object.keys(deps).length, 0)

        done++

        if (done === dataSets.length) {
          t.end()
        } else {
          tests[done]()
        }
      })
    })
  })

  tests[0]()
})

test("Test getDependencies will consider devDependencies", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

  david.__set__("npm", npmMock)

  var manifest = {
    devDependencies: {
      testDepName: "~0.0.2"
    }
  }

  david.getDependencies(manifest, { dev: true }, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "~0.0.2")
    t.strictEqual(deps.testDepName.stable, "0.0.3")
    t.strictEqual(deps.testDepName.latest, "0.0.3")
    t.end()
  })
})

test("Test getUpdatedDependencies will consider devDependencies", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

  david.__set__("npm", npmMock)

  var manifest = {
    devDependencies: {
      testDepName: "0.0.1"
    }
  }

  david.getUpdatedDependencies(manifest, { dev: true }, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "0.0.1")
    t.strictEqual(deps.testDepName.stable, "0.0.3")
    t.strictEqual(deps.testDepName.latest, "0.0.3")
    t.end()
  })
})

test("Test getDependencies will consider optionalDependencies", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

  david.__set__("npm", npmMock)

  var manifest = {
    optionalDependencies: {
      testDepName: "~0.0.2"
    }
  }

  david.getDependencies(manifest, { optional: true }, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "~0.0.2")
    t.strictEqual(deps.testDepName.stable, "0.0.3")
    t.strictEqual(deps.testDepName.latest, "0.0.3")
    t.end()
  })
})

test("Test getUpdatedDependencies will consider optionalDependencies", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

  david.__set__("npm", npmMock)

  var manifest = {
    optionalDependencies: {
      testDepName: "0.0.1"
    }
  }

  david.getUpdatedDependencies(manifest, { optional: true }, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "0.0.1")
    t.strictEqual(deps.testDepName.stable, "0.0.3")
    t.strictEqual(deps.testDepName.latest, "0.0.3")
    t.end()
  })
})

test("Test getDependencies will consider peerDependencies", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

  david.__set__("npm", npmMock)

  var manifest = {
    peerDependencies: {
      testDepName: "~0.0.2"
    }
  }

  david.getDependencies(manifest, { peer: true }, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "~0.0.2")
    t.strictEqual(deps.testDepName.stable, "0.0.3")
    t.strictEqual(deps.testDepName.latest, "0.0.3")
    t.end()
  })
})

test("Test getUpdatedDependencies will consider peerDependencies", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

  david.__set__("npm", npmMock)

  var manifest = {
    peerDependencies: {
      testDepName: "0.0.1"
    }
  }

  david.getUpdatedDependencies(manifest, { peer: true }, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "0.0.1")
    t.strictEqual(deps.testDepName.stable, "0.0.3")
    t.strictEqual(deps.testDepName.latest, "0.0.3")
    t.end()
  })
})

test("Test support dependencies specified as an array", function (t) {
  t.plan(5)

  var npmMock = mockNpm(["0.0.0"])

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: ["testDepName"]
  }

  david.getDependencies(manifest, function (er, deps) {
    t.ok(deps)
    t.ok(deps.testDepName)
    t.strictEqual(deps.testDepName.required, "*")
    t.strictEqual(deps.testDepName.stable, "0.0.0")
    t.strictEqual(deps.testDepName.latest, "0.0.0")
    t.end()
  })
})

test("Test `npm view 0 versions` does not throw!", function (t) {
  t.plan(1)

  var npmMock = {
    load: function (config, cb) {
      cb()
    },
    commands: {
      view: function (args, silent, cb) {
        process.nextTick(function () {
          cb(null, {}) // return {} as per NPM
        })
      }
    }
  }

  david.__set__("npm", npmMock)

  var manifest = {dependencies: ["0"]}

  t.doesNotThrow(function () {
    david.getDependencies(manifest, function () {})
  })

  t.end()
})

test("Test error whilst getting dependency status doesn't cause remaining processing to stop", function (t) {
  t.plan(7)

  var npmMock = {
    load: function (config, cb) {
      cb()
    },
    commands: {
      view: function (args, silent, cb) {
        process.nextTick(function () {
          if (args[0] === "testDepName") {
            cb(null, {"0.0.1rc1": {versions: ["0.0.1rc1", "1.0.0"], time: [new Date().toISOString()]}})
          } else {
            cb(null, {"1.2.3": {versions: ["1.2.3"], time: [new Date().toISOString()]}})
          }
        })
      }
    }
  }

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "0.0.1rc1",
      testDepName2: "1.2.3"
    }
  }

  // Force and error to be returned by david, by specifying dependecy as invalid semver (but valid loose semver)
  david.getDependencies(manifest, {loose: false}, function (er, deps) {
    t.ok(er) // An error object should have been passed back
    t.ok(deps) // A deps object containing only testDepName2 should have been passed back
    t.ok(!deps.testDepName)
    t.ok(deps.testDepName2)
    t.strictEqual(deps.testDepName2.required, "1.2.3")
    t.strictEqual(deps.testDepName2.stable, "1.2.3")
    t.strictEqual(deps.testDepName2.latest, "1.2.3")
    t.end()
  })
})

test("Return dependency versions when versions option is true", function (t) {
  t.plan(8)

  var npmMock = {
    load: function (config, cb) {
      cb()
    },
    commands: {
      view: function (args, silent, cb) {
        process.nextTick(function () {
          cb(null, {"1.1.0": {versions: ["0.2.0", "1.0.1", "1.1.0"]}})
        })
      }
    }
  }

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "^1.0.1"
    }
  }

  david.getDependencies(manifest, {loose: true, versions: true}, function (er, deps) {
    t.ifError(er)
    t.ok(deps)
    t.ok(deps.testDepName)
    t.ok(deps.testDepName.versions)
    t.strictEqual(deps.testDepName.versions.length, 3)
    t.strictEqual(deps.testDepName.versions[0], "0.2.0")
    t.strictEqual(deps.testDepName.versions[1], "1.0.1")
    t.strictEqual(deps.testDepName.versions[2], "1.1.0")
    t.end()
  })
})

test("Return dependency versions satisfying ranges when rangeVersions option is true", function (t) {
  t.plan(7)

  var npmMock = {
    load: function (config, cb) {
      cb()
    },
    commands: {
      view: function (args, silent, cb) {
        process.nextTick(function () {
          cb(null, {"1.1.0": {versions: ["0.2.0", "1.0.1", "1.1.0"]}})
        })
      }
    }
  }

  david.__set__("npm", npmMock)

  var manifest = {
    dependencies: {
      testDepName: "^1.0.1"
    }
  }

  david.getDependencies(manifest, {loose: true, rangeVersions: true}, function (er, deps) {
    t.ifError(er)
    t.ok(deps)
    t.ok(deps.testDepName)
    t.ok(deps.testDepName.rangeVersions)
    t.strictEqual(deps.testDepName.rangeVersions.length, 2)
    t.strictEqual(deps.testDepName.rangeVersions[0], "1.0.1")
    t.strictEqual(deps.testDepName.rangeVersions[1], "1.1.0")
    t.end()
  })
})

test("Test getDependencies SCM URL warning", function (t) {
  t.plan(5)

  var manifest = {
    dependencies: {
      foo: "git+https://github.com/foo/bar.git"
    }
  }

  david.getDependencies(manifest, function (er, deps) {
    t.ifError(er)
    t.ok(deps)
    t.ok(deps.foo)
    t.ok(deps.foo.warn)
    t.equal(deps.foo.warn.code, "ESCM")
    t.end()
  })
})

test("Test non-string dependency doesn't throw", function (t) {
  t.plan(2)

  var manifest = {
    dependencies: {
      "//": {
        "passport-facebook": "~1.0.2",
        "passport-github": "~0.1.5",
        "passport-google-oauth": "~0.1.5",
        "passport-linkedin": "~0.1.3",
        "passport-twitter": "~1.0.2"
      }
    }
  }

  david.getDependencies(manifest, {error: {EDEPTYPE: true}}, function (er) {
    t.ok(er, "Expected error")
    t.equal(er.code, "EDEPTYPE", "Expected error code EDEPTYPE")
    t.end()
  })
})
