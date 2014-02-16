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
                nameKey: 'config.view.title',
                requiresAuthentication: true,
                requiresAdmin: true,

                model: function() {
                    return {
                    };
                },
                controller: function() {
                    return Ember.ObjectController.extend({
                        actions: {
                        }
                    });
                },
                index: {
                    before: function(_m, transition) {
                        //this.transitionTo("item", _m.filesystem.roots[0].id);
                    }
                },

                setup: function(App) {
                }
            }
        }
    });
}(window.jQuery, window.mollify);
