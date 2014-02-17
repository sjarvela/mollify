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
        actions: {
            logout: {
                titleKey: 'actions.session.logout',
                fa: 'fa-sign-out',
                type: 'session',
                isApplicable: function(ctx) {
                    return !!this.session.user; //can logout if there is user
                },
                handler: function() {
                    var that = this;
                    this.service.post("session/logout").done(function(s) {
                        that.events.dispatch('session/end');
                    });
                }
            }
        },

        // module setup
        setup: function(App) {
            App.FaIconComponent = Ember.Component.extend({
                tagName: 'i',
                classNames: ['fa']
            });
        }
    });
}(window.jQuery, window.mollify);
