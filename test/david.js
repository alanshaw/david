(function() {
	
	"use strict";
	
	var moment = require('moment');
	var rewire = require('rewire');
	var david = rewire('../david');
	
	david.setCacheDuration(moment.duration({days: -1}));
	
	function mockNpm(versions, depName) {
		
		depName = depName || 'testDepName';
		
		var npmData = {};
		
		npmData[versions[versions.length - 1]] = {versions: versions};
		
		// Mock out NPM
		return {
			load: function(config, callback) {
				callback();
			},
			commands: {
				view: function(args, callback) {
					if(args[0] == depName) {
						callback(null, npmData);
					} else {
						callback(new Error(), null);
					}
				}
			}
		};
	}
	
	module.exports = {
		'Test getDependencies returns an empty object when passed a manifest with no dependencies': function(test) {
			
			test.expect(3);
			
			david.getDependencies({}, function(err, deps) {
				test.equal(err, null);
				test.ok(deps);
				test.strictEqual(Object.keys(deps).length, 0);
				test.done();
			});
		},
		'Test getUpdatedDependencies returns an empty object when passed a manifest with no dependencies': function(test) {
			
			test.expect(3);
			
			david.getUpdatedDependencies({}, false, function(err, deps) {
				test.equal(err, null);
				test.ok(deps);
				test.strictEqual(Object.keys(deps).length, 0);
				test.done();
			});
		},
		'Test getDependencies returns desired result when only stable versions are available': function(test) {
			
			var npmMock = mockNpm(['0.0.1', '0.0.2', '0.0.3']);
			
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
		'Test getDependencies returns correct result when both stable and unstable versions are available': function(test) {
			
			var npmMock = mockNpm(['0.0.1', '0.0.2', '0.0.3', '0.0.4-beta']);
			
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
		'Test getUpdatedDependencies returns an empty object when there are no updated stable or unstable dependencies available': function(test) {
			
			var npmMock = mockNpm(['0.0.1', '0.0.2', '0.0.3']);
			
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
		'Test getUpdatedDependencies returns correct dependency updates when only stable updates are available': function(test) {
			
			var npmMock = mockNpm(['0.0.1', '0.0.2', '0.0.3']);
			
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
		'Test getUpdatedDependencies returns correct dependency updates when both unstable and stable updates are available': function(test) {
			
			var npmMock = mockNpm(['0.0.1', '0.1.2', '0.1.3', '0.1.4+build.11.e0f985a']);
			
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
		},
		'Positive getUpdatedDependencies onlyStable=true tests': function(test) {
			
			var dataSets = [
				// [array of versions, required range, expected stable version]
				[['0.6.0', '0.6.1-1', '0.7.0'], '~0.6.1-1', '0.7.0'],
				[['0.0.1', '0.1.0', '0.1.3-beta', '0.1.3', '0.2.0'], '~0.1.3', '0.2.0'],
				[['0.0.1', '0.1.0', '0.1.3-beta', '0.1.3', '0.2.0'], '~0.0.1', '0.2.0'],
				[['0.0.1', '0.1.0', '0.1.3-beta', '0.1.3', '0.2.0'], '0.0.x', '0.2.0'],
				[['0.0.1', '0.1.0', '0.1.3-beta', '0.1.3', '0.2.0'], '0.0.1 || 0.1.3', '0.2.0'],
				[['0.0.1', '0.1.0', '0.1.3-beta', '0.1.3', '0.2.0'], '<0.1.0 || 0.1.3', '0.2.0'],
				[['0.1.3', '0.2.0-pre'], '0.1.2', '0.1.3']
			];
			
			test.expect(5 * dataSets.length);
			
			var done = 0;
			var tests = [];
			
			dataSets.forEach(function(data, i) {
				
				tests.push(function() {
					
					var testDepName = 'testDepName' + i;
					var npmMock = mockNpm(data[0], testDepName);
					
					david.__set__('npm', npmMock);
					
					var manifest = {dependencies: {}};
					
					manifest.dependencies[testDepName] = data[1];
					
					david.getUpdatedDependencies(manifest, true, function(err, deps) {
						
						test.ok(deps);
						test.ok(deps[testDepName]);
						test.strictEqual(deps[testDepName].required, data[1]);
						test.strictEqual(deps[testDepName].stable, data[2]);
						test.strictEqual(deps[testDepName].latest, data[0][data[0].length - 1]);
						
						done++;
						
						if(done == dataSets.length) {
							test.done();
						} else {
							tests[done]();
						}
					});
				});
			});
			
			tests[0]();
		},
		'Negative getUpdatedDependencies onlyStable=true tests': function(test) {
			
			var dataSets = [
				[['0.6.0', '0.6.1-1'], '~0.6.1-1'],
				[['0.6.0'], '~0.6.0'],
				[['0.5.0'], '~0.6.0'],
				[[], '~0.6.0'],
				[['0.0.1-beta', '0.0.1', '0.0.2', '0.3.0-pre'], '~0.3.0'],
				[['0.0.1-beta', '0.0.1', '0.0.2', '0.3.0-pre'], 'latest'],
				[['0.0.1-beta', '0.0.1', '0.0.2', '0.3.0-pre'], '*'],
				[['0.0.1', '0.1.4+build.11.e0f985a'], ''],
				[['0.0.1'], '>=0.0.1'],
				[['0.0.1', '0.0.2', '0.0.3', '0.0.4'], '<=0.0.2 || >0.0.4'],
				[['0.0.1', '0.0.2', '0.0.3', '0.0.4'], '<=0.0.2 || ~0.0.4'],
				[['0.0.1', '0.0.2', '0.0.3', '0.0.4', '0.1.0beta'], '<=0.0.2 || ~0.0.4']
				
			];
			
			test.expect(3 * dataSets.length);
			
			var done = 0;
			var tests = [];
			
			dataSets.forEach(function(data, i) {
				
				tests.push(function() {
					
					var npmMock = mockNpm(data[0], 'testDepName' + i);
					
					david.__set__('npm', npmMock);
					
					var manifest = {dependencies: {}};
					
					manifest.dependencies['testDepName' + i] = data[1];
					
					david.getUpdatedDependencies(manifest, true, function(err, deps) {
						
						test.ok(deps);
						test.equal(deps['testDepName' + i], undefined);
						test.strictEqual(Object.keys(deps).length, 0);
						
						done++;
						
						if(done == dataSets.length) {
							test.done();
						} else {
							tests[done]();
						}
					});
				});
			});
			
			tests[0]();
		}
	};
})();