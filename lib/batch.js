function Batch () {
  if (!(this instanceof Batch)) return new Batch()
  this._batch = {}
}

/**
 * Create or add a callback function to the end of a batch for a given key.
 * @param key
 * @param cb
 */
Batch.prototype.push = function (key, cb) {
  this._batch[key] = this._batch[key] || []
  this._batch[key].push(cb)
}

/**
 * Determine if there is a batch for the given key.
 * @param {String} key
 * @returns {boolean}
 */
Batch.prototype.exists = function (key) {
  return this._batch[key] != null
}

/**
 * Call all the batched callback functions for a key and remove them.
 * @param {String} key ID of the batch operation
 * @param {Function} fn Function to call for each
 */
Batch.prototype.call = function (key, cb) {
  var cbs = this._batch[key]
  this._batch[key] = null
  cbs.forEach(cb)
}

module.exports = Batch
