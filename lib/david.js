/**
 * david
 * https://github.com/alanshaw/david
 *
 * Copyright (c) 2013 Alan Shaw
 * Licensed under the MIT license.
 */

var parallel = require('async/parallel')
var semver = require('semver')
var Version = require('./version')
var Npm = require('./npm')

// Convert dependencies specified as an array to an object
function normaliseDeps (deps) {
  if (Array.isArray(deps)) {
    deps = deps.reduce(function (d, depName) {
      d[depName] = '*'
      return d
    }, {})
  }
  return deps
}

/**
 * Given dep, an object obtained by calling getDependencies, determine whether dep.required (the version specified
 * in package.json) is out of date wrt dep.stable or dep.latest.
 * @param {Object} dep
 * @param {Object} [opts] Options
 * @param {Boolean} [opts.stable] Consider only stable packages
 * @param {Boolean} [opts.loose] Use loose option when querying semver
 * @returns {boolean}
 */
function isUpdated (dep, opts) {
  opts = opts || {}

  var required = dep.required || '*'

  // TODO: Handle tags correctly
  if (required !== 'latest' && required !== '*') {
    var range = semver.validRange(required, opts.loose) || ''
    var version = opts.stable ? dep.stable : dep.latest

    if (version) {
      if (!range) {
        return true
      } else if (!semver.satisfies(version, range, opts.loose)) {
        if (opts.stable && semver.gtr(version, range, opts.loose)) {
          return true
        } else if (!opts.stable) {
          return true
        }
      }
    }
  }
  return false
}

exports.isUpdated = isUpdated

/**
 * Given the options passed to david, figure out the dep type.
 */
function depType (opts) {
  if (opts.dev) {
    return 'devDependencies'
  } else if (opts.optional) {
    return 'optionalDependencies'
  } else if (opts.peer) {
    return 'peerDependencies'
  }
  return 'dependencies'
}

/**
 * Get a list of dependencies for the passed manifest.
 * @param {Object} manifest Parsed package.json file contents
 * @param {Object|Function} [opts] Options or callback
 * @param {Boolean} [opts.dev] Consider devDependencies
 * @param {Boolean} [opts.optional] Consider optionalDependencies
 * @param {Boolean} [opts.peer] Consider peerDependencies
 * @param {Boolean} [opts.loose] Use loose option when querying semver
 * @param {Object} [opts.npm] npm configuration options
 * @param {Boolean} [opts.error.E404] Error on 404s
 * @param {Boolean} [opts.versions] For each dependency, return the available versions
 * @param {Boolean} [opts.rangeVersions] For each dependency, return the available versions for the range specified in the package.json
 * @param {Array} [opts.ignore] List of dependency names to ignore
 * @param {Function} cb Function that receives the results
 */
function getDependencies (manifest, opts, cb) {
  manifest = manifest || {}

  // Allow callback to be passed as second parameter
  if (!cb) {
    cb = opts
    opts = {}
  } else {
    opts = opts || {}
  }

  opts.error = opts.error || {}
  opts.ignore = opts.ignore || []

  if (manifest.david && manifest.david.ignore) {
    opts.ignore = opts.ignore.concat(manifest.david.ignore)
  }

  var pkgs = {}
  var deps = normaliseDeps(manifest[depType(opts)] || {})
  var depNames = Object.keys(deps)
  var error // Return any error that occurred but don't stop processing

  if (!depNames.length) {
    return setImmediate(function () { cb(null, pkgs) })
  }

  var tasks = depNames.map(function (depName) {
    return function (cb) {
      if (opts.ignore.indexOf(depName) > -1) {
        return cb()
      }

      var err

      if (Object.prototype.toString.call(deps[depName]) !== '[object String]') {
        err = new Error('Non-string dependency: ' + deps[depName])
        err.code = 'EDEPTYPE'

        if (!opts.error.EDEPTYPE) {
          pkgs[depName] = {required: deps[depName], warn: err}
        } else {
          error = err
        }

        return cb()
      }

      if (Version.isScm(deps[depName])) {
        err = new Error('SCM dependency: ' + deps[depName])
        err.code = 'ESCM'

        if (!opts.error.ESCM) {
          pkgs[depName] = {required: deps[depName], warn: err}
        } else {
          error = err
        }
        return cb()
      }

      Npm.getVersionsInfo(depName, opts, function (err, versionsInfo) {
        if (err) {
          if (!opts.error.E404 && err.code === 'E404') {
            if (err === '404 Not Found') {
              err = new Error('404 Not Found: ' + depName)
              err.pkgid = depName
              err.statusCode = 404
              err.code = 'E404'
            }

            pkgs[depName] = {required: deps[depName], warn: err}
          } else {
            error = err
          }
          return cb()
        }

        try {
          var latestVersionInfo = Version.getLatest(versionsInfo.current, versionsInfo.versions, opts)

          pkgs[depName] = {
            required: deps[depName],
            stable: latestVersionInfo.stable,
            latest: latestVersionInfo.latest
          }

          if (opts.versions) {
            pkgs[depName].versions = versionsInfo.versions
          }

          if (opts.rangeVersions) {
            pkgs[depName].rangeVersions = Version.getVersionsInRange(deps[depName], versionsInfo.versions, opts.loose)
          }
        } catch (err) {
          error = err
        }

        cb()
      })
    }
  })

  parallel(tasks, function () { cb(error, pkgs) })
}

exports.getDependencies = getDependencies

/**
 * Get a list of updated packages for the passed manifest.
 * @param {Object} manifest Parsed package.json file contents
 * @param {Object|Function} [opts] Options or callback
 * @param {Boolean} [opts.stable] Consider only stable packages
 * @param {Boolean} [opts.dev] Consider devDependencies
 * @param {Boolean} [opts.optional] Consider optionalDependencies
 * @param {Boolean} [opts.peer] Consider peerDependencies
 * @param {Boolean} [opts.loose] Use loose option when querying semver
 * @param {Object} [opts.npm] npm configuration options
 * @param {Boolean} [opts.error.E404] Error on 404s
 * @param {Boolean} [opts.versions] For each dependency, return the available versions
 * @param {Boolean} [opts.rangeVersions] For each dependency, return the available versions for the range specified in the package.json
 * @param {Array} [opts.ignore] List of dependency names to ignore
 * @param {Function} cb Function that receives the results
 */
exports.getUpdatedDependencies = function (manifest, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  } else {
    opts = opts || {}
  }
  opts.error = opts.error || {}

  getDependencies(manifest, opts, function (err, pkgs) {
    if (err) return cb(err)

    // Filter out the non-updated dependencies
    Object.keys(pkgs).forEach(function (depName) {
      if (pkgs[depName].warn) return

      if (!isUpdated(pkgs[depName], opts)) {
        delete pkgs[depName]
      }
    })

    cb(err, pkgs)
  })
}
