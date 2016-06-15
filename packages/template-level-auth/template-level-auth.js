/* global TemplateLevelAuth: true */

import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';
checkNpmVersions({
  'package-utils': '^0.2.1'
});
const PackageUtilities = require('package-utils');

TemplateLevelAuth = (function() {
	var _tla = function TemplateLevelAuth() {};
	var tla = new _tla();

	// Debug Mode
	var _debugMode = false;
	PackageUtilities.addPropertyGetterAndSetter(tla, "DEBUG_MODE", {
		get: () => _debugMode,
		set: (value) => {
			_debugMode = !!value;
		},
	});

	PackageUtilities.addImmutablePropertyFunction(tla, "addAuth", function addAuth(tmpls, options = {}) {
		options = _.extend({
			authCheck: (instance) => true,
			followUp: (instance, outcome) => (void 0),
			firstCheckOnCreated: true,
		}, options);

		if (!_.isArray(tmpls)) {
			tmpls = [tmpls];
		}

		tmpls.forEach(function(tmpl) {
			var hook = (options.firstCheckOnCreated) ? "onCreated" : "onRendered";
			tmpl[hook](function() {
				var instance = this;
				instance.autorun(function() {
					if (_debugMode) {
						console.log('[TemplateLevelAuth] Running check for ' + instance.view.name, options);
					}
					var authOutput = options.authCheck(instance);
					if (_debugMode) {
						console.log('[TemplateLevelAuth] Outcome for ' + instance.view.name, authOutput);
					}
					options.followUp(instance, authOutput);
				});
			});
		});
	});

	return tla;
})();