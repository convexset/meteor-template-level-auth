# TemplateLevelAuth

A simple package for fine-grained template-level authentication. Executes an "authentication check" function at `onCreated` or `onRendered` and passes the outcome to a "follow up" function to process the outcome. The check-process duo is run reactively with changes in the "reactive dependencies" of "authentication check function".

Have a look at the example app to see how the package works.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Install](#install)
- [Usage](#usage)
- [An Extended Example](#an-extended-example)
- [The `accessChecks` key: Using convexset:access-check](#the-accesschecks-key-using-convexsetaccess-check)
- [Additional Implementation Notes](#additional-implementation-notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Install

This is available as [`convexset:template-level-auth`](https://atmospherejs.com/convexset/template-level-auth) on [Atmosphere](https://atmospherejs.com/). (Install with `meteor add convexset:template-level-auth`.)

If you get an error message like:
```
WARNING: npm peer requirements not installed:
 - package-utils@^0.2.1 not installed.
          
Read more about installing npm peer dependencies:
  http://guide.meteor.com/using-packages.html#peer-npm-dependencies
```
It is because, by design, the package does not include instances of these from `npm` to avoid repetition. (In this case, `meteor npm install --save package-utils` will deal with the problem.)

See [this](http://guide.meteor.com/using-packages.html#peer-npm-dependencies) or [this](https://atmospherejs.com/tmeasday/check-npm-versions) for more information.

Now, if you see a message like
```
WARNING: npm peer requirements not installed:
underscore@1.5.2 installed, underscore@^1.8.3 needed
```
it is because you or something you are using is using Meteor's cruddy old `underscore` package. Install a new version from `npm`. (And, of course, you may use the `npm` version in a given scope via `require("underscore")`.)


## Usage

By way of documentation by example:

```javascript
TemplateLevelAuth.addAuth(
    Template.AdministerUsers,
    {
        authCheck: function getRightsReactively(instance) {
            if (!UserRecordCollectionSubscription.ready()) {
                return true;  // provisionally pass user pending data arrival
            }
            // get user profile
            var userRecord = UserRecordCollection.findOne({
                userId: Meteor.userId()
            });
            if (!!userRecord && _.isArray(userRecord.rights)) {
                return userRecord.rights;
            } else {
                return [];
            }
        },
        followUp: function processOutcome(instance, rights) {
            // check if rights list contains "ADMINISTER_USERS"
            // route away and/or something if not
            if (rights.indexOf("ADMINISTER_USERS") === -1) {
                MyMessageDisplayer.queue("error", "Unauthorized");
                MyFancyRouter.go("somewhere-else");
            }
        },
        firstCheckOnCreated: true,  // (default: true)
    }
);
```

Noting that authentication checks are run reactively, in the above example, if a user who was originally authorized has rights revoked while on the above template, once MiniMongo is updated, the user will be unceremoniously booted "somewhere-else" via the follow up function.

Since authentication checks may be common across templates, the first parameter may be specified as an array of templates. Also, multiple `addAuth` calls may target the same template.

```javascript
TemplateLevelAuth.addAuth(
    [Template.EditItemDetail, Template.ShowInventoryState],
    {
        authCheck: function getRightsReactively(instance) {
            // may rely a bit more extensively on subscriptions,
            // route params and even instance data (possibly set onCreated,
            // necessitating checking at onRendered)

            /*
                check for subscriptions being ready and return true if not
                to give user a chance at possibly being authorized
            */

            var itemId = MyFancyRouter.getParam('itemId');

            var userRecord = UserRecordCollection.findOne({
                userId: Meteor.userId()
            });
            var item = ItemCollection.findOne(itemId);
            
            if (!!userRecord && !!item && (userRecord.managementRights.indexOf(item.category) !== -1)) {
                return {
                    authorized: true
                };
            } else {
                return {
                    authorized: false,
                    managementRights: userRecord.managementRights,
                    itemCategory: item.category
                };
            }
        },
        followUp: function processOutcome(instance, outcome) {
            // route away and/or something if not
            // ... also possibly mutate template instance state
            // ... and template instance state may be used in the authorization
            //     determination
            if (!outcome.authorized) {
                MyMessageDisplayer.queue("error", "Not allowed to manage item.");
                MyFancyRouter.go("somewhere-else");
                instance.isAuthorized.set(true);
            } else {
                instance.isAuthorized.set(false);
            }
        },
        firstCheckOnCreated: false,  // run first check onRendered
    }
);
```

Note that it is intended, in the vast majority of use cases, that when a user is authorized, the "follow up" function does nothing.

## An Extended Example

This example comes from a MVP application and demonstrates intended usage. It is simple syntactic sugar around `TemplateLevelAuth.addAuth`. The example includes a simple `followUp` function which does nothing if authorized/provisionally-allowed-to-stick-around (outcome is `true`) and boots the user to a pre-defined route if definitively unauthorized.

The authentication checks below are a (short-circuited) chain of reactive checks.

 - Actual check (e.g.: is logged in via `!!Meteor.userId()`)
 - Conditions for provisionally allowing the user to stick around, e.g.:
   * is logging in (via: `Meteor.loggingIn()`)
   * subscriptions to publication providing authentication information not yet ready

One might consider evaluating all terms if avoiding short-circuiting is necessary (i.e.: for all reactive deps to be registered on first run) in one's use case. Below, the first term is the actual check, and the later terms are conditions for waiting to "take action".

```javascript
var AUTH_CHECK = {
    IS_LOGGED_IN: function IS_LOGGED_IN() {
        return !!Meteor.userId() || Meteor.loggingIn();
    },
    IS_STAFF: function tla_isStaff() {
        return APlusAuth.currUserHasRight("staff") || Meteor.loggingIn();
    },
    IS_ADMIN: function tla_isAdmin() {
        return APlusAuth.currUserHasRight(APlusAuth.OVERALL_ADMIN_RIGHTS) || Meteor.loggingIn();
    },
    IS_AFFILIATED_TO_COURSE: function tla_hasSomeAccessForCurrentCourse(instance) {
        return APlusViewData.hasSomeAccessForCurrentCourse() || defaultCoursePubNotReadyYet() || Meteor.loggingIn();
    },
    IS_STUDENT_IN_COURSE: function tla_hasStudentAccessInCurrentCourse(instance) {
        return APlusViewData.hasStudentAccessInCurrentCourse() || defaultCoursePubNotReadyYet() || Meteor.loggingIn();
    },
    IS_EDUCATOR_IN_COURSE: function tla_hasEducatorAccessInCurrentCourse(instance) {
        return APlusViewData.hasEducatorAccessInCurrentCourse() || defaultCoursePubNotReadyYet() || Meteor.loggingIn();
    },
    IS_COORDINATOR_IN_COURSE: function tla_hasCoordinatorAccessForCurrentCourse(instance) {
        return APlusViewData.hasCoordinatorAccessForCurrentCourse() || defaultCoursePubNotReadyYet() || Meteor.loggingIn();
    },
    IS_EDUCATOR_OR_COORDINATOR_IN_COURSE: function tla_hasEducatorOrCoordinatorAccessForCurrentCourse(instance) {
        return APlusViewData.hasEducatorOrCoordinatorAccessForCurrentCourse() || defaultCoursePubNotReadyYet() || Meteor.loggingIn();
    },
};

function imposeTemplateLevelAuth(tmplNames, options = {}) {
    options = _.extend({
        authenticationCheck: AUTH_CHECK.IS_LOGGED_IN,
        unauthorizedMessage: null,
        redirectRouteName: 'dashboard',
        firstCheckOnCreated: true
    }, options);

    if (!_.isFunction(options.authenticationCheck)) {
        throw new Meteor.Error('invalid-auth-check');
    }

    if (!_.isArray(tmplNames)) {
        tmplNames = [tmplNames];
    }

    if (Meteor.isClient) {
        TemplateLevelAuth.addAuth(
            tmplNames.map(name => Template[name]), {
                authCheck: options.authenticationCheck,
                followUp: function processOutcome(instance, authorized) {
                    if (!authorized) {
                        if (typeof options.unauthorizedMessage === "string") {
                            sAlertQueue.enqueue('error', options.unauthorizedMessage);
                        }
                        setTimeout(function() {
                            FlowRouter.go(FlowRouter.path(options.redirectRouteName));  
                        }, 0);
                    }
                },
                firstCheckOnCreated: options.firstCheckOnCreated,
            }
        );
    }
}
```

... and this is used as follows:
```javascript
imposeTemplateLevelAuth("ViewNotes", {
    authenticationCheck: AUTH_CHECK.IS_AFFILIATED_TO_COURSE,
    unauthorizedMessage: "Unauthorized: Not affiliated to course.",
});

imposeTemplateLevelAuth("EditNotes", {
    authenticationCheck: AUTH_CHECK.IS_EDUCATOR_OR_COORDINATOR_IN_COURSE,
    unauthorizedMessage: "Unauthorized: No instructor access in course.",
});
```


## The `accessChecks` key: Using [convexset:access-check](https://atmospherejs.com/convexset/access-check)

Use the same syntax as access checks for Meteor Methods and Publications in [convexset:access-check](https://atmospherejs.com/convexset/access-check#meteor-methods-and-publications) apply (via the `accessChecks` key).

The `where` sub-key is ignored, however and set to refer to the client.

Generally speaking, client-side failure callbacks should result in routing to a page which the current user is more likely to be authorized to be on. For example, access controls on a restricted route/template might boot an unauthorized user to the "main user dashboard" (MUD?) and access controls on the MUD might boot an unauthorized user to the login page (where probably no access controls apply except perhaps geographical ones by IP address, in which case...)

Access checks are run reactively along with the usual authCheck. Failure call backs are **not** run. It will be the role of `followUp` to handle the... "follow up".

If access checks are used, a third argument is also added to the `followUp` callback. It will be a boolean reporting whether all access checks have passed.

Checks will be invoked with the following context (i.e.: "`this`").
```javascript
{
    contextType: "template-level-auth",
    templateInstance: templateInstance
}
```
where `templateInstance` is the relevant template instance.

If we were to use the first example:

Everywhere...
```javascript
import { AccessCheck } from "meteor/convexset:access-check";

AccessCheck.registerCheck({
    checkName: "user-is-signed-in"
    checkFunction: function () {
        if (Meteor.isClient) {
            if (!UserRecordCollectionSubscription.ready()) {
                return true;  // provisionally pass user pending data arrival
            }
        }

        // get user profile
        var userRecord = UserRecordCollection.findOne({
            userId: Meteor.userId()
        });
        if (!!userRecord && _.isArray(userRecord.rights)) {
            return userRecord.rights.indexOf("ADMINISTER_USERS") !== -1;
        } else {
            return false;
        }
    },
    defaultSite: AccessCheck.EVERYWHERE
});
```
On the client...
```javascript
TemplateLevelAuth.addAuth(
    Template.AdministerUsers,
    {
        accessChecks: ["user-is-admin"],
        followUp: function processOutcome(instance, unusedArgFrom_authCheck, allAccessChecksPassed) {
            // route away if not all access-checks pass
            if (!allAccessChecksPassed) {
                MyMessageDisplayer.queue("error", "Unauthorized");
                MyFancyRouter.go("somewhere-else");
            }
        },
        firstCheckOnCreated: true,  // (default: true)
    }
);
```
Note that the original check (`authCheck`) defaults to `() => true` and does not really do anything for us. The action happens with `accessChecks`.

For checks that take parameters, do the following:
```javascript
TemplateLevelAuth.addAuth(
    Template.AdministerUsers,
    {
        accessChecks: [{
            name: "my-check-name",
            params: {route: "administer-users-route?"} // defaults to: undefined,
            // alternatively pass params as a function and it will be invoked
            // with the above context
            // { contextType: "template-level-auth", templateInstance: templateInstance}
            // to yield parameters

            // the below is only useful in the case where the parameters should
            // be transformed once more 
            argumentMap: p => p.route // defaults to: x => x,
        }],
        followUp: function processOutcome(instance, unusedArgFrom_authCheck, allAccessChecksPassed) {
            // route away if not all access-checks pass
            if (!allAccessChecksPassed) {
                MyMessageDisplayer.queue("error", "Unauthorized");
                MyFancyRouter.go("somewhere-else");
            }
        },
        firstCheckOnCreated: true,  // (default: true)
    }
);
```


## Additional Implementation Notes

Authentication checks (via both `authCheck` and `accessChecks`) generally require data. Using `convexset:template-level-subs-cache` with a template adds the following reactive function that reports whether **ALL** relevant subscriptions are ready:
```javascript
templateInstance.cachedSubscription.allSubsReady()
```
This can be used as a screening tool for provisionally passing the user (and re-running the checks when everything is ready).

But bear in mind that when a publication sets `this.error(/* some Meteor.Error */)`, the respective subscription never becomes ready, possibly leaving the user with a free pass.

It is generally advisable that templates be wrapped with an additional "loading" block helper to display nothing prior to the arrival of all relevant data. See [this](https://github.com/convexset/meteor-template-level-subs-cache/#decorators-in-javascript-and-blaze) for more information.