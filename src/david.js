/**
 * david
 * https://github.com/alanshaw/david
 *
 * Copyright (c) 2013 Alan Shaw
 * Licensed under the MIT license.
 */

import multimatch from 'multimatch'
import Semver from 'semver'
import inflight from 'promise-inflight'
import fetch from 'node-fetch'

const REGISTRY = 'https://registry.npmjs.org'
const CORGI_DOC = 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*'

/**
 * @typedef {{ required: string, latest: string, stable: string, versions: string[] }} Info
 */

/**
 * @typedef {{ [moduleName: string]: Info }} Infos
 */

/**
 * @typedef {{ [moduleName: string]: string }} Dependencies
 */

/**
 * moduleInfo gets version info for the passed module.
 * @param {string} name Module name.
 * @param {object} [options] Options
 * @param {string} [options.registry] npm registry URL.
 * @param {{ loose?: boolean }} [options.semver] Semver options.
 * @param {boolean} [options.ignoreNotFound] Ignore 404 errors.
 * @param {string[]} [options.ignoreModules] List of dependency names or globs to ignore.
 * @return {Promise<{ latest: string, stable: string, versions: string[] }>}
 */
function moduleInfo (name, options) {
  options = options || {}

  return inflight(name, async () => {
    const url = `${options.registry || REGISTRY}/${encodeURIComponent(name)}`
    const res = await fetch(url, { headers: { accept: CORGI_DOC } })

    if (!res.ok) {
      const err = new Error(`not ok (${res.status}) fetching ${url}`)
      err.response = res
      throw err
    }

    const packument = await res.json()
    const distTagsLatest = packument['dist-tags'] && packument['dist-tags'].latest

    if (!distTagsLatest) {
      throw new Error('missing dist-tags.latest')
    }

    const versions = Object.keys(packument.versions)
    const { latest, stable } = getLatest(distTagsLatest, versions, options)

    return { latest, stable, versions }
  })
}

/**
 * dependenciesInfo gets module info for the passed dependencies object.
 * @param {Dependencies} deps A dependencies, devDependencies, peerDependencies etc. object as would be found in a package.json.
 * @param {object} [options] Options
 * @param {string} [options.registry] npm registry URL.
 * @param {{ loose?: boolean }} [options.semver] Semver options.
 * @param {string[]} [options.ignoreModules] List of dependency names or globs to ignore.
 * @param {boolean} [options.ignoreNotFound] Ignore 404 errors.
 * @param {boolean} [options.ignoreNonSemverRange] Ignore version ranges that aren't semver strings.
 * @return {Promise<Infos>}
 */
export async function dependenciesInfo (deps, options) {
  deps = normalizeDependencies(deps)
  options = options || {}

  const entries = await Promise.all(
    Object.entries(deps)
      .filter(([n, r]) => {
        if (options.ignoreModules && multimatch(n, options.ignoreModules).length) {
          return false
        }
        if (!Semver.validRange(r, options.semver)) {
          if (options.ignoreNonSemverRange) {
            return false
          } else {
            throw new Error(`non semver version for module ${n}`)
          }
        }
        return true
      })
      .map(async ([n, r]) => {
        try {
          const info = await moduleInfo(n, options)
          return [n, { required: r, ...info }]
        } catch (err) {
          if (options.ignoreNotFound && err.response && err.response.status === 404) {
            return null
          }
          throw err
        }
      })
  )

  return Object.fromEntries(entries.filter(Boolean))
}

// normalizeDependencies converts dependencies specified as an array to an object.
export function normalizeDependencies (deps) {
  if (Array.isArray(deps)) {
    return Object.fromEntries(deps.map(n => [n, '*']))
  } else if (Object.prototype.toString.call(deps) === '[object String]') {
    return { [deps]: '*' }
  } else if (!(deps instanceof Object)) {
    return {}
  }
  return deps
}

/**
 * Given moduleInfo, an object obtained by calling dependenciesInfo, determine
 * whether dep.required (the version specified in package.json) is out of date
 * wrt dep.stable or dep.latest.
 *
 * @param {Info} moduleInfo
 * @param {object} [options] Options
 * @param {boolean} [options.stable] Consider only stable versions.
 * @param {{ loose?: boolean }} [options.semver] Semver options.
 * @returns {boolean}
 */
export function isUpdated (moduleInfo, options) {
  options = options || {}

  const required = moduleInfo.required || '*'

  // TODO: Handle tags correctly
  if (required !== 'latest' && required !== '*') {
    const range = Semver.validRange(required, options.semver) || ''
    const version = options.stable ? moduleInfo.stable : moduleInfo.latest

    if (version) {
      if (!range) {
        return true
      } else if (!Semver.satisfies(version, range, options.semver)) {
        if (options.stable && Semver.gtr(version, range, options.semver)) {
          return true
        } else if (!options.stable) {
          return true
        }
      }
    }
  }
  return false
}

const unstablePattern = /[a-z+-]/i

// isStable determines if a version is a stable version or not.
function isStable (version) {
  return !unstablePattern.test(version || '')
}

/**
 * getLatest get the latest version and latest stable version.
 * @param {string} current The version you get when you `npm install [package]`
 * @param {string[]} versions All versions available
 * @param {object} options Options
 * @param {object} [opts.semver] Semver options
 * @returns {Promise<{ latest: string, stable: string }>}
 */
function getLatest (current, versions, options) {
  options = options || {}
  versions = Array.from(versions).sort((a, b) => Semver.gt(a, b, options.semver) ? -1 : 1)

  let stable = current
  let latest = versions[0]

  if (!isStable(stable)) {
    stable = versions.find(isStable)
  }

  // we might not have found a stable version...
  if (stable) {
    // Latest is the most recent version with higher version than stable
    for (const v of versions) {
      // If !opts.loose then this may throw
      if (Semver.gt(v, stable, options.semver)) {
        latest = v
        break
      }
    }
  }

  return { latest, stable }
}
