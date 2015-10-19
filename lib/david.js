/**
 * david
 * https://github.com/alanshaw/david
 *
 * Copyright (c) 2013 Alan Shaw
 * Licensed under the MIT license.
 */

var npm = require('npm')
var async = require('async')
var semver = require('semver')

var unstablePattern = /[a-z+\-]/i

/**
 * Determine if a version is a stable version or not.
 * @param {String} version
 * @return {Boolean}
 */
function isStable (version) {
  return !unstablePattern.test(version || '')
}

/**
 * Determine if a version is a SCM URL or not.
 * @param {String} version
 * @return {Boolean}
 */
function isScm (version) {
  var scmPrefixes = ['git:', 'git+ssh:', 'https:', 'git+https:']
  var blacklisted = scmPrefixes.filter(function (prefix) {
    return version.indexOf(prefix) === 0
  })
  return !!blacklisted.length
}

/**
 * Get the latest stable version from a list of versions in ascending order.
 * @param {Array} versions
 * @return {String}
 */
function getLatestStable (versions) {
  versions = versions.slice()
  while (versions.length) {
    var version = versions.pop()
    if (isStable(version)) {
      return version
    }
  }
  return null
}

/**
 * Get info about the versions for this dependency. Returns an object with
 * `current` and `versions` properties. Where `current` is the version you'd
 * get when you `npm install [package]` and `versions` is a sorted array of
 * available versions for the dependency.
 * @param {String} name Dependency name
 * @param {Object} opts Options
 * @param {Object} [opts.npm] npm configuration options
 */
function getVersionsInfo (name, opts, cb) {
  npm.load(opts.npm || {}, function (err) {
    if (err) return cb(err)

    npm.commands.view([name, 'versions', 'time'], true, function (err, data) {
      if (err) return cb(err)

      var currentVersion = Object.keys(data)[0]
      var versions = null

      // `npm view 0 versions` returns {}
      if (!currentVersion) {
        return cb(new Error('Failed to get versions for ' + name))
      }

      // Some packages simply don't have a time object
      if (data[currentVersion].time) {
        versions = data[currentVersion].versions.sort(function (a, b) {
          a = data[currentVersion].time[a]
          b = data[currentVersion].time[b]
          return (a < b ? -1 : (a > b ? 1 : 0))
        })
      } else {
        versions = data[currentVersion].versions
      }

      cb(null, {current: currentVersion, versions: versions})
    })
  })
}

/**
 * Get the latest version and latest stable version
 * @param {String} current The version you get when you `npm install [package]`
 * @param {Array} versions All versions available
 * @param {Object} opts Options
 * @param {Boolean} [opts.loose] Use loose option when querying semver
 */
function getLatestVersionInfo (current, versions, opts) {
  var stable = current
  var latest = versions[versions.length - 1]

  if (!isStable(stable)) {
    stable = getLatestStable(versions)
  }

  // getLatestStable might not have found a stable version
  if (stable) {
    // Latest is the most recent version with higher version than stable
    for (var i = versions.length - 1; i >= 0; i--) {
      // If !opts.loose then this may throw
      if (semver.gt(versions[i], stable, opts.loose)) {
        latest = versions[i]
        break
      }
    }
  }

  return {latest: latest, stable: stable}
}

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

module.exports.isUpdated = isUpdated

function getVersionsInRange (range, versions, loose) {
  return versions.filter(function (v) {
    return semver.satisfies(v, range, loose)
  })
}

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

      if (isScm(deps[depName])) {
        err = new Error('SCM dependency: ' + deps[depName])
        err.code = 'ESCM'

        if (!opts.error.ESCM) {
          pkgs[depName] = {required: deps[depName], warn: err}
        } else {
          error = err
        }
        return cb()
      }

      getVersionsInfo(depName, opts, function (err, versionsInfo) {
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
          var latestVersionInfo = getLatestVersionInfo(versionsInfo.current, versionsInfo.versions, opts)

          pkgs[depName] = {
            required: deps[depName],
            stable: latestVersionInfo.stable,
            latest: latestVersionInfo.latest
          }

          if (opts.versions) {
            pkgs[depName].versions = versionsInfo.versions
          }

          if (opts.rangeVersions) {
            pkgs[depName].rangeVersions = getVersionsInRange(deps[depName], versionsInfo.versions, opts.loose)
          }
        } catch (err) {
          error = err
        }

        cb()
      })
    }
  })

  async.parallel(tasks, function () { cb(error, pkgs) })
}

module.exports.getDependencies = getDependencies

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
module.exports.getUpdatedDependencies = function (manifest, opts, cb) {
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
