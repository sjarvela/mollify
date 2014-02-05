/**
 * loginview.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

!function($, _gm) {

	"use strict";
	
	_gm.views.LoginView = function(_m){
		this.id = "login";
		
		var that = this;
		
		that.init = function($c) {
			return _m.dom.loadContentInto($c, _m.templates.url("loginview.html"), that, ['localize', 'bubble']);
		}
		
		that.onLoad = function() {
			if (_m.features.hasFeature('lost_password')) $("#mollify-login-forgot-password").show();
			if (_m.features.hasFeature('registration') && _m.plugins.exists("plugin-registration")) {
				$("#mollify-login-register").click(function() {
					_m.plugins.get("plugin-registration").show();
				}).show();
			}

			$("#mollify-login-name, #mollify-login-password").bind('keypress', function(e) {
				if ((e.keyCode || e.which) == 13) that.onLogin();
			});
			$("#mollify-login-button").click(that.onLogin);
			$("#mollify-login-name").focus();
		}
		
		that.onRenderBubble = function(id, bubble) {
		}
		
		that.onShowBubble = function(id, bubble) {
			if (id === 'mollify-login-forgot-password') {
				$("#mollify-login-forgot-button").click(function() {				
					var email = $("#mollify-login-forgot-email").val();
					if (!email) return;
					
					bubble.hide();
					that.wait = _m.ui.dialogs.wait({target: "mollify-login-main"});
					that.onResetPassword(email);
				});

				$("#mollify-login-forgot-email").val("").focus();
			}
		}
		
		that.onLogin = function() {
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
			that.wait = _m.ui.dialogs.wait({target: "mollify-login-main"});
			_m.service.post("session/authenticate/", {username: username, password: window.Base64.encode(password), remember: remember}).done(function(s) {
				_m.events.dispatch('session/start', s);
			}).fail(function(e) {
				if (e.code == 107) this.handled = true;
				that.showLoginError();
			});
		}
		
		that.onResetPassword = function(email) {
			_m.service.post("lostpassword", {"email": email}).done(function(r) {
				that.wait.close();
				
				_m.ui.dialogs.notification({
					message: _m.ui.texts.get('resetPasswordPopupResetSuccess')
				});
			}).fail(function(e) {
				this.handled = true;
				that.wait.close();
				
				_m.ui.dialogs.info({
					message: _m.ui.texts.get('resetPasswordPopupResetFailed')
				});
			});
		}
		
		that.showLoginError = function() {
			that.wait.close();
			
			_m.ui.dialogs.notification({
				message: _m.ui.texts.get('loginDialogLoginFailedMessage')
			});
		}
	};
}(window.jQuery, window.mollify);