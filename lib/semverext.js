var semver = require("semver")
  , SemVer = semver.SemVer
  , Range = semver.Range

/**
 * Determine if version is greater than all the versions possible in the range.
 * @param version
 * @param range
 * @param loose
 * @return {boolean}
 */
module.exports.gtr = function (version, range, loose) {

  version = new SemVer(version, loose)
  range = new Range(range, loose)

  // If it satisifes the range it is not greater
  if (semver.satisfies(version, range, loose)) {
    return false
  }

  for (var i = 0; i < range.set.length; ++i) {
    var comparators = range.set[i]

    var high = null
    var low = null

    comparators.forEach(function (comparator) {
      high = high || comparator
      low = low || comparator
      if (semver.gt(comparator.semver, high.semver, loose)) {
        high = comparator
      } else if (semver.lt(comparator.semver, low.semver, loose)) {
        low = comparator
      }
    })

    // If the highest version comparator has a gt/gte operator then our version isn't higher than it
    if (high.operator === ">" || high.operator === ">=") {
      return false
    }

    // If the lowest version comparator has a gt/gte operator and our version is less than it then it isn't higher than the range
    if ((!low.operator || low.operator === ">") && semver.lte(version, low.semver)) {
      return false
    } else if (low.operator === ">=" && semver.lt(version, low.semver)) {
      return false
    }
  }
  return true
}
