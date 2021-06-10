#!/usr/bin/env node

import * as david from '../src/david.js'
import Color from 'cli-color-tty'
import Table from 'cli-table'
import fs from 'fs'
import path from 'path'
// import npm from 'npm'
import minimist from 'minimist'
import umeta from 'umeta'

const argv = minimist(process.argv.slice(2))
const clc = Color()
const { dirName, require } = umeta(import.meta)

if (argv.usage || argv.help || argv.h) {
  console.log(fs.readFileSync(path.join(dirName, 'usage.txt'), 'utf8'))
  process.exit()
}

if (argv.version || argv.v) {
  console.log('v' + require('../package.json').version)
  process.exit()
}

argv.update = argv._.indexOf('update') > -1 || argv._.indexOf('u') > -1

// function getNonWarnDepNames (deps) {
//   return Object.keys(deps).reduce(function (names, name) {
//     if (!deps[name].warn) {
//       names.push(name)
//     }
//     return names
//   }, [])
// }

// /**
//  * Like printDeps, walk the list, but only print dependencies
//  * with warnings.
//  * @param {Object} deps
//  * @param {String} type
//  */
// function printWarnings (deps, type) {
//   if (!Object.keys(deps).length) return

//   var warnings = {
//     E404: { title: 'Unregistered', list: [] },
//     ESCM: { title: 'SCM', list: [] },
//     EDEPTYPE: { title: 'Non-string dependency', list: [] }
//   }

//   for (var name in deps) {
//     var dep = deps[name]

//     if (dep.warn) {
//       warnings[dep.warn.code].list.push([clc.magenta(name), clc.red(dep.warn.toString())])
//     }
//   }

//   Object.keys(warnings).forEach(function (warnType) {
//     var warnList = warnings[warnType].list

//     if (!warnList.length) return

//     var table = new Table({ head: ['Name', 'Message'], style: { head: ['reset'] } })

//     console.log(clc.underline(warnings[warnType].title + ' ' + (type ? type + 'D' : 'd') + 'ependencies') + '\n')
//     warnList.forEach(function (row) { table.push(row) })
//     console.log(table.toString() + '\n')
//   })
// }

function printDeps (deps, type) {
  if (!Object.keys(deps).length) return

  var oneLine = ['npm install']

  if (type === 'dev') {
    oneLine.push('--save-dev')
  } else if (type === 'optional') {
    oneLine.push('--save-optional')
  } else if (type === 'global') {
    oneLine.push('--global')
  } else {
    oneLine.push('--save')
  }

  var nonWarnDepNames = Object.keys(deps)

  if (nonWarnDepNames.length) {
    if (type) {
      console.log(clc.underline('%sDependencies'), type)
    } else {
      console.log(clc.underline('dependencies'))
    }

    var table = new Table({ head: ['Name', 'Package', 'Latest'], style: { head: ['reset'] } })

    nonWarnDepNames.forEach(function (name) {
      var dep = deps[name]

      oneLine.push(name + '@' + dep[argv.unstable ? 'latest' : 'stable'])

      table.push([
        clc.magenta(name),
        clc.red(dep.required),
        clc.green(dep[argv.unstable ? 'latest' : 'stable'])
      ])
    })

    console.log('\n' + table.toString() + '\n\n' + oneLine.join(' ') + '\n')
  }

  // printWarnings(deps, type)
}

// Get a list of dependency filters
const filterList = argv._.filter(v => !(v === 'update' || v === 'u'))

// Filter the passed deps (result from david) by the dependency names passed on the command line
function filterDeps (deps) {
  filterList.forEach(n => { delete deps[n] })
  return deps
}

// Get updated deps, devDeps and optionalDeps
async function getUpdatedDeps (pkg) {
  const stable = !argv.unstable

  const opts = {
    registry: argv.registry,
    semver: { loose: true },
    ignoreNotFound: !argv.error404,
    ignoreNonSemver: !argv.errorSCM || !argv.errorDepType,
    ignoreModules: argv.ignore || argv.i
  }

  const [ infos, devInfos, optionalInfos ] = (await Promise.all([
    david.dependenciesInfo(pkg.dependencies, opts),
    david.dependenciesInfo(pkg.devDependencies, opts),
    david.dependenciesInfo(pkg.optionalDependencies, opts)
  ])).map(filterDeps).map(infos => (
    Object.fromEntries(Object.entries(infos).filter(([, i]) => david.isUpdated(i, { stable })))
  ))

  return { infos, devInfos, optionalInfos }
}

/**
 * Install the passed dependencies
 *
 * @param {Object} deps Dependencies to install (result from david)
 * @param {Object} opts Install options
 * @param {Boolean} [opts.global] Install globally
 * @param {Boolean} [opts.save] Save installed dependencies to dependencies/devDependencies/optionalDependencies
 * @param {Boolean} [opts.dev] Provided dependencies are dev dependencies
 * @param {Boolean} [opts.optional] Provided dependencies are optional dependencies
 * @param {String} [opts.registry] The npm registry URL to use
 * @param {Function} cb Callback
 */
// function installDeps (deps, opts, cb) {
//   opts = opts || {}

//   var depNames = Object.keys(deps)

//   // Nothing to install!
//   if (!depNames.length) {
//     return cb(null)
//   }

//   depNames = depNames.filter(function (depName) {
//     return !deps[depName].warn
//   })

//   var npmOpts = { global: opts.global }

//   // Avoid warning message from npm for invalid registry url
//   if (opts.registry) {
//     npmOpts.registry = opts.registry
//   }

//   npm.load(npmOpts, function (err) {
//     if (err) return cb(err)

//     if (opts.save) {
//       npm.config.set('save' + (opts.dev ? '-dev' : opts.optional ? '-optional' : ''), true)
//     }

//     var installArgs = [depNames.map(function (depName) {
//       return depName + '@' + deps[depName][argv.unstable ? 'latest' : 'stable']
//     }), function (err) {
//       npm.config.set('save' + (opts.dev ? '-dev' : opts.optional ? '-optional' : ''), false)
//       cb(err)
//     }]

//     if (opts.path) { installArgs.unshift(opts.path) }

//     npm.commands.install.apply(npm.commands, installArgs)
//   })
// }

async function main () {
  if (argv.global || argv.g) {
    throw new Error('not implemented')
    // var opts = { global: true }
  
    // // Avoid warning message from npm for invalid registry url
    // if (argv.registry) {
    //   opts.registry = argv.registry
    // }
  
    // npm.load(opts, function (err) {
    //   if (err) {
    //     console.error('Failed to load npm', err)
    //     exit(1)
    //   }
  
    //   npm.commands.ls([], true, function (err, data) {
    //     if (err) {
    //       console.error('Failed to list global dependencies', err)
    //       exit(1)
    //     }
  
    //     var pkg = {
    //       name: 'Global Dependencies',
    //       dependencies: {}
    //     }
  
    //     for (var key in data.dependencies) {
    //       pkg.dependencies[key] = data.dependencies[key].version
    //     }
  
    //     getUpdatedDeps(pkg, function (err, deps) {
    //       if (err) {
    //         console.error('Failed to get updated dependencies/devDependencies', err)
    //         exit(1)
    //       }
  
    //       if (argv.update) {
    //         installDeps(deps, opts, function (err) {
    //           if (err) {
    //             console.error('Failed to update global dependencies', err)
    //             exit(1)
    //           }
    //           printWarnings(deps, 'global')
    //         })
    //       } else {
    //         printDeps(deps, 'global')
    //         if (getNonWarnDepNames(deps).length) {
    //           exit(1)
    //         }
    //         // Log feedback if all global dependencies are up to date
    //         console.log(clc.green('All global dependencies up to date'))
    //       }
    //     })
    //   })
    // })
  } else {
    var pkg, pkgDir
  
    if (argv.package || argv.p) {
      pkg = argv.package || argv.p
      pkgDir = path.dirname(pkg)
    } else {
      pkgDir = process.cwd()
      pkg = pkgDir + '/package.json'
    }
  
    try {
      pkg = fs.readFileSync(pkg)
      try {
        pkg = JSON.parse(pkg)
      } catch (err) {
        throw Object.assign(err, { message: `Failed to parse package.json: ${err.message}` })
      }
    } catch (err) {
      throw Object.assign(err, { message: `Failed to read package.json: ${err.message}` })
    }
  
    const { infos, devInfos, optionalInfos } = await getUpdatedDeps(pkg)
  
    if (argv.update) {
      throw new Error('not implemented')
      // var opts = { save: true, registry: argv.registry, path: pkgDir }
  
      // installDeps(deps, opts, function (err) {
      //   if (err) {
      //     console.error('Failed to update/save dependencies', err)
      //     exit(1)
      //   }
  
      //   installDeps(devDeps, xtend(opts, { dev: true }), function (err) {
      //     if (err) {
      //       console.error('Failed to update/save devDependencies', err)
      //       exit(1)
      //     }
  
      //     installDeps(optionalDeps, xtend(opts, { optional: true }), function (err) {
      //       if (err) {
      //         console.error('Failed to update/save optionalDependencies', err)
      //         exit(1)
      //       }
  
      //       printWarnings(deps)
      //       printWarnings(devDeps, 'dev')
      //       printWarnings(optionalDeps, 'optional')
      //     })
      //   })
      // })
    } else {
      printDeps(infos)
      printDeps(devInfos, 'dev')
      printDeps(optionalInfos, 'optional')
  
      if (Object.keys(infos).length ||
        Object.keys(devInfos).length ||
        Object.keys(optionalInfos).length) {
        process.exit(1)
      } else {
        // Log feedback if all dependencies are up to date
        console.log(clc.green('All dependencies up to date'))
      }
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
