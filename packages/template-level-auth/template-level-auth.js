/* global TemplateLevelAuth: true */
/* global PackageUtilities: true */

TemplateLevelAuth = (function() {
	var _tla = function TemplateLevelAuth() {};
	var tla = new _tla();

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
					var authOutput = options.authCheck(instance);
					options.followUp(instance, authOutput);
				});
			});
		});
	});

	return tla;
})();