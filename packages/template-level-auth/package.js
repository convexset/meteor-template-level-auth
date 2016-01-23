Package.describe({
	name: 'convexset:template-level-auth',
	version: '0.1.0',
	summary: 'A reactive template-level authentication layer',
	git: 'https://github.com/convexset/meteor-template-level-auth',
	documentation: '../../README.md'
});


Package.onUse(function(api) {
	api.versionsFrom('1.2.0.2');

	api.use(
		[
			'ecmascript', 'underscore', 'ejson',
			'convexset:package-utils@0.1.9',
		],
		'client');

	api.addFiles(['template-level-auth.js'], 'client');
	api.export('TemplateLevelAuth');
});


Package.onTest(function(api) {
	api.use(['tinytest', 'ecmascript', 'underscore', 'ejson', ]);
	api.use('convexset:template-level-auth');
	api.addFiles(['tests.js', ]);
	api.addFiles([], 'server');
	api.addFiles([], 'client');
});