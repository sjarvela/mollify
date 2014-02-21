/**
 * main.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

! function($, mollify) {
    mollify.registerModule({
        views: {
            main: {
                templateFile: 'main',
                template: 'main',
                path: "/",

                routeActions: {
                    showHeadertools: function(name) {
                        return this.render(name, {
                            into: 'main',
                            outlet: 'header-tools'
                        });
                    }
                },

                index: {
                    before: function(_m, transition) {
                        this.transitionTo('files');
                    }
                },

                model: function() {
                    var that = this;

                    // get main views and create nav items
                    var mainViewKeys = mollify.utils.getKeys(this.ui.views.hierarchy.main);
                    var mainViews = [];
                    var navItems = [];
                    $.each(mainViewKeys, function(i, k) {
                        var view = that.ui.views.all[k];
                        mainViews.push(view);

                        var navItem = {
                            view: view
                        };
                        if (view.ui) {
                            navItem.titleKey = view.ui.titleKey;
                            if (view.ui.fa) navItem.fa = view.ui.fa;
                        } else {
                            navItem.titleKey = 'main.view.' + view.id;
                        }
                        navItems.push(navItem);
                    });
                    return {
                        views: mainViews,
                        navItems: navItems,
                        sessionActions: this.actions.getApplicableByType('session')
                    }
                },

                controller: function() {
                    return Ember.ObjectController.extend({
                        needs: ['application'],
                        actions: {
                            selectMainView: function(mv) {
                                this.transitionToRoute(mv.view.id);
                            }
                        },
                        currentView: function() {
                            // first is "main", second is the current view
                            var id = this.get('controllers.application').getCurrentPath(2);

                            //var id = path.split(".")[1];
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
                }
            }
        },

        // module setup
        setup: function(App) {
            Ember.Handlebars.registerBoundHelper('val', function(value, prop) {
                if (!value) return "";
                var v = value;
                var translate = false;
                if (prop && typeof(prop) == "string") {
                    var p = prop.split(":");
                    if (p.length == 1)
                        v = value[prop];
                    else {
                        translate = p[0].startsWith('translate');
                        if (p[0].endsWith('property'))
                            v = value.get(p[1]);
                        else if (p[0].endsWith('key')) v = value[p[1]];
                    }
                }

                if (!v) return "-";
                if (translate) return Ember.I18n.t(v);
                return new Handlebars.SafeString(v);
            });

            App.HeaderNavMenuComponent = Ember.Component.extend({
                tagName: 'li',
                classNames: ['dropdown'],
                titleProperty: false,
                actions: {
                    select: function(item) {
                        this.sendAction("select", item);
                    }
                }
            });
        }
    });
}(window.jQuery, window.mollify);
