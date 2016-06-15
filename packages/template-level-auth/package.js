Package.describe({
	name: 'convexset:template-level-auth',
	version: '0.1.0_4',
	summary: 'A reactive template-level authentication layer',
	git: 'https://github.com/convexset/meteor-template-level-auth',
	documentation: '../../README.md'
});


Package.onUse(function(api) {
	api.versionsFrom('1.3.1');

	api.use(
		[
			'ecmascript', 'ejson',
			'tmeasday:check-npm-versions@0.3.1'
		],
		'client');

	api.addFiles(['template-level-auth.js'], 'client');
	api.export('TemplateLevelAuth');
});


Package.onTest(function(api) {
	api.use(['tinytest', 'ecmascript', 'ejson', ]);
	api.use('convexset:template-level-auth');
	api.addFiles(['tests.js', ]);
	api.addFiles([], 'server');
	api.addFiles([], 'client');
});