var npm = require('npm')
var Batch = require('./batch')

var batch = new Batch()

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
  if (batch.exists(name)) {
    return batch.push(name, cb)
  }

  batch.push(name, cb)

  npm.load(opts.npm || {}, function (err) {
    if (err) return batch.call(name, function (cb) { cb(err) })

    npm.commands.view([name, 'versions', 'time'], true, function (err, data) {
      if (err) return batch.call(name, function (cb) { cb(err) })

      var currentVersion = Object.keys(data)[0]
      var versions = null

      // `npm view 0 versions` returns {}
      if (!currentVersion) {
        return batch.call(name, function (cb) {
          cb(new Error('Failed to get versions for ' + name))
        })
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

      batch.call(name, function (cb) {
        cb(null, { current: currentVersion, versions: versions })
      })
    })
  })
}

exports.getVersionsInfo = getVersionsInfo
