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
            // logout
            logout: {
                titleKey: 'actions.session.logout',
                fa: 'fa-sign-out',
                type: 'session',
                isApplicable: function(ctx) {
                    return !!this.session.user; //can logout if there is user
                },
                handler: function(_m) {
                    var that = this;
                    this.service.post("session/logout").done(function(s) {
                        that.events.dispatch('session/end');
                    });
                }
            },

            // change password
            changePassword: {
                titleKey: 'actions.session.change-password',
                fa: 'fa-key',
                type: 'session',
                isApplicable: function(ctx) {
                    return !!this.session.user; //can logout if there is user
                },
                handler: function(_m) {
                    var that = this;
                    var controller = this.controllerFor('core-change-password').set('model', {
                        oldPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                    });

                    Bootstrap.ModalManager.open('change-password', _m.ui.texts.get('change-password.title'), "core-change-password", [{
                        title: _m.ui.texts.get('change-password.change-action'),
                        clicked: 'change'
                    },{
                        title: _m.ui.texts.get('dialogs.cancel'),
                        dismiss: 'modal'
                    }], controller);
                }
            }
        },

        // module setup
        setup: function(App) {
            App.FaIconComponent = Ember.Component.extend({
                tagName: 'i',
                classNames: ['fa']
            });

            App.CoreChangePasswordController = Ember.ObjectController.extend({
                actions: {
                    change: function() {
                        alert("submit");
                    }
                }
            });
        }
    });
}(window.jQuery, window.mollify);
