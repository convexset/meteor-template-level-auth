Package.describe({
	// [validatis:stack]
	name: 'convexset:template-level-auth',
	version: '0.1.2_4',
	summary: 'A reactive template-level authentication layer',
	git: 'https://github.com/convexset/meteor-template-level-auth',
	documentation: '../../README.md'
});


Package.onUse(function setupPackage(api) {
	api.versionsFrom('1.3.1');

	api.use(
		[
			'ecmascript', 'ejson',
			'convexset:access-check@0.1.2_2',
			'tmeasday:check-npm-versions@0.3.1'
		],
		'client');

	api.addFiles(['template-level-auth.js'], 'client');
	api.export('TemplateLevelAuth');
});
