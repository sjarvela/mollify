/**
 * mainview.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
!function($, _gm) {

	"use strict";
	
	_gm.ui.views.MainView = function(_m) {
		this.id = "main";

		var that = this;
		this._mainFileView = false;
		this._mainConfigView = false;
		this._views = [];
		this._currentView = false;
		
		this.init = function($c, viewId) {
			that._mainFileView = new _gm.ui.views.main.FileView(_m);
			that._mainConfigView = new _gm.ui.views.main.ConfigView(_m);
			that._views = [ this._mainFileView, this._mainConfigView ];

			$.each(_m.plugins.getMainViewPlugins(), function(i, p) {
				if (!p.mainViewHandler) return;
				var view = p.mainViewHandler();
				that._views.push(view);
			});
			
			that.itemContext = new _gm.ui.components.ItemContext(_m);
			return _m.dom.loadContentInto($c, _m.templates.url("mainview.html"), function() {
				that.onLoad(viewId);
			}, ['localize']);			
		}
		
		this.onLoad = function(viewId) {
			$(window).resize(that.onResize);
			that.onResize();

			_m.dom.template("mollify-tmpl-main-username", _m.session).appendTo("#mollify-mainview-user");
			if (_m.session.user) {
				_m.ui.controls.dropdown({
					element: $('#mollify-username-dropdown'),
					items: that.getSessionActions()
				});
			}
			
			var menuitems = [];
			$.each(that._views, function(i, v) {
				v.init(that);
				menuitems.push({ icon: v.icon, title: v.title });
			});
			
			var $mb = $("#mollify-mainview-menu");
			var $mbitems = _m.dom.template("mollify-tmpl-main-menubar", menuitems).appendTo($mb);
			$mbitems.click(function() {
				var i = $mbitems.index($(this));
				that.activateView(that._views[i]);
			});
			
			if (that._views.length > 0) {
				var view = false;
				if (viewId) {
					view = that._findView(viewId[0]);
					viewId = viewId.slice(1);
					if (viewId.length === 0 || (viewId.length == 1 && viewId[0] === "")) viewId = false;
				}
				if (!view) {
					view = that._views[0];
					viewId = false;
				}
				that.activateView(view, viewId);
			}
		};
		
		this._findView = function(id) {
			var found = false;
			$.each(that._views, function(i, v) {
				if (v.viewId == id) {
					found = v;
					return false;
				}
			});
			return found;
		};
		
		this.onRestoreView = function(id) {
			var viewId = id[0];
			if (that._currentView && that._currentView.id == viewId) {
				that._currentView.onRestoreView(id.slice(1));
			} else {
				var view = that._findView(viewId);
				if (view) {
					viewId = id.slice(1);
					if (viewId.length === 0 || (viewId.length == 1 && viewId[0] === "")) viewId = false;
					that.activateView(view, viewId);
				}
			}
		};
		
		this.activateView = function(v, id) {			
			_m.ui.hideActivePopup();
			if (that._currentView && that._currentView.onDeactivate) that._currentView.onDeactivate();
			$("#mollify-mainview-navlist-parent").empty();

			that._currentView = v;
			
			$("#mollify-mainview-navbar").empty();
			v.onActivate({
				id: id,
				content: $("#mollify-mainview-viewcontent").empty(),
				tools: $("#mollify-mainview-viewtools").empty(),
				addNavBar: that.addNavBar,
				mainview: that,
				fileview: that._mainFileView
			});
			var $mnu = $("#mollify-mainview-menu");
			var $items = $mnu.find(".mollify-mainview-menubar-item").removeClass("active");
			var i = that._views.indexOf(v);
			$($items.get(i)).addClass("active");
		};
		
		this.onNotification = function(spec) {
			var $trg = (spec && spec.target) ? ((typeof spec.target === 'string') ? $("#"+spec.target) : spec.target) : $("#mollify-mainview-content");
			var $ntf = _m.dom.template("mollify-tmpl-main-notification", spec).hide().appendTo($trg).fadeIn(300);
			setTimeout(function() {
				$ntf.fadeOut(300);
				setTimeout($ntf.remove, 300);
				if (spec["on-finish"]) spec["on-finish"]();
			}, spec.time | 3000);

			return true;
		};
		
		this.getActiveView = function() {
			return that._currentView;
		};
		
		this.addNavBar = function(nb) {
			var $nb = _m.dom.template("mollify-tmpl-main-navbar", nb).appendTo($("#mollify-mainview-navlist-parent"));
			var items = nb.items;
			var initItems = function() {
				var $items = $nb.find(".mollify-mainview-navbar-item");
				if (nb.classes) $items.addClass(nb.classes);
				if (nb.dropdown) {
					$items.each(function(i, e) {
						var item = items[$items.index(this)];
						var $tr = $('<li class="mollify-mainview-navbar-dropdown"><a href="#" class="dropdown-toggle"><i class="icon-cog"></i></a></li>').appendTo($(e));
						var dropdownItems = [];
						if (typeof(nb.dropdown.items) != 'function') dropdownItems = nb.dropdown.items;
						_m.ui.controls.dropdown({
							element: $tr,
							items: dropdownItems,
							onShow: function(api, menuItems) {
								if (menuItems.length > 0) return;
								if (typeof(nb.dropdown.items) == 'function') {
									api.items(nb.dropdown.items(item.obj));
								}
							}
						});
					});
				}
				$items.click(function() {
					var item = items[$items.index(this)];
					if (item.callback) item.callback();
				});
				if (nb.onRender) nb.onRender($nb, $items, function($e) {
					var ind = $items.index($e);
					return items[ind].obj;
				});
			};
			initItems();
			return {
				element: $nb,
				setActive : function(o) {
					var $items = $nb.find(".mollify-mainview-navbar-item");
					$items.removeClass("active");
					if (!o) return;
					$.each($items, function(i, itm) {
						var obj = items[i].obj;
						if (!obj) return;

						var match = window.def(o.id) ? o.id == obj.id : o == obj;
						if (match) {
							$(itm).addClass("active");
							return false;
						}
					});
				},
				update : function(l) {
					items = l;
					$nb.find(".mollify-mainview-navbar-item").remove();
					_m.dom.template("mollify-tmpl-main-navbar-item", items).appendTo($nb);
					initItems();
				}
			};
		}
		
		this.onResize = function() {
			if (that._currentView) that._currentView.onResize();
		}
		
		this.getSessionActions = function() {
			var actions = [];		
			if (_m.features.hasFeature('change_password') && _m.session.user.hasPermission("change_password")) {
				actions.push({"title-key" : "mainViewChangePasswordTitle", callback: that.changePassword});
				actions.push({"title" : "-"});
			}
			actions.push({"title-key" : "mainViewLogoutTitle", callback: that.onLogout});
			return actions;
		}
		
		this.onLogout = function() {
			_m.service.post("session/logout").done(function(s) {
				_m.events.dispatch('session/end');
			});
		}
		
		this.changePassword = function() {	
			var $dlg = false;
			var $old = false;
			var $new1 = false;
			var $new2 = false;
			var errorTextMissing = _m.ui.texts.get('mainviewChangePasswordErrorValueMissing');
			var errorConfirm = _m.ui.texts.get('mainviewChangePasswordErrorConfirm');

			var doChangePassword = function(oldPw, newPw, successCb) {
				_m.service.put("configuration/users/current/password/", {old:window.Base64.encode(oldPw), "new": window.Base64.encode(newPw) }).done(function(r) {
					successCb();
					_m.ui.dialogs.notification({message:_m.ui.texts.get('mainviewChangePasswordSuccess')});
				}).fail(function(e) {
					this.handled = true;
					if (e.code == 107) {
						_m.ui.dialogs.notification({message:_m.ui.texts.get('mainviewChangePasswordError'), type: 'error', cls: 'full', target: $dlg.find(".modal-footer")});
					} else this.handled = false;
				});
			}
			
			_m.ui.dialogs.custom({
				title: _m.ui.texts.get('mainviewChangePasswordTitle'),
				content: $("#mollify-tmpl-main-changepassword").tmpl({message: _m.ui.texts.get('mainviewChangePasswordMessage')}),
				buttons: [
					{ id: "yes", "title": _m.ui.texts.get('mainviewChangePasswordAction'), cls: "btn-primary" },
					{ id: "no", "title": _m.ui.texts.get('dialogCancel') }
				],
				"on-button": function(btn, d) {
					var old = false;
					var new1 = false;
					var new2 = false;
					
					if (btn.id === 'yes') {
						$dlg.find(".control-group").removeClass("error");
						$dlg.find(".help-inline").text("");
						
						// check
						old = $old.find("input").val();
						new1 = $new1.find("input").val();
						new2 = $new2.find("input").val();
						
						if (!old) {
							$old.addClass("error");
							$old.find(".help-inline").text(errorTextMissing);
						}
						if (!new1) {
							$new1.addClass("error");
							$new1.find(".help-inline").text(errorTextMissing);
						}
						if (!new2) {
							$new2.addClass("error");
							$new2.find(".help-inline").text(errorTextMissing);
						}
						if (new1 && new2 && new1 != new2) {
							$new1.addClass("error");
							$new2.addClass("error");
							$new1.find(".help-inline").text(errorConfirm);
							$new2.find(".help-inline").text(errorConfirm);
						}
						if (!old || !new1 || !new2 || new1 != new2) return;
					}

					if (btn.id === 'yes') doChangePassword(old, new1, d.close);
					else d.close();
				},
				"on-show": function(h, $d) {
					$dlg = $d;
					$old = $("#mollify-mainview-changepassword-old");
					$new1 = $("#mollify-mainview-changepassword-new1");
					$new2 = $("#mollify-mainview-changepassword-new2");
					
					$old.find("input").focus();
				}
			});
		}
	}
	
}(window.jQuery, window.mollify);