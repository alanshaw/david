var semver = require('semver')

var unstablePattern = /[a-z+-]/i

/**
 * Determine if a version is a stable version or not.
 * @param {String} version
 * @return {Boolean}
 */
function isStable (version) {
  return !unstablePattern.test(version || '')
}

exports.isStable = isStable

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

exports.isScm = isScm

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

exports.getLatestStable = getLatestStable

/**
 * Get the latest version and latest stable version
 * @param {String} current The version you get when you `npm install [package]`
 * @param {Array} versions All versions available
 * @param {Object} opts Options
 * @param {Boolean} [opts.loose] Use loose option when querying semver
 */
function getLatest (current, versions, opts) {
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

  return { latest: latest, stable: stable }
}

exports.getLatest = getLatest

function getVersionsInRange (range, versions, loose) {
  return versions.filter(function (v) {
    return semver.satisfies(v, range, loose)
  })
}

exports.getVersionsInRange = getVersionsInRange
