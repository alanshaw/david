/* jshint camelcase: false */

var rewire = require("rewire")
  , semver = require("semver")
  , david = process.env.DAVID_COV ? rewire("../lib-cov/david") : rewire("../lib/david")

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

var start = null

module.exports = {
  setUp: function (cb) {
    if (start === null) {
      start = Date.now()
    }
    cb()
  },
  tearDown: function (cb) {
    console.log("Elapsed", Date.now() - start, "ms")
    cb()
  },
  "Test getDependencies returns an empty object when passed a manifest with no dependencies": function (test) {

    test.expect(3)

    david.getDependencies({}, function (er, deps) {
      test.equal(er, null)
      test.ok(deps)
      test.strictEqual(Object.keys(deps).length, 0)
      test.done()
    })
  },
  "Test getUpdatedDependencies returns an empty object when passed a manifest with no dependencies": function (test) {

    test.expect(3)

    david.getUpdatedDependencies({}, function (er, deps) {
      test.equal(er, null)
      test.ok(deps)
      test.strictEqual(Object.keys(deps).length, 0)
      test.done()
    })
  },
  "Test getDependencies returns desired result when only stable versions are available": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

    david.__set__("npm", npmMock)

    var manifest = {
      dependencies: {
        testDepName: "~0.0.2"
      }
    }

    david.getDependencies(manifest, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "~0.0.2")
      test.strictEqual(deps.testDepName.stable, "0.0.3")
      test.strictEqual(deps.testDepName.latest, "0.0.3")
      test.done()
    })
  },
  "Test getDependencies returns correct result when both stable and unstable versions are available": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3", "0.0.4-beta"])

    david.__set__("npm", npmMock)

    var manifest = {
      dependencies: {
        testDepName: "~0.0.3"
      }
    }

    david.getDependencies(manifest, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "~0.0.3")
      test.strictEqual(deps.testDepName.stable, "0.0.3")
      test.strictEqual(deps.testDepName.latest, "0.0.4-beta")
      test.done()
    })
  },
  "Test getUpdatedDependencies returns an empty object when there are no updated stable or unstable dependencies available": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

    david.__set__("npm", npmMock)

    var manifest = {
      dependencies: {
        testDepName: "~0.0.3"
      }
    }

    david.getUpdatedDependencies(manifest, function (er, deps) {
      test.expect(2)
      test.ok(deps)
      test.strictEqual(Object.keys(deps).length, 0)
      test.done()
    })
  },
  "Test getUpdatedDependencies returns correct dependency updates when only stable updates are available": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

    david.__set__("npm", npmMock)

    var manifest = {
      dependencies: {
        testDepName: "0.0.1"
      }
    }

    david.getUpdatedDependencies(manifest, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "0.0.1")
      test.strictEqual(deps.testDepName.stable, "0.0.3")
      test.strictEqual(deps.testDepName.latest, "0.0.3")
      test.done()
    })
  },
  "Test getUpdatedDependencies returns correct dependency updates when both unstable and stable updates are available": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.1.2", "0.1.3", "0.1.4+build.11.e0f985a"])

    david.__set__("npm", npmMock)

    var manifest = {
      dependencies: {
        testDepName: "~0.0.1"
      }
    }

    david.getUpdatedDependencies(manifest, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "~0.0.1")
      test.strictEqual(deps.testDepName.stable, "0.1.3")
      test.strictEqual(deps.testDepName.latest, "0.1.4+build.11.e0f985a")
      test.done()
    })
  },
  "Test getUpdatedDependencies returns correct dependency updates when latest tag point to the stable version": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.1.2", "0.1.3", "0.1.4"], "testDepName", "0.1.3")

    david.__set__("npm", npmMock)

    var manifest = {
      dependencies: {
        testDepName: "~0.0.1"
      }
    }

    david.getUpdatedDependencies(manifest, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "~0.0.1")
      test.strictEqual(deps.testDepName.stable, "0.1.3")
      test.strictEqual(deps.testDepName.latest, "0.1.4")
      test.done()
    })
  },
  "Test getUpdatedDependencies returns correct dependency updates when unstable version is not the most recent version": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.1.2", "0.2.0", "0.1.4"], "testDepName", "0.1.4")

    david.__set__("npm", npmMock)

    var manifest = {
      dependencies: {
        testDepName: "~0.0.1"
      }
    }

    david.getUpdatedDependencies(manifest, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "~0.0.1")
      test.strictEqual(deps.testDepName.stable, "0.1.4")
      test.strictEqual(deps.testDepName.latest, "0.2.0")
      test.done()
    })
  },
  "Test getUpdatedDependencies returns correct dependency updates when versions is not sorted by time": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.1.2", "0.1.3", "0.1.4-alpha9", "0.1.4-alpha10"])

    david.__set__("npm", npmMock)

    var manifest = {
      dependencies: {
        testDepName: "~0.0.1"
      }
    }

    david.getUpdatedDependencies(manifest, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "~0.0.1")
      test.strictEqual(deps.testDepName.stable, "0.1.3")
      test.strictEqual(deps.testDepName.latest, "0.1.4-alpha10")
      test.done()
    })
  },
  "Test getDependencies returns correct dependencies when there is no stable version": function (test) {

    var npmMock = mockNpm(["0.0.0-alpha1", "0.0.0-alpha2", "0.0.0-alpha3"], "testDepName", "0.0.0-alpha3")

    david.__set__("npm", npmMock)

    var manifest = {
      dependencies: {
        testDepName: "~0.0.0"
      }
    }

    david.getDependencies(manifest, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "~0.0.0")
      test.strictEqual(deps.testDepName.stable, null)
      test.strictEqual(deps.testDepName.latest, "0.0.0-alpha3")
      test.done()
    })
  },
  "Positive getUpdatedDependencies onlyStable=true tests": function (test) {

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

    test.expect(5 * dataSets.length)

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

          test.ok(deps)
          test.ok(deps[testDepName])
          test.strictEqual(deps[testDepName].required, data[1])
          test.strictEqual(deps[testDepName].stable, data[2])
          test.strictEqual(deps[testDepName].latest, data[0][data[0].length - 1])

          done++

          if (done === dataSets.length) {
            test.done()
          } else {
            tests[done]()
          }
        })
      })
    })

    tests[0]()
  },
  "Negative getUpdatedDependencies onlyStable=true tests": function (test) {

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

    test.expect(3 * dataSets.length)

    var done = 0
    var tests = []

    dataSets.forEach(function (data, i) {

      tests.push(function () {

        var npmMock = mockNpm(data[0], "testDepName" + i)

        david.__set__("npm", npmMock)

        var manifest = { dependencies: {} }

        manifest.dependencies["testDepName" + i] = data[1]

        david.getUpdatedDependencies(manifest, { stable: true }, function (er, deps) {

          test.ok(deps)
          test.equal(deps["testDepName" + i], undefined)
          test.strictEqual(Object.keys(deps).length, 0)

          done++

          if (done === dataSets.length) {
            test.done()
          } else {
            tests[done]()
          }
        })
      })
    })

    tests[0]()
  },
  "Test getDependencies will consider devDependencies": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

    david.__set__("npm", npmMock)

    var manifest = {
      devDependencies: {
        testDepName: "~0.0.2"
      }
    }

    david.getDependencies(manifest, { dev: true }, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "~0.0.2")
      test.strictEqual(deps.testDepName.stable, "0.0.3")
      test.strictEqual(deps.testDepName.latest, "0.0.3")
      test.done()
    })
  },
  "Test getUpdatedDependencies will consider devDependencies": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

    david.__set__("npm", npmMock)

    var manifest = {
      devDependencies: {
        testDepName: "0.0.1"
      }
    }

    david.getUpdatedDependencies(manifest, { dev: true }, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "0.0.1")
      test.strictEqual(deps.testDepName.stable, "0.0.3")
      test.strictEqual(deps.testDepName.latest, "0.0.3")
      test.done()
    })
  },
  "Test getDependencies will consider optionalDependencies": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

    david.__set__("npm", npmMock)

    var manifest = {
      optionalDependencies: {
        testDepName: "~0.0.2"
      }
    }

    david.getDependencies(manifest, { optional: true }, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "~0.0.2")
      test.strictEqual(deps.testDepName.stable, "0.0.3")
      test.strictEqual(deps.testDepName.latest, "0.0.3")
      test.done()
    })
  },
  "Test getUpdatedDependencies will consider optionalDependencies": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

    david.__set__("npm", npmMock)

    var manifest = {
      optionalDependencies: {
        testDepName: "0.0.1"
      }
    }

    david.getUpdatedDependencies(manifest, { optional: true }, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "0.0.1")
      test.strictEqual(deps.testDepName.stable, "0.0.3")
      test.strictEqual(deps.testDepName.latest, "0.0.3")
      test.done()
    })
  },
  "Test getDependencies will consider peerDependencies": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

    david.__set__("npm", npmMock)

    var manifest = {
      peerDependencies: {
        testDepName: "~0.0.2"
      }
    }

    david.getDependencies(manifest, { peer: true }, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "~0.0.2")
      test.strictEqual(deps.testDepName.stable, "0.0.3")
      test.strictEqual(deps.testDepName.latest, "0.0.3")
      test.done()
    })
  },
  "Test getUpdatedDependencies will consider peerDependencies": function (test) {

    var npmMock = mockNpm(["0.0.1", "0.0.2", "0.0.3"])

    david.__set__("npm", npmMock)

    var manifest = {
      peerDependencies: {
        testDepName: "0.0.1"
      }
    }

    david.getUpdatedDependencies(manifest, { peer: true }, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "0.0.1")
      test.strictEqual(deps.testDepName.stable, "0.0.3")
      test.strictEqual(deps.testDepName.latest, "0.0.3")
      test.done()
    })
  },
  "Test support dependencies specified as an array": function (test) {

    var npmMock = mockNpm(["0.0.0"])

    david.__set__("npm", npmMock)

    var manifest = {
      dependencies: ["testDepName"]
    }

    david.getDependencies(manifest, function (er, deps) {
      test.expect(5)
      test.ok(deps)
      test.ok(deps.testDepName)
      test.strictEqual(deps.testDepName.required, "*")
      test.strictEqual(deps.testDepName.stable, "0.0.0")
      test.strictEqual(deps.testDepName.latest, "0.0.0")
      test.done()
    })
  },
  "Test `npm view 0 versions` does not throw!": function (test) {

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

    test.doesNotThrow(function () {
      david.getDependencies(manifest, function () {})
    })

    test.done()
  },
  "Test error whilst getting dependency status doesn't cause remaining processing to stop": function (test) {
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
      test.expect(7)
      test.ok(er) // An error object should have been passed back
      test.ok(deps) // A deps object containing only testDepName2 should have been passed back
      test.ok(!deps.testDepName)
      test.ok(deps.testDepName2)
      test.strictEqual(deps.testDepName2.required, "1.2.3")
      test.strictEqual(deps.testDepName2.stable, "1.2.3")
      test.strictEqual(deps.testDepName2.latest, "1.2.3")
      test.done()
    })
  }
}
