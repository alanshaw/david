module.exports = function(grunt) {
	
	grunt.initConfig({
		
		nodeunit: {
			files: 'test/*.js'
		},
		
		jshint: {
			files: 'david.js'
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	
	grunt.registerTask('default', ['jshint', 'nodeunit']);
};