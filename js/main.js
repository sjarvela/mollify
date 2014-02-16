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
                    },
                    goto: function(p, id) {
                    	this.transitionTo(p);
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
                    		path: 'files'
                    	}, {
                    		title: 'config',
                    		path: 'config'
                    	}]
                    };
                },
                controller: function(details) {
                    return Ember.ObjectController.extend({
                    });
                },

                setup: function(App) {
                    App.HeaderNavMenuComponent = Ember.Component.extend({
                    	tagName: 'li',
                    	classes: ['dropdown'],
                        actions: {
                        	select: function(item) {
                        		this.sendAction("goto", item.path);
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
