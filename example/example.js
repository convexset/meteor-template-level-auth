/* global FlowRouterTree: true */
/* global FlowRouter: true */
/* global TemplateLevelAuth: true */

var openNode = FlowRouterTree.createNode({
	name: 'open',
	path: '',
	params: {
		layout: "MainLayout",
		content: "Open",
	},
	actionFactory: FlowRouterTree.SampleParameterizedActions.blazeLayoutRenderOneComponent,
});

FlowRouterTree.createNode({
	parent: openNode,
	name: 'secure',
	path: 'secure',
	params: {
		content: "Secure",
	},
});

var THE_ID = '-the-only-item-';
var TheCollection = new Mongo.Collection("col");
if (Meteor.isServer) {
	TheCollection.remove({});
	TheCollection.insert({
		_id: THE_ID,
		isAuthorized: true
	});

	Meteor.methods({
		"auth-me": function() {
			TheCollection.update(THE_ID, {
				$set: {
					isAuthorized: true
				}
			});
			console.info("[" + (new Date()) + "] auth-me");
		},
		"unauth-me": function() {
			TheCollection.update(THE_ID, {
				$set: {
					isAuthorized: false
				}
			});
			console.info("[" + (new Date()) + "] unauth-me");
		},
	});
}

function isAuthorized() {
	var userRecord = TheCollection.findOne(THE_ID);
	return !!userRecord && userRecord.isAuthorized || false;
}

if (Meteor.isClient) {

	Template.registerHelper('isAuthorized', isAuthorized);

	[Template.Open, Template.Secure].forEach(function(tmpl) {
		tmpl.events({
			'click button.auth': function () {
				Meteor.call("auth-me");
			},
			'click button.deauth': function () {
				Meteor.call("unauth-me");
			},
		});
	});

	TemplateLevelAuth.addAuth(
		Template.Secure, {
			authCheck: isAuthorized,
			followUp: function processOutcome(instance, isAuthorized) {
				if (!isAuthorized) {
					console.error("Not authorized!");
					window.alert("Not authorized!");
					setTimeout(() => FlowRouter.go("open"), 0);
				}
			},
			firstCheckOnCreated: true,
		}
	);
}