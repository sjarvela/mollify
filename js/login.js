/**
 * login.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

! function($, mollify) {
    mollify.registerModule({
        views: {
            login: {
                templateFile: 'login',
                template: 'login',
                path: "/login",

                model: function() {
                    return {
                        username: "",
                        password: "",
                        remember: false,
                        resetEmail: '',
                        showReset: false
                    };
                },
                before: function(_m, transition) {
                    if (_m.session.user)
                        this.transitionTo('files');
                },
                controller: function() {
                    return Ember.ObjectController.extend({
                        actions: {
                            reset: function(c) {
                                var email = this.get('resetEmail');
                                if (!email) return;

                                var that = this;
                                this.set('showReset', false);
                                this._m.service.post("lostpassword", {
                                    "email": email
                                }).done(function(r) {
                                    that.set('resetEmail', '');
                                    Bootstrap.NM.push(Ember.I18n.t('login.reset-password.success'));
                                }).fail(function(e) {
                                    this.handled = true;
                                    Bootstrap.NM.push(Ember.I18n.t('login.reset-password.failure'));
                                });
                            },
                            login: function() {
                                var that = this;

                                //TODO validation
                                var username = this.get('username');
                                var password = this.get('password');
                                if (!username || !password) return;

                                var remember = this.get('remember');

                                this._m.service.post("session/authenticate/", {
                                    username: username,
                                    password: window.Base64.encode(password),
                                    remember: remember
                                }).done(function(s) {
                                    that._m.events.dispatch('session/start', s);

                                    // forward to next view						
                                    var previousTransition = that._m.session._loginTransition; //that.get('previousTransition');
                                    if (previousTransition) {
                                        this._m.session._loginTransition = null; //that.set('previousTransition', null);
                                        previousTransition.retry();
                                    } else {
                                        this.transitionTo('files');
                                    }
                                }).fail(function(e) {
                                    if (e.code == 107) this.handled = true;
                                    Bootstrap.NM.push(Ember.I18n.t('login.failure'));
                                });
                            }
                        }
                    });
                }
            }
        }
    });
}(window.jQuery, window.mollify);
