/**
 * login.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

!function($, mollify) {
	mollify.registerModule({
		name: 'login',
		template: 'login',
		model: function() {
			return {
				username: "",
				password: "",
				remember: false,
				resetEmail: 'todo'
			};
		},
		setup: function(App) {
			App.LoginTestModalController = Ember.Controller.extend({
				actions: {
					close: function() {
						return this.send('closeModal');
					}
				}
			});
		},
		controller: function() {
			return Ember.ObjectController.extend({				
				showReset : false,
				actions: {
					toggleReset: function(){
				        this.toggleProperty("showReset");
				    },
				    reset: function() {
						alert("reset");
				    },
					login: function() {
						var that = this;
		
						//TODO validation
						var username = this.get('username');
						var password = this.get('password');
						var remember = this.get('remember');
						
						this._m.service.post("session/authenticate/", {username: username, password: window.Base64.encode(password), remember: remember}).done(function(s) {
							that._m.events.dispatch('session/start', s);
	
							// forward to next view						
							var previousTransition = that.get('previousTransition');
							if (previousTransition) {
								that.set('previousTransition', null);
								previousTransition.retry();
							} else {
								that.transitionToRoute('index');
							}
						}).fail(function(e) {
							if (e.code == 107) this.handled = true;
							console.log("error");
							//that.showLoginError();
						});
					}
				}
			});
		}
	});
}(window.jQuery, window.mollify);

/*window.mollify.modules.push(function($, App) {
	window.mollify.registerModule('login', function() {
		
	});
	App.Router.map(function() {
		this.route("login");
	});
	
	App.LoginRoute = Ember.Route.extend({
		model: function() {
			return "foo";
		}
	})
});*/

/*!function($, _gm) {

	"use strict";
	
	_gm.ui.views.LoginView = function(_m) {
		this._init('login', _m);
	};
	
	// extend base view
	_gm.ui.views.LoginView.prototype = $.extend({}, _gm.ui.views.Base.prototype, {
		constructor : _gm.ui.views.LoginView,
		init : function($c) {
			var that = this;
			return this.loadContent($c, "loginview.html", ["localize", "bubble"], that).done(function() {
				if (that._m.features.hasFeature('lost_password')) $("#mollify-login-forgot-password").show();
				if (that._m.features.hasFeature('registration') && that._m.plugins.exists("plugin-registration")) {
					$("#mollify-login-register").click(function() {
						that._m.plugins.get("plugin-registration").show();
					}).show();
				}
	
				$("#mollify-login-name, #mollify-login-password").bind('keypress', function(e) {
					if ((e.keyCode || e.which) == 13) that.onLogin();
				});
				$("#mollify-login-button").click(that.onLogin);
				$("#mollify-login-name").focus();				
			});
		},
		
		onShowBubble : function(id, bubble) {
			if (id === 'mollify-login-forgot-password') {
				$("#mollify-login-forgot-button").click(function() {				
					var email = $("#mollify-login-forgot-email").val();
					if (!email) return;
					
					bubble.hide();
					that.wait = this.showWait("mollify-login-main");
					that.onResetPassword(email);
				});

				$("#mollify-login-forgot-email").val("").focus();
			}
		},
		
		onLogin : function() {
			var that = this;
			var username = $("#mollify-login-name").val();
			var password = $("#mollify-login-password").val();
			var remember = $("#mollify-login-remember-cb").is(':checked');
			
			if (!username || username.length < 1) {
				$("#mollify-login-name").focus();
				return;
			}
			if (!password || password.length < 1) {
				$("#mollify-login-password").focus();
				return;
			}
			this.wait = this.showWait("mollify-login-main");
			this._m.service.post("session/authenticate/", {username: username, password: window.Base64.encode(password), remember: remember}).done(function(s) {
				that._m.events.dispatch('session/start', s);
			}).fail(function(e) {
				if (e.code == 107) this.handled = true;
				that.showLoginError();
			});
		},
		
		onResetPassword : function(email) {
			var that = this;
			this._m.service.post("lostpassword", {"email": email}).done(function(r) {
				that.wait.close();
				
				that._m.ui.dialogs.notification({
					message: _m.ui.texts.get('resetPasswordPopupResetSuccess')
				});
			}).fail(function(e) {
				this.handled = true;
				that.wait.close();
				
				that._m.ui.dialogs.info({
					message: _m.ui.texts.get('resetPasswordPopupResetFailed')
				});
			});
		},
		
		showLoginError : function() {
			that.wait.close();
			
			_m.ui.dialogs.notification({
				message: _m.ui.texts.get('loginDialogLoginFailedMessage')
			});
		}
	});
}(window.jQuery, window.mollify);*/