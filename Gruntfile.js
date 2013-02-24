module.exports = function(grunt) {
	
	"use strict";
	
	grunt.initConfig({
		
		nodeunit: {
			files: 'test/*.js'
		},
		
		jshint: {
			options: {
				node: true,
				es5: true
			},
			files: 'david.js'
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	
	grunt.registerTask('default', ['jshint', 'nodeunit']);
};