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

                ui: {
                    titleKey: 'config-view.title',
                    fa: 'fa-cog'
                },

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
                        this.transitionTo("account");
                    }
                },

                setup: function(App) {
                }
            },

            // account config view
            account: {
                parent: "config",
                template: 'config/account',
                path: "/account",
                requiresAuthentication: true,

                model: function() {
                    return {};
                },
                controller: function() {
                    return Ember.ObjectController.extend({
                        needs: ['main', 'config']
                    });
                }
            }
        }
    });
}(window.jQuery, window.mollify);
