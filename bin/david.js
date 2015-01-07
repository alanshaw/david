#!/usr/bin/env node

var david = require("../")
  , clc = require("cli-color-tty")()
  , Table = require("cli-table")
  , fs = require("fs")
  , npm = require("npm")
  , argv = require("minimist")(process.argv.slice(2))
  , xtend = require("xtend")
  , cwd = process.cwd()
  , packageFile = cwd + "/package.json"

if (argv.usage || argv.help || argv.h) {
  return console.log(fs.readFileSync(__dirname + "/usage.txt", "utf8"))
}

if (argv.version || argv.v) {
  return console.log("v" + require("../package.json").version)
}

argv.update = argv._.indexOf("update") > -1 || argv._.indexOf("u") > -1

/**
 * Like printDeps, walk the list, but only print dependencies
 * with warnings.
 * @param {Object} deps
 * @param {String} type
 */
function printWarnings (deps, type) {
  if (!Object.keys(deps).length) return

  var warnings = {
    E404: {title: "Unregistered", list: []},
    ESCM: {title: "SCM", list: []},
    EDEPTYPE: {title: "Non-strng dependency", list: []}
  }

  for (var name in deps) {
    var dep = deps[name]

    if (dep.warn) {
      warnings[dep.warn.code].list.push([clc.magenta(name), clc.red(dep.warn.toString())])
    }
  }

  Object.keys(warnings).forEach(function (warnType) {
    var warnList = warnings[warnType].list

    if (!warnList.length) return

    var table = new Table({head: ["Name", "Message"], style: {head: ["reset"]}})

    console.log(clc.underline(warnings[warnType].title + " " + (type ? type + "D" : "d") + "ependencies"))
    console.log("")
    warnList.forEach(function (row) { table.push(row) })
    console.log(table.toString())
    console.log("")
  })
}

function printDeps (deps, type) {
  if (!Object.keys(deps).length) return

  var oneLine = ["npm install"]

  if (type === "dev") {
    oneLine.push("--save-dev")
  } else if (type === "optional ") {
    oneLine.push("--save-optional")
  } else if (type === "global") {
    oneLine.push("--global")
  } else {
    oneLine.push("--save")
  }

  if (type) {
    console.log(clc.underline("%sDependencies"), type)
  } else {
    console.log(clc.underline("dependencies"))
  }

  var table = new Table({head: ["Name", "Package", "Latest"], style: {head: ["reset"]}})

  for (var name in deps) {
    var dep = deps[name]

    if (dep.warn) {
      continue
    }

    oneLine.push(name+"@"+dep[argv.unstable ? "latest" : "stable"])

    table.push([
      clc.magenta(name),
      clc.red(dep.required),
      clc.green(dep[argv.unstable ? "latest" : "stable"])
    ])
  }
  console.log("")
  console.log(table.toString())
  console.log("")
  console.log(oneLine.join(" "))
  console.log("")

  printWarnings(deps, type)
}

// Get a list of dependency filters
var filterList = argv._.filter(function (v) {
  return !(v === "update" || v === "u")
})

// Filter the passed deps (result from david) by the dependency names passed on the command line
function filterDeps (deps) {
  if (!filterList.length) return deps

  return Object.keys(deps).reduce(function (filteredDeps, name) {
    if (filterList.indexOf(name) !== -1) {
      filteredDeps[name] = deps[name]
    }
    return filteredDeps
  }, {})
}

// Get updated deps, devDeps and optionalDeps
function getUpdatedDeps (pkg, cb) {
  var opts = {
    stable: !argv.unstable,
    loose: true,
    error: {
      E404: argv.error404,
      ESCM: argv.errorSCM,
      EDEPTYPE: argv.errorDepType
    }
  }

  if (argv.registry) {
    opts.npm = {registry: argv.registry}
  }

  david.getUpdatedDependencies(pkg, opts, function (er, deps) {
    if (er) return cb(er)

    david.getUpdatedDependencies(pkg, xtend(opts, {dev: true}), function (er, devDeps) {
      if (er) return cb(er)

      david.getUpdatedDependencies(pkg, xtend(opts, {optional: true}), function (er, optionalDeps) {
        cb(er, filterDeps(deps), filterDeps(devDeps), filterDeps(optionalDeps))
      })
    })
  })
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
function installDeps (deps, opts, cb) {
  opts = opts || {}

  var depNames = Object.keys(deps)

  // Nothing to install!
  if (!depNames.length) {
    return cb(null)
  }

  depNames = depNames.filter(function (depName) {
    return !deps[depName].warn
  })

  npm.load({
    registry: opts.registry,
    global: opts.global
  }, function (er) {
    if (er) return cb(er)

    if (opts.save) {
      npm.config.set("save" + (opts.dev ? "-dev" : opts.optional ? "-optional" : ""), true)
    }

    var installArgs = depNames.map(function (depName) {
      return depName + "@" + deps[depName][argv.unstable ? "latest" : "stable"]
    })

    npm.commands.install(installArgs, function (er) {
      npm.config.set("save" + (opts.dev ? "-dev" : opts.optional ? "-optional" : ""), false)
      cb(er)
    })
  })
}

if (argv.global) {
  npm.load({registry: argv.registry, global: true}, function (er) {
    if (er) {
      console.error("Failed to load npm", er)
      process.exit(1)
    }

    npm.commands.ls([], true, function (er, data) {
      if (er) {
        console.error("Failed to list global dependencies", er)
        process.exit(1)
      }

      var pkg = {
        name: "Global Dependencies",
        dependencies: {}
      }

      for (var key in data.dependencies) {
        pkg.dependencies[key] = data.dependencies[key].version
      }

      getUpdatedDeps(pkg, function (er, deps) {
        if (er) {
          console.error("Failed to get updated dependencies/devDependencies", er)
          process.exit(1)
        }

        if (argv.update) {

          installDeps(deps, {registry: argv.registry, global: true}, function (er) {
            if (er) {
              console.error("Failed to update global dependencies", er)
              process.exit(1)
            }

            printWarnings(deps, "global")
          })

        } else {
          printDeps(deps, "global")
        }
      })
    })
  })

} else {
  if (!fs.existsSync(packageFile)) {
    console.error("package.json does not exist")
    process.exit(1)
  }

  var pkg = require(cwd + "/package.json")

  getUpdatedDeps(pkg, function (er, deps, devDeps, optionalDeps) {
    if (er) {
      console.error("Failed to get updated dependencies/devDependencies", er)
      process.exit(1)
    }

    if (argv.update) {
      var opts = {registry: argv.registry, save: true}

      installDeps(deps, opts, function (er) {
        if (er) {
          console.error("Failed to update/save dependencies", er)
          process.exit(1)
        }

        installDeps(devDeps, xtend(opts, {dev: true}), function (er) {
          if (er) {
            console.error("Failed to update/save devDependencies", er)
            process.exit(1)
          }

          installDeps(optionalDeps, xtend(opts, {optional: true}), function (er) {
            if (er) {
              console.error("Failed to update/save optionalDependencies", er)
              process.exit(1)
            }

            printWarnings(deps)
            printWarnings(devDeps, "dev")
            printWarnings(optionalDeps, "optional")
          })
        })
      })

    } else {
      printDeps(deps)
      printDeps(devDeps, "dev")
      printDeps(optionalDeps, "optional")

      if (Object.keys(deps).length || Object.keys(devDeps).length || Object.keys(optionalDeps).length) {
        process.exit(1)
      } else {
        // Log feedback if all dependencies are up to date
        console.log(clc.green("All dependencies up to date"))
      }
    }
  })
}
