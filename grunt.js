module.exports = function(grunt) {
	
	"use strict";
	
	grunt.initConfig({
		
		test: {
			files: ['test/david.js']
		},
		
		lint: {
			files: ['david.js']
		},
		
		jshint: {
			options: {
				node: true,
				es5: true
			}
		}
	});
	
	grunt.registerTask('default', 'lint test');
};