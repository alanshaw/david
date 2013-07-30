var semver = require('semver');
var SemVer = semver.SemVer;
var Range = semver.Range;

/**
 * Determine if version is greater than all the versions possible in the range.
 * 
 * @param version
 * @param range
 * @param loose
 * @return {boolean}
 */
module.exports.gtr = function(version, range, loose) {
	
	version = new SemVer(version, loose);
	range = new Range(range, loose);
	
	for (var i = 0, l = range.set.length; i < l ; i++) {
		
		var comparitors = range.set[i].slice();
		
		if (!comparitors.length) {
			
			// If no comparitors in the range then version is NOT greater than it!
			return false;
			
		} else if(comparitors.length == 1) {
			
			// If we have a semver.ANY (a {}) then version is NOT greater than it!
			if (comparitors[0].value === "") {
				return false;
			}
			
			// If one entry in comparitors, and the comparitor is gt then we're never going to greater than it regardless
			// of whether version is less than or more than the range start version
			if(comparitors[0].operator === ">" || comparitors[0].operator === ">=") {
				return false;
			}
			
			// If one entry in comparitors, and the comparitor is lt then we can return false if we satisfy it
			if(comparitors[0].operator === "<" || comparitors[0].operator === "<=") {
				
				if(comparitors[0].operator === "<=" && semver.lte(version, comparitors[0].semver, loose)) {
					return false;
				} else if(semver.lt(version, comparitors[0].semver, loose)) {
					return false;
				}
				
			} else if(semver.lte(version, comparitors[0].semver, loose)) {
				return false;
			}
			
		} else {
			
			// If two entries in comparitors then first ALWAYS starts with ">="
			// Return false if version is less than range start version
			if(semver.lt(version, comparitors[0].semver, loose)) {
				return false;
			}
			
			// If two entries in comparitors then second ALWAYS starts with "<"
			// Return false if version is less than end version
			if(semver.lt(version, comparitors[1].semver, loose)) {
				return false;
			}
		}
	}
	
	return true;
};