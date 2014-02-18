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
                handler: function() {
                    var model = {
                        oldPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                    };
                    var buttons = [{
                        title: this._m.ui.texts.get('change-password.change-action'),
                        clicked: 'change'
                    }, {
                        title: this._m.ui.texts.get('dialogs.cancel'),
                        dismiss: 'modal'
                    }];
                    this.openModal('core-change-password', model, this._m.ui.texts.get('change-password.title'), buttons);
                    /*var controller = this.controllerFor('core-change-password').set('model', {
                        oldPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                    });
                    controller._m = _m;

                    Bootstrap.ModalManager.open('change-password', _m.ui.texts.get('change-password.title'), "core-change-password", [{
                        title: _m.ui.texts.get('change-password.change-action'),
                        clicked: 'change'
                    },{
                        title: _m.ui.texts.get('dialogs.cancel'),
                        dismiss: 'modal'
                    }], controller);*/
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
                        var oldPw = this.get('oldPassword');
                        var newPw = this.get('newPassword');
                        var confirmPw = this.get('confirmPassword');
                        if (!oldPw || oldPw.length === 0 || !newPw || newPw.length === 0 || !confirmPw || confirmPw.length === 0) return;
                        if (newPw != confirmPw) return;

                        this._m.service.put("configuration/users/current/password/", {
                            old: window.Base64.encode(oldPw),
                            "new": window.Base64.encode(newPw)
                        }).done(function(r) {
                            alert("success");
                            //_m.ui.dialogs.notification({message:_m.ui.texts.get('mainviewChangePasswordSuccess')});
                        }).fail(function(e) {
                            this.handled = true;
                            if (e.code == 107) {
                                //_m.ui.dialogs.notification({message:_m.ui.texts.get('mainviewChangePasswordError'), type: 'error', cls: 'full', target: $dlg.find(".modal-footer")});
                            } else this.handled = false;
                        });
                    }
                }
            });
        }
    });
}(window.jQuery, window.mollify);
