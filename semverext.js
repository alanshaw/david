var semver = require('semver');

/**
 * Determine if version is greater than all the versions possible in the range.
 * 
 * @param version
 * @param range
 * @return {boolean}
 */
module.exports.gtr = function(version, range) {
	
	version = semver.valid(version);
	
	if(!version) return false;
	
	//console.log(range);
	
	range = semver.toComparators(range);
	
	//console.log(range);
	
	for (var i = 0, l = range.length; i < l ; i++) {
		
		var comparitorProps = [];
		
		for (var j = 0, ll = range[i].length; j < ll; j ++) {
			
			var r = range[i][j],
				gtlt = r.charAt(0) === ">" ? semver.gt : r.charAt(0) === "<" ? semver.lt : false,
				eq = r.charAt(!!gtlt) === "=",
				sub = (!!eq) + (!!gtlt);
			
			if (!gtlt) eq = true;
			
			r = r.substr(sub);
			
			if(r === '') return false;
			
			comparitorProps[j] = {version: semver.valid(r), gtlt: gtlt, eq: eq};
		}
		
		if(ll == 1) {
			
			// If one entry in range, and the comparitor is gt then we're never going to greater than it regardless
			// of whether version is less than or more than the range start version
			if(comparitorProps[0].gtlt === semver.gt) {
				return false;
			}
			
			// If one entry in range, and the comparitor is lt then we can return false if we satisfy it
			if(comparitorProps[0].gtlt === semver.lt) {
				
				if(comparitorProps[0].eq && semver.lte(version, comparitorProps[0].version)) {
					return false;
				} else if(semver.lt(version, comparitorProps[0].version)) {
					return false;
				}
				
			} else if(semver.lte(version, comparitorProps[0].version)) {
				return false;
			}
			
		} else {
			
			// If two entries in range then first ALWAYS starts with ">="
			// Return false if version is less than range start version
			if(semver.lt(version, comparitorProps[0].version)) {
				return false;
			}
			
			// If two entries in range then second ALWAYS starts with "<"
			// Return false if version is less than end version
			if(semver.lt(version, comparitorProps[1].version)) {
				return false;
			}
		}
	}
	
	return true;
};