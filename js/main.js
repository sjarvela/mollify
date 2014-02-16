/**
 * main.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

! function($, mollify) {
    window.mollify.registerModule({
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
                model: function(_m) {
                    return {
                    	navItems: [{
                    		title: 'files',
                    		path: 'files',
                    		fa: 'fa-folder'
                    	}, {
                    		title: 'config',
                    		path: 'config'
                    	}]
                    };
                },
                controller: function() {
                    return Ember.ObjectController.extend({
                    	needs: ['application'],
                    	actions: {
                    		selectMainView: function(mv) {
                    			this.transitionToRoute(mv.path);
                    		}
                    	},
                    	currentView: function() {
                    		var path = this.get('controllers.application.currentPath');
                    		// first is "main", second is the current view
                    		var id = path.split(".")[1];
                    		var found = false;
                    		$.each(this.get('navItems'), function(i, item) {
                    			if (item.path == id) {
                    				found = item;
                    				return false;
                    			}
                    		});
                    		return found;
                    	}.property('controllers.application.currentPath')
                    });
                },

                setup: function(App) {
                    App.HeaderNavMenuComponent = Ember.Component.extend({
                    	tagName: 'li',
                    	classNames: ['dropdown'],
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
