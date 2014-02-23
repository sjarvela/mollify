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
                index: 999, //always last
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
                handler: function() {
                    this.openModal('core-change-password');
                }
            },

            download: {
                titleKey: 'actions.filesystem.download',
                type: 'filesystem-item',
                isApplicable: function(item) {
                    return true;	//TODO permissions
                },
                handler: function(item) {
                    window.alert(item.id);
                }
            },

            copy: {
                titleKey: 'actions.filesystem.copy',
                type: 'filesystem-item',
                isApplicable: function(item) {
                    return true;	//TODO permissions
                },
                handler: function(item) {
                    window.alert(item.id);
                }
            }
        },

        // module setup
        setup: function(App) {
            // font awesome icon component
            App.FaIconComponent = Ember.Component.extend({
                tagName: 'i',
                classNames: ['fa']
            });

            // change password
            App.CoreChangePasswordController = Ember.ObjectController.extend({
                titleKey: 'change-password.title',
                content: {
                    oldPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                    error: false
                },
                buttons: [{
                    titleKey: 'change-password.change-action',
                    clicked: 'change'
                }, {
                    titleKey: 'dialogs.cancel',
                    dismiss: 'modal'
                }],
                actions: {
                    change: function() {
                        var that = this;
                        var oldPw = this.get('oldPassword');
                        var newPw = this.get('newPassword');
                        var confirmPw = this.get('confirmPassword');
                        if (!oldPw || oldPw.length === 0 || !newPw || newPw.length === 0 || !confirmPw || confirmPw.length === 0) return;
                        if (newPw != confirmPw) return;
                        that.set('error', false);

                        this._m.service.put("configuration/users/current/password/", {
                            old: window.Base64.encode(oldPw),
                            "new": window.Base64.encode(newPw)
                        }).done(function(r) {
                            that.modal.close();
                            that._m.ui.notification.success(that._m.ui.texts.get('change-password.success'));
                        }).fail(function(e) {
                            this.handled = true;
                            if (e.code == 107) {
                                that.set('error', that._m.ui.texts.get('change-password.failure'));
                            } else this.handled = false;
                        });
                    }
                }
            });
        }
    });
}(window.jQuery, window.mollify);
