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
                    return !!this._m.session.user; //can logout if there is user
                },
                handler: function(_m) {
                    var that = this;
                    this._m.service.post("session/logout").done(function(s) {
                        that._m.events.dispatch('session/end');
                    });
                }
            },

            // change password
            changePassword: {
                titleKey: 'actions.session.change-password',
                fa: 'fa-key',
                type: 'session',
                isApplicable: function(ctx) {
                    return !!this._m.session.user; //can logout if there is user
                },
                handler: function() {
                    this.openModal('core-change-password');
                }
            },

            download: {
                titleKey: 'actions.filesystem.download',
                type: 'filesystem-item',
                isApplicable: function(item) {
                    return this.hasPermission('filesystem_item_access', item, 'r');
                },
                handler: function(item) {
                    window.alert(item.id);
                }
            },

            copy: {
                titleKey: 'actions.filesystem.copy',
                type: 'filesystem-item',
                isApplicable: function(item) {
                    return this.hasPermission('filesystem_item_access', item, 'r');
                },
                handler: function(item) {
                    window.alert(item.id);
                }
            }
        },

        // module setup
        setup: function(App) {
            Ember.Handlebars.registerBoundHelper('val', function(value, options) {
                if (!value) return "";

                var v = value;
                var translate = !! options.hash.translate;
                var prop = options.hash.key;
                if (prop && typeof(prop) == "string") {
                    v = value[prop];
                } else {
                    prop = options.hash.get;
                    if (prop && typeof(prop) == "string" && value.get)
                        v = value.get(prop);
                }

                if (!v) return "";
                if (translate) return Ember.I18n.t(v);
                return new Handlebars.SafeString(v);
            });

            Ember.Handlebars.registerHelper('ifvalue', function(v, options) {
            	var c = options.contexts[0][v];
            	//if (options.hash.value) c = c[options.hash.value];
            	console.log("if " + c + "="+options.hash.matches);
                if (options.hash.matches === c) {
                    return options.fn(this)
                } else {
                    return options.inverse(this);
                }
            });

            // font awesome icon component
            App.FaIconComponent = Ember.Component.extend({
                tagName: 'i',
                classNames: ['fa']
            });

            // change password
            App.CoreErrorController = Ember.ObjectController.extend({
                titleKey: 'error-dialog.title',
                content: {},
                buttons: [{
                    titleKey: 'dialogs.ok',
                    dismiss: 'modal'
                }],
                actions: {}
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
