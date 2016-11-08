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
from 'meteor/convexset:access-check';

TemplateLevelAuth = (function() {
	const _tla = function TemplateLevelAuth() {};
	const tla = new _tla();

	// Debug Mode
	/* eslint-disable no-console */
	let _debugMode = false;
	PackageUtilities.addPropertyGetterAndSetter(tla, 'DEBUG_MODE', {
		get: () => _debugMode,
		set: (value) => {
			_debugMode = !!value;
		},
	});

	PackageUtilities.addImmutablePropertyFunction(tla, 'addAuth', function addAuth(tmpls, options = {}) {
		options = _.extend({
			authCheck: () => true, // (instance) => true,
			followUp: function() {}, // (instance, outcome) => (void 0),
			firstCheckOnCreated: true,
			accessChecks: void 0 // See: https://atmospherejs.com/convexset/access-check
		}, options);

		if (!_.isArray(tmpls)) {
			tmpls = [tmpls];
		}

		tmpls.forEach(tmpl => {
			const hook = options.firstCheckOnCreated ? 'onCreated' : 'onRendered';
			tmpl[hook](function() {
				const instance = this;
				instance.autorun(() => {
					if (_debugMode) {
						console.log(`[TemplateLevelAuth] Running check for ${instance.view.name}`, options);
					}

					const authOutput = options.authCheck(instance);
					if (_debugMode) {
						console.log(`[TemplateLevelAuth] Outcome for ${instance.view.name}`, authOutput);
					}

					let allAccessChecksPassed = true;
					const accessChecksOutcomes = {};

					const accessChecksParams = {};
					const exceptions = [];

					if (!!options.accessChecks) {
						const context = {
							contextType: 'template-level-auth',
							templateInstance: instance
						};

						options.accessChecks
							.map(o => typeof o === 'string' ? {
								name: o
							} : o)
							.forEach(function runCheck({
								name,
								argumentMap = x => x,
								params = (void 0)
							}) {
								if (_debugMode) {
									console.log(`[TemplateLevelAuth] Running AccessCheck ${name} for ${instance.view.name}...`);
								}
								try {
									const checkParams = argumentMap(_.isFunction(params) ? params.call(context) : params);
									const outcome = AccessCheck.executeCheck.call(context, {
										checkName: name,
										where: AccessCheck.CLIENT_ONLY,
										params: checkParams,
										executeFailureCallback: false
									});
									accessChecksParams[name] = checkParams;
									accessChecksOutcomes[name] = !!outcome.checkDone && outcome.result;
									if (_debugMode) {
										console.log(`[TemplateLevelAuth] AccessCheck ${name} for ${instance.view.name} returns ${accessChecksOutcomes[name]}.`);
									}
								} catch (e) {
									if (_debugMode) {
										console.log(`[TemplateLevelAuth] AccessCheck ${name} for ${instance.view.name} throws exception ${e}, AccessChecks fails (allAccessChecksPassed = false).`);
									}
									exceptions.push({
										checkName: name,
										exception: e
									});
									accessChecksOutcomes[name] = false;
								}

								allAccessChecksPassed = accessChecksOutcomes[name] && allAccessChecksPassed;
							});
					}
					if (_debugMode) {
						console.log(`[TemplateLevelAuth] All access checks passed for ${instance.view.name}: ${allAccessChecksPassed}`);
					}

					const additionalInformation = {
						accessChecksParams: accessChecksParams,
						templateName: instance.view.name,
					};
					if (exceptions.length > 0) {
						additionalInformation.exceptions = exceptions;
					}
					options.followUp(instance, authOutput, _.extend(accessChecksOutcomes, { __additional_information__: additionalInformation }));
				});
			});
		});
	});

	return tla;
})();
