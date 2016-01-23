# TemplateLevelAuth

A simple package for fine-grained template-level authentication. Executes an "authentication check" function at `onCreated` or `onRendered` and passes the outcome to a "follow up" function to process the outcome. The check-process duo is run reactively with changes in the "reactive dependencies" of "authentication check function".

Have a look at the example app to see how the package works.

## Table of Contents

- [Install](#install)
- [Usage](#usage)

## Install

This is available as [`convexset:template-level-auth`](https://atmospherejs.com/convexset/template-level-auth) on [Atmosphere](https://atmospherejs.com/). (Install with `meteor add convexset:template-level-auth`.)

## Usage

By way of documentation by example:

```javascript
TemplateLevelAuth.addAuth(
    Template.AdministerUsers,
    {
        authCheck: function getRightsReactively(instance) {
            // get user profile
            var userRecord = UserRecordCollection.findOne({
                userId: Meteor.userId()
            });
            if (!!userRecord && _.isArray(userRecord.rights) {
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

