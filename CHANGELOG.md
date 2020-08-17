# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 12.0.0 - 2020-08-xx

This release switches the code base to use esmodules and promises and removes the npm dependency in favour of calling the API directly. It has breaking API changes:

- `getDependencies` has been renamed to `dependenciesInfo`, it now returns a promise and no longer takes a callback. The following changes to the options this function takes have been made:
    - `versions` option has been removed, dependency versions are always returned
    - `rangeVersions` option has been removed, simply filter versions by `semver.satisfies(version, range)`
    - `loose` option should now be passed as `{ semver: { loose: true } }`
    - `errors.E404` option has changed to `ignoreNotFound` and has the opposite meaning i.e. 404 errors are thrown by default
    - `errors.EDEPTYPE` and `errors.ESCM` options have merged into `ignoreNonSemverRange`. Any version ranges that are not a semver version or range will be ignored when set to `true`.
    - `ignore` option has been renamed to `ignoreModules`.
- `getUpdatedDependencies` has been removed, use `dependenciesInfo` and then `isUpdated` to filter out the dependencies that are not updates.
- A new function `moduleInfo` has been added (and exported) to get the module versions info for a single module. It is used by `dependenciesInfo` for each module.

## 11.0.0 - 2017-03-02

- Update dependencies

## 10.0.0 - 2017-01-20

- Update to npm@4

## 9.0.0 - 2016-08-26

- CLI add global dependencies up to date message

## 8.0.0 - 2016-06-30

- Update dependencies

## 7.0.0 - 2015-11-09

- Update to npm@3

## 6.4.0 - 2015-10-19

- CLI Add `-i, --ignore` option to ignore dependencies

## 6.3.0 - 2015-10-19

- Ignore dependencies from `package.json` config

## 6.2.0 - 2015-08-08

- CLI Add `-p, --package` to specify package.json path

## 6.0.0 - 2014-12-19

- Warn about unregistered or git dependencies by default

## 5.0.0 - 2014-09-22

- Update to semver@4.0.0

## 4.1.0 - 2014-09-22

- Add versions option to return all dependency versions

## 4.0.0 - 2014-09-21

- Update to npm@2.0.2, add rangeVersions option

## 3.3.0 - 2014-06-02

- CLI Add `--warn404` option to print errors but not abort

## 3.1.0 - 2014-03-11

- CLI Add `-r, --registry` option to use alternate npm registry

## 3.0.0 - 2014-03-06

- Errors occurring whilst retrieving dependency status doesn't halt processing of other dependencies.
- An error object will be returned as first arg to callback, but status info for remaining dependencies will still be available (as second arg).
- CLI now uses loose semver version parsing.
- Update npm dependency so `david update` uses "^" as per https://github.com/npm/npm/issues/4587

## 2.4.0 - 2013-10-27

- Removes `semverext.js`. The `gtr` function is now available in `semver`

## 2.3.0 - 2013-10-08

- Support update specific modules from CLI via `david update [module]`

## 2.2.0 - 2013-10-01

- Support for `optionalDependencies` and `peerDependencies`

## 2.1.0 - 2013-09-16

- Fixed issues with latest/stable version detection

## 2.0.0 - 2013-08-25

- Simplification refactor to remove caching and useless events.
- Code style changes, performance improvements.

## 1.9.0 - 2013-08-04

- CLI added `--unstable` flag to view/update to latest _unstable_ dependency versions

## 1.8.0 - 2013-07-30

- CLI added `david update` to update dependencies to latest _stable_ versions and save to your project `package.json`

## 1.7.0 - 2013-06-27

- Updated to use semver 2 module
- Simplified code that determines if a version is greater than a range

## 1.6.0 - 2013-03-28

- Use `setImmediate` instead of `process.nextTick`.
- David now requires Node.js 0.10.x

## 1.5.0 - 2013-03-27

- CLI added `--global` flag to find outdated global dependencies

## 1.4.0 - 2013-03-15

- Allow set the maximum number of dependencies that can be stored in the cache

## 1.3.0 - 2013-03-14

- Added CLI support

## 1.2.0 - 2013-03-05

- David can now get dependency information for `devDependencies`

## 1.1.0 - 2013-02-07

- Adds `onlyStable` param to `getUpdatedDependencies` to filter by dependencies that are updated and stable

## 1.0.0 - 2013-02-06

- Return latest stable version as well as latest version (including patch and build versions).
- API return values changed.
- Events changed.
