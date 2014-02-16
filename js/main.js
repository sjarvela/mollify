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
                		view.id = k;
                		mainViews.push(view);

                		var navItem = {
                			view: view
                		};
            			if (view.ui) {
            				navItem.titleKey = view.ui.titleKey;
            				if (view.ui.fa) navItem.fa = view.ui.fa;
            			} else {
            				navItem.titleKey = 'main.view.'+view.id;
            			}
                		navItems.push(navItem);
                	});
                    return {
                    	views: mainViews,
                        navItems: navItems,
                        sessionActions: [{
                            title: "todo"
                        }]
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
                            var path = this.get('controllers.application.currentPath');
                            // first is "main", second is the current view
                            var id = path.split(".")[1];
                            var found = false;
                            $.each(this.get('navItems'), function(i, item) {
                                if (item.view.id == id) {
                                    found = item;
                                    return false;
                                }
                            });
                            return found;
                        }.property('controllers.application.currentPath')
                    });
                },

                setup: function(App) {
                    Ember.Handlebars.registerBoundHelper('val', function(value, prop, localized) {
                        if (!value) return "";
                        var v = value;
                        if (prop) v = value[prop];
                        
                        if (localized) return Ember.I18n.t(v);
                        return new Handlebars.SafeString(v);
                    });

                    App.HeaderNavMenuComponent = Ember.Component.extend({
                        tagName: 'li',
                        classNames: ['dropdown'],
                        titleProperty: false,
                        titleLocalized: false,
                        actions: {
                            select: function(item) {
                                this.sendAction("select", item);
                            }
                        }
                    });
                }
            }
        }
    });
    /*window.mollify.registerModule({
		name: 'main',
		template: 'main',
		composite: true,
		model: function() {
			return {
			};
		},
		controller: function() {
			return Ember.ObjectController.extend({});
		},
		defaultChild: 'files'
	});*/
}(window.jQuery, window.mollify);
