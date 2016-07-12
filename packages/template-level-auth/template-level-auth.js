/* global TemplateLevelAuth: true */

import {
	checkNpmVersions
}
from 'meteor/tmeasday:check-npm-versions';
checkNpmVersions({
	'package-utils': '^0.2.1',
	'underscore': '^1.8.3',
});
const PackageUtilities = require('package-utils');
const _ = require('underscore');

import {
	AccessCheck
}
from "meteor/convexset:access-check";

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
			authCheck: () => true, // (instance) => true,
			followUp: function() {}, // (instance, outcome) => (void 0),
			firstCheckOnCreated: true,
			accessChecks: (void 0) // See: https://atmospherejs.com/convexset/access-check
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

					var accessChecksPassed;
					if (!!options.accessChecks) {
						var context = {
							contextType: "template-level-auth",
							templateInstance: instance
						};
						accessChecksPassed = true;

						options.accessChecks
							.map(o => typeof o === "string" ? {
								name: o
							} : o)
							.forEach(function runCheck({
								name,
								argumentMap = x => x,
								params = (void 0)
							}) {
								var outcome;
								if (_debugMode) {
									console.log(`[TemplateLevelAuth] Running AccessCheck ${name} for ${instance.view.name}...`);
								}
								try {
									outcome = AccessCheck.executeCheck.call(context, {
										checkName: name,
										where: AccessCheck.CLIENT_ONLY,
										params: argumentMap(_.isFunction(params) ? params.call(context) : params),
										executeFailureCallback: false
									});
									if (_debugMode) {
										console.log(`[TemplateLevelAuth] AccessCheck ${name} for ${instance.view.name} returns ${outcome}.`);
									}
								} catch (e) {
									if (_debugMode) {
										console.log(`[TemplateLevelAuth] AccessCheck ${name} for ${instance.view.name} throws exception ${e}, AccessChecks fails (accessChecksPassed = false).`);
									}
									accessChecksPassed = false;
								}
								if (outcome && outcome.checkDone && !outcome.result) {
									accessChecksPassed = false;
								}
							});
					}
					if (_debugMode) {
						console.log(`[TemplateLevelAuth] Access checks passed for ${instance.view.name}: ${accessChecksPassed}`);
					}

					options.followUp(instance, authOutput, accessChecksPassed);
				});
			});
		});
	});

	return tla;
})();