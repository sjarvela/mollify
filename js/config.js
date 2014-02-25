/**
 * files.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

! function($, mollify) {
    mollify.registerModule({
        views: {
            // config parent view
            config: {
                templateFile: 'config',
                template: 'config',
                parent: "main",
                path: "/config",
                requiresAuthentication: true,

                ui: {
                    titleKey: 'config-view.title',
                    fa: 'fa-cog'
                },

                render: function(_m, c, m) {
                    this.render('config');
                    this.render('config-header-nav-items', {
                        into: 'main',
                        outlet: 'header-nav'
                    });
                },
                model: function() {
                    var that = this;

                    // get config views and create nav items
                    var configViews = this.ui.views.get("main/config");
                    var navItems = [];
                    configViews.forEach(function(view) {
                        var navItem = {
                            view: view
                        };
                        if (view.ui) {
                            navItem.titleKey = view.ui.titleKey;
                            if (view.ui.fa) navItem.fa = view.ui.fa;
                        } else {
                            navItem.titleKey = 'config.' + view.id + ".title";
                        }
                        navItems.push(navItem);
                    });

                    return {
                        navItems: navItems,
                        views: configViews
                    };
                },
                controller: function() {
                    return Ember.ObjectController.extend({
                        needs: ['application'],
                        actions: {
                            selectConfigView: function(mv) {
                                this.transitionToRoute(mv.view.id);
                            }
                        },
                        currentView: function() {
                            // first is "main", second is "config", and third is the current view
                            var id = this.get('controllers.application').getCurrentPath(3);
                            var found = false;
                            var items = this.get('navItems');
                            $.each(items, function(i, item) {
                                if (item.view.id == id) {
                                    found = item;
                                    return false;
                                }
                            });
                            return found;
                        }.property('controllers.application.currentPath')
                    });
                },
                index: {
                    before: function(_m, transition) {
                        this.transitionTo("account");
                    }
                }
            },

            // account config view
            account: {
                parent: "config",
                template: 'config/account',
                path: "/account",
                requiresAuthentication: true,

                ui: {
                    titleKey: 'config-view.account.title',
                    fa: 'fa-user'
                },

                model: function() {
                    return {};
                },
                controller: function() {
                    return Ember.ObjectController.extend({
                        needs: ['main', 'config']
                    });
                }
            },

            // user admin view
            users: {
                parent: "config",
                template: 'config/users',
                path: "/users",
                requiresAdmin: true,

                ui: {
                    titleKey: 'config-view.users.title',
                    fa: 'fa-users'
                },

                model: function() {
                    return this.service.get('configuration/users');
                },
                controller: function() {
                    return Ember.ObjectController.extend({
                        needs: ['main', 'config'],
                        actions: {
                            colAction: function(col, user) {
                                window.alert("edit "+user.id);
                            }
                        },
                        cols: [{
                            id: 'id',
                            titleKey: 'config-view.list.id'
                        }, {
                            id: 'name',
                            titleKey: 'config-view.users.list.name'
                        }, {
                            id: 'edit',
                            type: 'action',
                            action: 'edit',
                            actionTitle: 'foo'
                        }]
                    });
                }
            }
        },

        setup: function(App) {
            App.ConfigListComponent = Ember.Component.extend({
                tagName: 'table',
                actions: {
                    colAction: function(col, item) {
                        this.sendAction("colAction", col, item);
                    }
                }
            });
            App.ConfigListRowComponent = Ember.Component.extend({
                tagName: 'tr',
                actions: {
                    colAction: function(col, item) {
                        this.sendAction("colAction", col, item);
                    }
                }
            });
            App.ConfigListCellComponent = Ember.Component.extend({
                tagName: 'td',
                init: function() {
                    this._super();
                    var col = this.get('col');
                    this.set('isAction', 'action' == col.type);
                },
                actions: {
                    doColAction: function() {
                        this.sendAction("colAction", this.get('col'), this.get('item'));
                    }
                }
            });
        }
    });
}(window.jQuery, window.mollify);
