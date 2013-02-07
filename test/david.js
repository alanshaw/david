(function() {
	
	"use strict";
	
	var rewire = require('rewire');
	var david;
	
	module.exports = {
		setUp: function(callback) {
			david = rewire('../david');
			callback();
		},
		testGetDepsNoDeps: function(test) {
			
			test.expect(3);
			
			david.getDependencies({}, function(err, deps) {
				test.equal(err, null);
				test.ok(deps);
				test.strictEqual(Object.keys(deps).length, 0);
				test.done();
			});
		},
		testGetUpdatedDepsNoDeps: function(test) {
			
			test.expect(3);
			
			david.getUpdatedDependencies({}, false, function(err, deps) {
				test.equal(err, null);
				test.ok(deps);
				test.strictEqual(Object.keys(deps).length, 0);
				test.done();
			});
		},
		testGetDepsStable: function(test) {
			
			var npmData = {
				'0.0.3': {
					versions: ['0.0.1', '0.0.2', '0.0.3']
				}
			};
			
			// Mock out NPM
			var npmMock = {
				load: function(config, callback) {
					callback();
				},
				commands: {
					view: function(args, callback) {
						if(args[0] == 'testDepName') {
							callback(null, npmData);
						} else {
							callback(new Error(), null);
						}
					}
				}
			};
			
			david.__set__('npm', npmMock);
			
			var manifest = {
				dependencies: {
					'testDepName': '~0.0.2'
				}
			};
			
			david.getDependencies(manifest, function(err, deps) {
				test.expect(5);
				test.ok(deps);
				test.ok(deps['testDepName']);
				test.strictEqual(deps['testDepName'].required, '~0.0.2');
				test.strictEqual(deps['testDepName'].stable, '0.0.3');
				test.strictEqual(deps['testDepName'].latest, '0.0.3');
				test.done();
			});
		},
		testGetDepsUnstable: function(test) {
			
			var npmData = {
				'0.0.4-beta': {
					versions: ['0.0.1', '0.0.2', '0.0.3', '0.0.4-beta']
				}
			};
			
			// Mock out NPM
			var npmMock = {
				load: function(config, callback) {
					callback();
				},
				commands: {
					view: function(args, callback) {
						if(args[0] == 'testDepName') {
							callback(null, npmData);
						} else {
							callback(new Error(), null);
						}
					}
				}
			};
			
			david.__set__('npm', npmMock);
			
			var manifest = {
				dependencies: {
					'testDepName': '~0.0.3'
				}
			};
			
			david.getDependencies(manifest, function(err, deps) {
				test.expect(5);
				test.ok(deps);
				test.ok(deps['testDepName']);
				test.strictEqual(deps['testDepName'].required, '~0.0.3');
				test.strictEqual(deps['testDepName'].stable, '0.0.3');
				test.strictEqual(deps['testDepName'].latest, '0.0.4-beta');
				test.done();
			});
		},
		testGetUpdatedDepsNoUpdates: function(test) {
			
			var npmData = {
				'0.0.3': {
					versions: ['0.0.1', '0.0.2', '0.0.3']
				}
			};
			
			// Mock out NPM
			var npmMock = {
				load: function(config, callback) {
					callback();
				},
				commands: {
					view: function(args, callback) {
						if(args[0] == 'testDepName') {
							callback(null, npmData);
						} else {
							callback(new Error(), null);
						}
					}
				}
			};
			
			david.__set__('npm', npmMock);
			
			var manifest = {
				dependencies: {
					'testDepName': '~0.0.3'
				}
			};
			
			david.getUpdatedDependencies(manifest, false, function(err, deps) {
				test.expect(2);
				test.ok(deps);
				test.strictEqual(Object.keys(deps).length, 0);
				test.done();
			});
		},
		testGetUpdatedDepsStable: function(test) {
			
			var npmData = {
				'0.0.3': {
					versions: ['0.0.1', '0.0.2', '0.0.3']
				}
			};
			
			// Mock out NPM
			var npmMock = {
				load: function(config, callback) {
					callback();
				},
				commands: {
					view: function(args, callback) {
						if(args[0] == 'testDepName') {
							callback(null, npmData);
						} else {
							callback(new Error(), null);
						}
					}
				}
			};
			
			david.__set__('npm', npmMock);
			
			var manifest = {
				dependencies: {
					'testDepName': '0.0.1'
				}
			};
			
			david.getUpdatedDependencies(manifest, false, function(err, deps) {
				test.expect(5);
				test.ok(deps);
				test.ok(deps['testDepName']);
				test.strictEqual(deps['testDepName'].required, '0.0.1');
				test.strictEqual(deps['testDepName'].stable, '0.0.3');
				test.strictEqual(deps['testDepName'].latest, '0.0.3');
				test.done();
			});
		},
		testGetUpdatedDepsUnstable: function(test) {
			
			var npmData = {
				'0.1.4+build.11.e0f985a': {
					versions: ['0.0.1', '0.1.2', '0.1.3', '0.1.4+build.11.e0f985a']
				}
			};
			
			// Mock out NPM
			var npmMock = {
				load: function(config, callback) {
					callback();
				},
				commands: {
					view: function(args, callback) {
						if(args[0] == 'testDepName') {
							callback(null, npmData);
						} else {
							callback(new Error(), null);
						}
					}
				}
			};
			
			david.__set__('npm', npmMock);
			
			var manifest = {
				dependencies: {
					'testDepName': '~0.0.1'
				}
			};
			
			david.getUpdatedDependencies(manifest, false, function(err, deps) {
				test.expect(5);
				test.ok(deps);
				test.ok(deps['testDepName']);
				test.strictEqual(deps['testDepName'].required, '~0.0.1');
				test.strictEqual(deps['testDepName'].stable, '0.1.3');
				test.strictEqual(deps['testDepName'].latest, '0.1.4+build.11.e0f985a');
				test.done();
			});
		}
	};
})();