/*!
 * Mollify v2.4.4 (http://www.mollify.org/)
 * Copyright 2008-2014 Samuli Järvelä
 * Licensed under GPLv2 (http://www.gnu.org/licenses/old-licenses/gpl-2.0.html)
 */

if (typeof jQuery === 'undefined') { throw new Error('Mollify requires jQuery') }

/**
 * configview.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
!function($, mollify) {

	"use strict"; // jshint ;_;

	mollify.view.MainViewConfigView = function() {
		var that = this;
		this.viewId = "admin";
		
		this._views = [];
		this._adminViews = [];
		this._adminViewsLoaded = false;

		this.init = function(mv) {
			that.title = mollify.ui.texts.get('configviewMenuTitle');
			that.icon = "icon-cogs";
			
			that._views.push(new mollify.view.config.user.AccountView(mv));

			$.each(mollify.plugins.getConfigViewPlugins(), function(i, p) {
				if (!p.configViewHandler.views) return;

				var views = p.configViewHandler.views();
				if (!views) return;
				
				$.each(views, function(i, v) {
					if (v.admin)
						that._adminViews.push(v);
					else
						that._views.push(v);
				});
			});
		}

		this.onResize = function() {}

		this.onActivate = function(h) {
			mollify.templates.load("configview", mollify.templates.url("configview.html")).done(function() {				
				mollify.dom.template("mollify-tmpl-configview").appendTo(h.content);
				
				that.showLoading(true);

				var navBarItems = [];
				$.each(that._views, function(i, v) {
					navBarItems.push({title:v.title, obj: v, callback:function(){ that._activateView(v); }})
				});

				that._userNav = h.addNavBar({
					title: mollify.ui.texts.get("configViewUserNavTitle"),
					items: navBarItems
				});

				that.onResize();

				if (mollify.session.user.admin) {
					if (that._adminViewsLoaded) {
						that._initAdminViews(h);
					} else {
						that._adminViewsLoaded = true;
						
						// default admin views
						that._adminViews.unshift(new mollify.view.config.admin.FoldersView());
						that._adminViews.unshift(new mollify.view.config.admin.GroupsView());
						that._adminViews.unshift(new mollify.view.config.admin.UsersView());
												
						var plugins = [];
						for (var k in mollify.session.plugins) {
							if (!mollify.session.plugins[k] || !mollify.session.plugins[k].admin) continue;
							plugins.push(k);
						}
						mollify.admin = {
							plugins : []
						};
						that._loadAdminPlugins(plugins).done(function(){
							that._initAdminViews(h);
						});
					}
				} else {
					that._onInitDone(h);
				}
			});
		}

		this._loadAdminPlugins = function(ids) {
			var df = $.Deferred();
			var l = [];
			l.push(mollify.service.get("configuration/settings").done(function(s) { that._settings = s; }));			
			for (var i=0,j=ids.length;i<j;i++) {
				l.push(mollify.dom.importScript(mollify.plugins.url(ids[i], "plugin.js", true)));
			}
			
			$.when.apply($, l).done(function() {
				var o = [];

				var addView = function(i, v) {
					that._adminViews.push(v);
				};
				for (var pk in mollify.admin.plugins) {
					var p = mollify.admin.plugins[pk];
					if (!p || !p.views) continue;

					if (p.resources && p.resources.texts)
						o.push(mollify.ui.texts.loadPlugin(pk));
					$.each(p.views, addView);
				}

				$.when.apply($, o).done(df.resolve);
			});
			return df;
		};

		this._initAdminViews = function(h) {
			$.each(that._adminViews, function(i, v) {
				if (v.init) v.init(that._settings, that);
			});

			var navBarItems = [];
			$.each(that._adminViews, function(i, v) {
				navBarItems.push({title:v.title, obj: v, callback:function(){ that._activateView(v, true); }})
			});

			that._adminNav = h.addNavBar({
				title: mollify.ui.texts.get("configViewAdminNavTitle"),
				items: navBarItems
			});
			
			that._onInitDone(h);
		};
		
		this._findView = function(id) {
			var found = false;
			$.each(that._views, function(i, v) {
				if (v.viewId == id) {
					found = { view: v, admin: false };
					return false;
				}
			});
			if (!found)
				$.each(that._adminViews, function(i, v) {
					if (v.viewId == id) {
						found = { view: v, admin: true };
						return false;
					}
				});

			return found;
		};
		
		this._onInitDone = function(h) {
			if (h.id) {
				var view = that._findView(h.id[0]);
				if (view) that._activateView(view.view, view.admin);
			} else
				that._activateView(that._views[0]);			
		}

		this.onRestoreView = function(id) {
			var view = that._findView(id[0]);
			if (view) that._activateView(view.view, view.admin, true);
		};

		this._activateView = function(v, admin, noStore) {
			if (that._activeView) {
				if (that._activeView.onDeactivate) that._activeView.onDeactivate();
				if (that._adminNav) that._adminNav.setActive(false);
				that._userNav.setActive(false);
			}
			if (admin) that._adminNav.setActive(v);
			else that._userNav.setActive(v);

			that.showLoading(false);
			
			that._activeView = v;
			if (!noStore && that._activeView.viewId) mollify.App.storeView("admin/"+that._activeView.viewId);
			$("#mollify-configview-header").html(v.title);
			v.onActivate(that._getContentElement().empty(), that);
		}
		
		this._getContentElement = function() {
			return $("#mollify-configview-content");
		}

		this.onDeactivate = function() {
			if (that._activeView && that._activeView.onDeactivate) that._activeView.onDeactivate();
		}
		
		this.showLoading = function(s) {
			if (s) that._getContentElement().find(".mollify-configlistview").addClass("loading");
			else that._getContentElement().find(".mollify-configlistview").removeClass("loading");
		}
	}

	mollify.view.ConfigListView = function($e, o) {
		mollify.dom.template("mollify-tmpl-configlistview", {title: o.title, actions: o.actions || false}).appendTo($e);
		var $table = $e.find(".mollify-configlistview-table");
		var table = mollify.ui.controls.table($table, o.table);
		var enableAction = function(id, e) {
			if (e)
				$e.find("#mollify-configlistview-action-"+id).removeClass("disabled");
			else
				$e.find("#mollify-configlistview-action-"+id).addClass("disabled");
		};
		if (o.actions) {
			$.each(o.actions, function(i, a) {
				if (a.depends) enableAction(a.id, false);
				if (a.tooltip) mollify.ui.controls.tooltip($("#mollify-configlistview-action-" + a.id), { title: a.tooltip });
			});
			
			table.onSelectionChanged(function() {
				var sel = table.getSelected();
				var any = sel.length > 0;
				var one = sel.length == 1;
				var many = sel.length > 1;
				$.each(o.actions, function(i, a) {
					if (!a.depends) return;
					if (a.depends == "table-selection") enableAction(a.id, any);
					else if (a.depends == "table-selection-one") enableAction(a.id, one);
					else if (a.depends == "table-selection-many") enableAction(a.id, many);
				});
			});
			$e.find(".mollify-configlistview-actions > .mollify-configlistview-action").click(function() {
				if ($(this).hasClass("disabled")) return;
				var action = $(this).tmplItem().data;
				if (!action.callback) return;
				
				var p;
				if (action.depends && action.depends.startsWith("table-selection")) p = table.getSelected();
				action.callback(p);
			});
		}

		return {
			table: table,
			enableAction: enableAction
		};
	}

	mollify.view.config = {
		user: {},
		admin: {}
	};

	/* Account */
	mollify.view.config.user.AccountView = function(mv) {
		var that = this;
		this.viewId = "account";
		this.title = mollify.ui.texts.get("configUserAccountNavTitle");

		this.onActivate = function($c) {
			mollify.dom.template("mollify-tmpl-config-useraccountview", mollify.session).appendTo($c);
			mollify.ui.process($c, ["localize"]);
			$("#user-account-change-password-btn").click(mv.changePassword);
		}
	}

	/* Users */
	mollify.view.config.admin.UsersView = function() {
		var that = this;
		this.viewId = "users";
		
		this.init = function(opt, cv) {
			that._cv = cv;
			that.title = mollify.ui.texts.get("configAdminUsersNavTitle");
	
			that._authenticationOptions = opt.authentication_methods;
			that._authFormatter = function(am) { return am; /* TODO */ }
			that._defaultAuthMethod = opt.authentication_methods[0];
			that._langFormatter = function(l) { return mollify.ui.texts.get('language_'+l); }
		}
		
		this.onActivate = function($c) {
			var users = false;
			var listView = false;
			that._details = mollify.ui.controls.slidePanel($("#mollify-mainview-viewcontent"), { resizable: true });
			
			var getQueryParams = function(i) {
				var params = { criteria: {} };
				
				var name = $("#mollify-admin-user-searchoptions-name").val();
				if (name && name.length > 0) params.criteria.name = name;

				var email = $("#mollify-admin-user-searchoptions-email").val();
				if (email && email.length > 0) params.criteria.email = email;
				
				return params;
			}
			
			var refresh = function() {
				that._cv.showLoading(true);
				listView.table.refresh().done(function(){ that._cv.showLoading(false); });
			};
			
			var updateUsers = function() {
				that._details.hide();
				refresh();
			};
						
			listView = new mollify.view.ConfigListView($c, {
				actions: [
					{ id: "action-add", content:'<i class="icon-plus"></i>', callback: function() { that.onAddEditUser(false, updateUsers); }},
					{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
						mollify.ui.dialogs.confirmation({
							title: mollify.ui.texts.get("configAdminUsersRemoveUsersConfirmationTitle"),
							message: mollify.ui.texts.get("configAdminUsersRemoveUsersConfirmationMessage", [sel.length]),
							callback: function() { that._removeUsers(sel).done(updateUsers); }
						});
					}},
					{ id: "action-refresh", content:'<i class="icon-refresh"></i>', callback: refresh }
				],
				table: {
					id: "config-admin-users",
					key: "id",
					narrow: true,
					hilight: true,
					remote: {
						path : "configuration/users/query",
						paging: { max: 50 },
						queryParams: getQueryParams,
						onLoad: function(pr) { $c.addClass("loading"); pr.done(function() { $c.removeClass("loading"); }); }
					},
					columns: [
						{ type:"selectrow" },
						{ id: "icon", title:"", type:"static", content: '<i class="icon-user"></i>' },
						{ id: "name", title: mollify.ui.texts.get('configAdminUsersNameTitle'), sortable: true },
						{ id: "user_type", title: mollify.ui.texts.get('configAdminUsersTypeTitle'), sortable: true, valueMapper: function(item, type) {
							if (type == null) return mollify.ui.texts.get("configAdminUsersTypeNormal");
							return mollify.ui.texts.get("configAdminUsersType_"+type.toLowerCase());
						} },
						{ id: "email", title: mollify.ui.texts.get('configAdminUsersEmailTitle'), sortable: true },
						{ id: "edit", title: mollify.ui.texts.get('configAdminActionEditTitle'), type: "action", content: '<i class="icon-edit"></i>' },
						{ id: "pw", title:mollify.ui.texts.get('configAdminUsersActionChangePasswordTitle'), type: "action", content:'<i class="icon-key"></i>' },
						{ id: "remove", title: mollify.ui.texts.get('configAdminActionRemoveTitle'), type: "action", content: '<i class="icon-trash"></i>' }
					],
					onRowAction: function(id, u) {
						if (id == "edit") {
							mollify.service.get("configuration/users/"+u.id).done(function(user){
								that.onAddEditUser(user, updateUsers);
							});
						} else if (id == "pw") {
							that.onChangePassword(u);
						} else if (id == "remove") {
							mollify.ui.dialogs.confirmation({
								title: mollify.ui.texts.get("configAdminUsersRemoveUserConfirmationTitle"),
								message: mollify.ui.texts.get("configAdminUsersRemoveUserConfirmationMessage", [u.name]),
								callback: function() { mollify.service.del("configuration/users/"+u.id).done(updateUsers); }
							});
						}
					},
					onHilight: function(u) {
						if (u) {
							that._showUserDetails(u, that._details.getContentElement().empty(), that._allGroups, that._allFolders);
							that._details.show(false, 400);
						} else {
							that._details.hide();
						}
					}
				}
			});

			that._cv.showLoading(true);
						
			var $options = $c.find(".mollify-configlistview-options");
			mollify.dom.template("mollify-tmpl-config-admin-user-searchoptions").appendTo($options);
			mollify.ui.process($options, ["localize"]);

			var gp = mollify.service.get("configuration/usergroups").done(function(g) {
				that._allGroups = g;
			});
			var fp = mollify.service.get("configuration/folders").done(function(f) {
				that._allFolders = f;
			});
			$.when(gp, fp).done(refresh);
		}
		
		this.onChangePassword = function(u, cb) {
			var $content = false;
			var $name = false;
			var $password = false;
			
			mollify.ui.dialogs.custom({
				resizable: true,
				initSize: [600, 200],
				title: mollify.ui.texts.get('configAdminUsersChangePasswordDialogTitle', u.name),
				content: mollify.dom.template("mollify-tmpl-config-admin-userchangepassworddialog", {user: u}),
				buttons: [
					{ id: "yes", "title": mollify.ui.texts.get('dialogSave') },
					{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
				],
				"on-button": function(btn, d) {
					if (btn.id == 'no') {
						d.close();
						return;
					}
					
					var password = $password.val();
					if (!password || password.length === 0) return;
					
					mollify.service.put("configuration/users/"+u.id+"/password", {"new": window.Base64.encode(password)}).done(d.close).done(cb);
				},
				"on-show": function(h, $d) {
					$("#change-password-title").text(mollify.ui.texts.get('configAdminUsersChangePasswordTitle', u.name));
					
					$content = $d.find("#mollify-config-admin-userchangepassworddialog-content");
					$password = $d.find("#passwordField");
					$("#generatePasswordBtn").click(function(){ $password.val(that._generatePassword()); return false; });
					
					$password.focus();	
					h.center();
				}
			});
		};

		this.onDeactivate = function() {
			that._details.remove();
		};

		this._showUserDetails = function(u, $e, allGroups, allFolders) {
			mollify.dom.template("mollify-tmpl-config-admin-userdetails", {user: u}).appendTo($e);
			mollify.ui.process($e, ["localize"]);
			var $groups = $e.find(".mollify-config-admin-userdetails-groups");
			var $folders = $e.find(".mollify-config-admin-userdetails-folders");
			var foldersView = false;
			var groupsView = false;
			var permissionsView = false;
			var folders = false;
			var groups = false;
			
			var updateGroups = function() {
				$groups.addClass("loading");
				mollify.service.get("configuration/users/"+u.id+"/groups/").done(function(l) {
					$groups.removeClass("loading");
					groups = l;
					groupsView.table.set(groups);
				});
			};
			var updateFolders = function() {
				$folders.addClass("loading");
				mollify.service.get("configuration/users/"+u.id+"/folders/").done(function(l) {
					$folders.removeClass("loading");
					folders = l;
					foldersView.table.set(folders);
				});
			};
			var onAddUserFolders = function() {
				var currentIds = mollify.helpers.extractValue(folders, "id");
				var selectable = mollify.helpers.filter(allFolders, function(f) { return currentIds.indexOf(f.id) < 0; });
				//if (selectable.length === 0) return;

				mollify.ui.dialogs.select({
					title: mollify.ui.texts.get('configAdminUserAddFolderTitle'),
					message: mollify.ui.texts.get('configAdminUserAddFolderMessage'),
					key: "id",
					initSize: [600, 400],
					columns: [
						{ id: "icon", title:"", type:"static", content: '<i class="icon-folder"></i>' },
						{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
						{ id: "name", title: mollify.ui.texts.get('configAdminUsersFolderDefaultNameTitle') },
						{ id: "user_name", title: mollify.ui.texts.get('configAdminUsersFolderNameTitle'), type:"input" },
						{ id: "path", title: mollify.ui.texts.get('configAdminFoldersPathTitle') }
					],
					list: selectable,
					onSelect: function(sel, o) {
						var folders = [];
						$.each(sel, function(i, f) {
							var folder = {id: f.id};
							var name = o[f.id] ? o[f.id].user_name : false;
							if (name && f.name != name)
									folder.name = name;
							folders.push(folder);
						});
						mollify.service.post("configuration/users/"+u.id+"/folders/", folders).done(updateFolders);
					}
				});
			};
			var onAddUserGroups = function() {
				var currentIds = mollify.helpers.extractValue(groups, "id");
				var selectable = mollify.helpers.filter(allGroups, function(f) { return currentIds.indexOf(f.id) < 0; });
				//if (selectable.length === 0) return;

				mollify.ui.dialogs.select({
					title: mollify.ui.texts.get('configAdminUserAddGroupTitle'),
					message: mollify.ui.texts.get('configAdminUserAddGroupMessage'),
					key: "id",
					initSize: [600, 400],
					columns: [
						{ id: "icon", title:"", type:"static", content: '<i class="icon-folder"></i>' },
						{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
						{ id: "name", title: mollify.ui.texts.get('configAdminUsersGroupNameTitle') },
						{ id: "description", title: mollify.ui.texts.get('configAdminGroupsDescriptionTitle') }
					],
					list: selectable,
					onSelect: function(sel, o) {
						mollify.service.post("configuration/users/"+u.id+"/groups/", mollify.helpers.extractValue(sel, "id")).done(updateGroups);
					}
				});
			};

			foldersView = new mollify.view.ConfigListView($e.find(".mollify-config-admin-userdetails-folders"), {
				title: mollify.ui.texts.get('configAdminUsersFoldersTitle'),
				actions: [
					{ id: "action-add", content:'<i class="icon-plus"></i>', callback: onAddUserFolders },
					{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
						mollify.service.del("configuration/users/"+u.id+"/folders/", { ids: mollify.helpers.extractValue(sel, "id") }).done(updateFolders);
					}}
				],
				table: {
					id: "config-admin-userfolders",
					key: "id",
					narrow: true,
					columns: [
						{ type:"selectrow" },
						{ id: "icon", title:"", type:"static", content: '<i class="icon-folder"></i>' },
						{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
						{ id: "name", title: mollify.ui.texts.get('configAdminUsersFolderNameTitle'), formatter: function(f, v) {
							var n = f.name;
							if (n && n.length > 0) return n;
							return mollify.ui.texts.get('configAdminUsersFolderDefaultName', f.default_name);
						} },
						{ id: "path", title: mollify.ui.texts.get('configAdminFoldersPathTitle') },
						{ id: "remove", title: mollify.ui.texts.get('configAdminActionRemoveTitle'), type: "action", content: '<i class="icon-trash"></i>' }
					],
					onRowAction: function(id, f) {
						if (id == "remove") {
							mollify.service.del("configuration/users/"+u.id+"/folders/"+f.id).done(updateFolders);
						}
					}
				}
			});

			groupsView = new mollify.view.ConfigListView($e.find(".mollify-config-admin-userdetails-groups"), {
				title: mollify.ui.texts.get('configAdminUsersGroupsTitle'),
				actions: [
					{ id: "action-add", content:'<i class="icon-plus"></i>', callback: onAddUserGroups },
					{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
						mollify.service.del("configuration/users/"+u.id+"/groups/", { ids: mollify.helpers.extractValue(sel, "id") }).done(updateGroups);
					}}
				],
				table: {
					id: "config-admin-usergroups",
					key: "id",
					narrow: true,
					columns: [
						{ type:"selectrow" },
						{ id: "icon", title:"", type:"static", content: '<i class="icon-user"></i>' },
						{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
						{ id: "name", title: mollify.ui.texts.get('configAdminUsersGroupNameTitle') },
						{ id: "remove", title: mollify.ui.texts.get('configAdminActionRemoveTitle'), type: "action", content: '<i class="icon-trash"></i>' }
					],
					onRowAction: function(id, g) {
						if (id == "remove") {
							mollify.service.del("configuration/users/"+u.id+"/groups/"+g.id).done(updateGroups);
						}
					}
				}
			});
			
			mollify.plugins.get('plugin-permissions').getUserConfigPermissionsListView($e.find(".mollify-config-admin-userdetails-permissions"), mollify.ui.texts.get('configAdminUsersPermissionsTitle'), u);
			
			updateGroups();
			updateFolders();
		}
		
		this._generatePassword = function() {
			var length = 8;
			var password = '';
			var c;
			
			for (var i = 0; i < length; i++) {
				while (true) {
					c = (parseInt(Math.random() * 1000, 10) % 94) + 33;
					if (that._isValidPasswordChar(c)) break;
				}
				password += String.fromCharCode(c);
			}
			return password;
		}
		
		this._isValidPasswordChar = function(c) {
			if (c >= 33 && c <= 47) return false;
			if (c >= 58 && c <= 64) return false;
			if (c >= 91 && c <= 96) return false;
			if (c >= 123 && c <=126) return false;
			return true;
		}
		
		this._removeUsers = function(users) {
			return mollify.service.del("configuration/users", {ids: mollify.helpers.extractValue(users, "id")});
		}
		
		this.onAddEditUser = function(u, cb) {
			var $content = false;
			var $name = false;
			var $email = false;
			var $password = false;
			var $type = false;
			var $authentication = false;
			var $language = false;
			var $expiration = false;
			var showLanguages = (mollify.settings.language.options && mollify.settings.language.options.length > 1);
			
			mollify.ui.dialogs.custom({
				resizable: true,
				initSize: [600, 400],
				title: mollify.ui.texts.get(u ? 'configAdminUsersUserDialogEditTitle' : 'configAdminUsersUserDialogAddTitle'),
				content: mollify.dom.template("mollify-tmpl-config-admin-userdialog", {user: u, showLanguages: showLanguages}),
				buttons: [
					{ id: "yes", "title": mollify.ui.texts.get('dialogSave') },
					{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
				],
				"on-button": function(btn, d) {
					if (btn.id == 'no') {
						d.close();
						return;
					}
					var username = $name.val();
					var email = $email.val();
					var type = $type.selected();
					var expiration = mollify.helpers.formatInternalTime($expiration.get());
					var auth = $authentication.selected();
					if (!username || username.length === 0) return;
					var lang = null;
					if (showLanguages) lang = $language.selected();
										
					var user = { name: username, email: email, user_type : type, expiration: expiration, auth: auth, lang: lang };
					
					if (u) {	
						mollify.service.put("configuration/users/"+u.id, user).done(d.close).done(cb);
					} else {
						var password = $password.val();
						if (!password || password.length === 0) return;
						
						user.password = window.Base64.encode(password);
						mollify.service.post("configuration/users", user).done(d.close).done(cb);
					}
				},
				"on-show": function(h, $d) {
					$content = $d.find("#mollify-config-admin-userdialog-content");
					$name = $d.find("#usernameField");
					$email = $d.find("#emailField");
					$password = $d.find("#passwordField");
					$("#generatePasswordBtn").click(function(){ $password.val(that._generatePassword()); return false; });
					$type = mollify.ui.controls.select("typeField", {
						values: ['a'],
						none: mollify.ui.texts.get('configAdminUsersTypeNormal'),
						formatter : function(t) {
							return mollify.ui.texts.get('configAdminUsersType_' + t);
						}
					});
					$authentication = mollify.ui.controls.select("authenticationField", {
						values: that._authenticationOptions,
						none: mollify.ui.texts.get('configAdminUsersUserDialogAuthDefault', that._defaultAuthMethod),
						formatter: that._authFormatter
					});
					if (showLanguages)
						$language = mollify.ui.controls.select("languageField", {
							values: mollify.settings.language.options,
							none: mollify.ui.texts.get('configAdminUsersUserDialogLangDefault', (mollify.settings.language["default"] || 'en')),
							formatter: that._langFormatter
						});
					$expiration = mollify.ui.controls.datepicker("expirationField", {
						format: mollify.ui.texts.get('shortDateTimeFormat'),
						time: true
					});
					
					if (u) {
						$name.val(u.name);
						$email.val(u.email || "");
						$type.select(u.user_type ? u.user_type.toLowerCase() : null);
						$authentication.select(u.auth ? u.auth.toLowerCase() : null);
						$expiration.set(mollify.helpers.parseInternalTime(u.expiration));
						if (showLanguages && u.lang) $language.select(u.lang);
					} else {
						$type.select(null);	
					}
					$name.focus();

					h.center();
				}
			});
		}
	}

	/* Groups */
	mollify.view.config.admin.GroupsView = function() {
		var that = this;
		this.viewId = "groups";
		
		this.init = function(s, cv) {
			that._cv = cv;
			that.title = mollify.ui.texts.get("configAdminGroupsNavTitle");	
		}
		
		this.onActivate = function($c) {
			var groups = false;
			var listView = false;
			that._details = mollify.ui.controls.slidePanel($("#mollify-mainview-viewcontent"), { resizable: true });
			
			var updateGroups = function() {
				that._details.hide();
				that._cv.showLoading(true);
				mollify.service.get("configuration/usergroups/").done(function(l) {
					that._cv.showLoading(false);
					groups = l;
					listView.table.set(groups);
				});
			};
			
			listView = new mollify.view.ConfigListView($c, {
				actions: [
					{ id: "action-add", content:'<i class="icon-plus"></i>', callback: function() { that.onAddEditGroup(false, updateGroups); }},
					{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
						mollify.ui.dialogs.confirmation({
							title: mollify.ui.texts.get("configAdminGroupsRemoveGroupsConfirmationTitle"),
							message: mollify.ui.texts.get("configAdminGroupsRemoveGroupsConfirmationMessage", [sel.length]),
							callback: function() { that._removeGroups(sel).done(updateGroups); }
						});
					}},
					{ id: "action-refresh", content:'<i class="icon-refresh"></i>', callback: updateGroups }
				],
				table: {
					id: "config-admin-groups",
					key: "id",
					narrow: true,
					hilight: true,
					columns: [
						{ type:"selectrow" },
						{ id: "icon", title:"", type:"static", content: '<i class="icon-user"></i>' },
						{ id: "name", title: mollify.ui.texts.get('configAdminUsersNameTitle') },
						{ id: "description", title: mollify.ui.texts.get('configAdminGroupsDescriptionTitle') },
						{ id: "edit", title: mollify.ui.texts.get('configAdminActionEditTitle'), type: "action", content: '<i class="icon-edit"></i>' },
						{ id: "remove", title: mollify.ui.texts.get('configAdminActionRemoveTitle'), type: "action", content: '<i class="icon-trash"></i>' }
					],
					onRowAction: function(id, g) {
						if (id == "edit") {
							that.onAddEditGroup(g, updateGroups);
						} else if (id == "remove") {
							mollify.ui.dialogs.confirmation({
								title: mollify.ui.texts.get("configAdminGroupsRemoveGroupConfirmationTitle"),
								message: mollify.ui.texts.get("configAdminGroupsRemoveGroupConfirmationMessage", [g.name]),
								callback: function() { mollify.service.del("configuration/usergroups/"+g.id).done(updateGroups); }
							});
						}
					},
					onHilight: function(u) {
						if (u) {
							that._showGroupDetails(u, that._details.getContentElement().empty(), that._allUsers, that._allFolders);
							that._details.show(false, 400);
						} else {
							that._details.hide();
						}
					}
				}
			});
			updateGroups();

			that._cv.showLoading(true);
			var up = mollify.service.get("configuration/users").done(function(u) {
				that._allUsers = u;
			});
			var fp = mollify.service.get("configuration/folders").done(function(f) {
				that._allFolders = f;
			});
			$.when(up, fp).done(function(){ that._cv.showLoading(false); });
		}
		
		this.onDeactivate = function() {
			that._details.remove();
		};

		this._showGroupDetails = function(g, $e, allUsers, allFolders) {
			mollify.dom.template("mollify-tmpl-config-admin-groupdetails", {group: g}).appendTo($e);
			mollify.ui.process($e, ["localize"]);
			var $users = $e.find(".mollify-config-admin-groupdetails-users");
			var $folders = $e.find(".mollify-config-admin-groupdetails-folders");
			var foldersView = false;
			var usersView = false;
			var folders = false;
			var users = false;
			
			var updateUsers = function() {
				$users.addClass("loading");
				mollify.service.get("configuration/usergroups/"+g.id+"/users/").done(function(l) {
					$users.removeClass("loading");
					users = l;
					usersView.table.set(users);
				});
			};
			var updateFolders = function() {
				$folders.addClass("loading");
				mollify.service.get("configuration/users/"+g.id+"/folders/").done(function(l) {
					$folders.removeClass("loading");
					folders = l;
					foldersView.table.set(folders);
				});
			};
			var onAddGroupUsers = function() {
				var currentIds = mollify.helpers.extractValue(users, "id");
				var selectable = mollify.helpers.filter(allUsers, function(f) { return currentIds.indexOf(f.id) < 0; });
				//if (selectable.length === 0) return;

				mollify.ui.dialogs.select({
					title: mollify.ui.texts.get('configAdminGroupAddUserTitle'),
					message: mollify.ui.texts.get('configAdminGroupAddUserMessage'),
					key: "id",
					initSize: [600, 400],
					columns: [
						{ id: "icon", title:"", type:"static", content: '<i class="icon-folder"></i>' },
						{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
						{ id: "name", title: mollify.ui.texts.get('configAdminUsersNameTitle') }
					],
					list: selectable,
					onSelect: function(sel, o) {
						mollify.service.post("configuration/usergroups/"+g.id+"/users/", mollify.helpers.extractValue(sel, "id")).done(updateUsers);
					}
				});
			};
			var onAddGroupFolders = function() {
				var currentIds = mollify.helpers.extractValue(folders, "id");
				var selectable = mollify.helpers.filter(allFolders, function(f) { return currentIds.indexOf(f.id) < 0; });
				//if (selectable.length === 0) return;

				mollify.ui.dialogs.select({
					title: mollify.ui.texts.get('configAdminGroupAddFolderTitle'),
					message: mollify.ui.texts.get('configAdminGroupAddFolderMessage'),
					key: "id",
					initSize: [600, 400],
					columns: [
						{ id: "icon", title:"", type:"static", content: '<i class="icon-folder"></i>' },
						{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
						{ id: "name", title: mollify.ui.texts.get('configAdminUsersFolderDefaultNameTitle') },
						{ id: "user_name", title: mollify.ui.texts.get('configAdminUsersFolderNameTitle'), type:"input" },
						{ id: "path", title: mollify.ui.texts.get('configAdminFoldersPathTitle') }
					],
					list: selectable,
					onSelect: function(sel, o) {
						var folders = [];
						$.each(sel, function(i, f) {
							var folder = {id: f.id};
							var name = o[f.id] ? o[f.id].user_name : false;
							if (name && f.name != name)
									folder.name = name;
							folders.push(folder);
						});
						mollify.service.post("configuration/users/"+g.id+"/folders/", folders).done(updateFolders);
					}
				});
			};

			foldersView = new mollify.view.ConfigListView($folders, {
				title: mollify.ui.texts.get('configAdminGroupsFoldersTitle'),
				actions: [
					{ id: "action-add", content:'<i class="icon-plus"></i>', callback: onAddGroupFolders },
					{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
						mollify.service.del("configuration/users/"+g.id+"/folders/", {ids: mollify.helpers.extractValue(sel, "id")}).done(updateFolders);
					}}
				],
				table: {
					id: "config-admin-groupfolders",
					key: "id",
					narrow: true,
					columns: [
						{ type:"selectrow" },
						{ id: "icon", title:"", type:"static", content: '<i class="icon-folder"></i>' },
						{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
						{ id: "name", title: mollify.ui.texts.get('configAdminUsersFolderNameTitle'), valueMapper: function(f, v) {
							var n = f.name;
							if (n && n.length > 0) return n;
							return mollify.ui.texts.get('configAdminUsersFolderDefaultName', f.default_name);
						} },
						{ id: "path", title: mollify.ui.texts.get('configAdminFoldersPathTitle') },
						{ id: "remove", title: mollify.ui.texts.get('configAdminActionRemoveTitle'), type: "action", content: '<i class="icon-trash"></i>' }
					],
					onRowAction: function(id, f) {
						if (id == "remove") {
							mollify.service.del("configuration/users/"+g.id+"/folders/"+f.id).done(updateFolders);
						}
					}
				}
			});

			usersView = new mollify.view.ConfigListView($users, {
				title: mollify.ui.texts.get('configAdminGroupsUsersTitle'),
				actions: [
					{ id: "action-add", content:'<i class="icon-plus"></i>', callback: onAddGroupUsers},
					{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
						mollify.service.post("configuration/usergroups/"+g.id+"/remove_users/", mollify.helpers.extractValue(sel, "id")).done(updateUsers);
					}}
				],
				table: {
					id: "config-admin-groupusers",
					key: "id",
					narrow: true,
					columns: [
						{ type:"selectrow" },
						{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
						{ id: "name", title: mollify.ui.texts.get('configAdminUsersNameTitle') },
						{ id: "remove", title: mollify.ui.texts.get('configAdminActionRemoveTitle'), type: "action", content: '<i class="icon-trash"></i>' }
					],
					onRowAction: function(id, u) {
						if (id == "remove") {
							mollify.service.post("configuration/usergroups/"+g.id+"/remove_users/", [u.id]).done(updateUsers);
						}
					}
				}
			});
			
			mollify.plugins.get('plugin-permissions').getUserConfigPermissionsListView($e.find(".mollify-config-admin-groupdetails-permissions"), mollify.ui.texts.get('configAdminGroupsPermissionsTitle'), g);
			
			updateUsers();
			updateFolders();
		}
		
		this._removeGroups = function(groups) {
			return mollify.service.del("configuration/usergroups", {ids: mollify.helpers.extractValue(groups, "id")});
		}
		
		this.onAddEditGroup = function(g, cb) {
			var $content = false;
			var $name = false;
			var $description = false;
			
			mollify.ui.dialogs.custom({
				resizable: true,
				initSize: [600, 400],
				title: mollify.ui.texts.get(g ? 'configAdminGroupsDialogEditTitle' : 'configAdminGroupsDialogAddTitle'),
				content: mollify.dom.template("mollify-tmpl-config-admin-groupdialog", {group: g}),
				buttons: [
					{ id: "yes", "title": mollify.ui.texts.get('dialogSave') },
					{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
				],
				"on-button": function(btn, d) {
					if (btn.id == 'no') {
						d.close();
						return;
					}
					var name = $name.val();
					if (!name || name.length === 0) return;
					var desc = $description.val();
					
					var group = { name: name, description : desc };
					
					if (g) {	
						mollify.service.put("configuration/usergroups/"+g.id, group).done(d.close).done(cb);
					} else {
						mollify.service.post("configuration/usergroups", group).done(d.close).done(cb);
					}
				},
				"on-show": function(h, $d) {
					$content = $d.find("#mollify-config-admin-groupdialog-content");
					$name = $d.find("#nameField");
					$description = $d.find("#descriptionField");
					
					if (g) {
						$name.val(g.name);
						$description.val(g.description || "");
					}
					$name.focus();

					h.center();
				}
			});
		}
	}

	/* Folders */
	mollify.view.config.admin.FoldersView = function() {
		var that = this;
		this.viewId = "folders";
		
		this.init = function(s, cv) {
			that._cv = cv;
			that._settings = s;
			that.title = mollify.ui.texts.get("configAdminFoldersNavTitle");
		}
		
		this.onActivate = function($c) {
			var folders = false;
			var listView = false;
			that._details = mollify.ui.controls.slidePanel($("#mollify-mainview-viewcontent"), { resizable: true });

			var updateFolders = function() {
				that._cv.showLoading(true);
				
				mollify.service.get("configuration/folders/").done(function(l) {
					that._cv.showLoading(false);
					folders = l;
					listView.table.set(folders);
				});
			};

			listView = new mollify.view.ConfigListView($c, {
				actions: [
					{ id: "action-add", content:'<i class="icon-plus"></i>', callback: function() { that.onAddEditFolder(false, updateFolders); }},
					{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
						mollify.ui.dialogs.confirmation({
							title: mollify.ui.texts.get("configAdminFoldersRemoveFoldersConfirmationTitle"),
							message: mollify.ui.texts.get("configAdminFoldersRemoveFoldersConfirmationMessage", [sel.length]),
							callback: function() { that._removeFolders(sel).done(updateFolders); }
						});
					}},
					{ id: "action-refresh", content:'<i class="icon-refresh"></i>', callback: updateFolders }
				],
				table: {
					id: "config-admin-folders",
					key: "id",
					narrow: true,
					hilight: true,
					columns: [
						{ type:"selectrow" },
						{ id: "icon", title:"", type:"static", content: '<i class="icon-folder-close"></i>' },
						{ id: "name", title: mollify.ui.texts.get('configAdminFoldersNameTitle') },
						{ id: "path", title: mollify.ui.texts.get('configAdminFoldersPathTitle') },
						{ id: "edit", title: mollify.ui.texts.get('configAdminActionEditTitle'), type: "action", content: '<i class="icon-edit"></i>' },
						{ id: "remove", title: mollify.ui.texts.get('configAdminActionRemoveTitle'), type: "action", content: '<i class="icon-trash"></i>' }
					],
					onRowAction: function(id, f) {
						if (id == "edit") {
							that.onAddEditFolder(f, updateFolders);
						} else if (id == "remove") {
							mollify.ui.dialogs.confirmation({
								title: mollify.ui.texts.get("configAdminFoldersRemoveFolderConfirmationTitle"),
								message: mollify.ui.texts.get("configAdminFoldersRemoveFolderConfirmationMessage", [f.name]),
								callback: function() { mollify.service.del("configuration/folders/"+f.id).done(updateFolders); }
							});
						}
					},
					onHilight: function(f) {
						if (f) {
							that._showFolderDetails(f, that._details.getContentElement().empty(), that._allGroups, that._allUsers);
							that._details.show(false, 400);
						} else {
							that._details.hide();
						}
					}
				}
			});
			updateFolders();
			
			that._cv.showLoading(true);
			var gp = mollify.service.get("configuration/usersgroups").done(function(r) {
				that._allUsers = r.users;
				that._allGroups = r.groups;
				that._cv.showLoading(false);
			});
		}
		
		this.onDeactivate = function() {
			that._details.remove();
		};
		
		this._showFolderDetails = function(f, $e, allUsers, allGroups) {
			mollify.dom.template("mollify-tmpl-config-admin-folderdetails", {folder: f}).appendTo($e);
			mollify.ui.process($e, ["localize"]);
			var $usersAndGroups = $e.find(".mollify-config-admin-folderdetails-usersandgroups");
			var usersAndGroupsView = false;
			var usersAndGroups = false;
			var allUsersAndGroups = allUsers.concat(allGroups);
			
			var updateUsersAndGroups = function() {
				$usersAndGroups.addClass("loading");
				mollify.service.get("configuration/folders/"+f.id+"/users/").done(function(l) {
					$usersAndGroups.removeClass("loading");
					usersAndGroups = l;
					usersAndGroupsView.table.set(l);
				});
			};
			var onAddUserGroup = function() {
				var currentIds = mollify.helpers.extractValue(usersAndGroups, "id");
				var selectable = mollify.helpers.filter(allUsersAndGroups, function(ug) { return currentIds.indexOf(ug.id) < 0; });
				//if (selectable.length === 0) return;

				mollify.ui.dialogs.select({
					title: mollify.ui.texts.get('configAdminFolderAddUserTitle'),
					message: mollify.ui.texts.get('configAdminFolderAddUserMessage'),
					key: "id",
					initSize: [600, 400],
					columns: [
						{ id: "icon", title:"", valueMapper: function(i, v) { if (i.is_group == 1) return "<i class='icon-user'></i><i class='icon-user'></i>"; return "<i class='icon-user'></i>"; } },
						{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
						{ id: "name", title: mollify.ui.texts.get('configAdminUserDialogUsernameTitle') }
					],
					list: selectable,
					onSelect: function(sel, o) {
						mollify.service.post("configuration/folders/"+f.id+"/users/", mollify.helpers.extractValue(sel, "id")).done(updateUsersAndGroups);
					}
				});
			}

			usersAndGroupsView = new mollify.view.ConfigListView($usersAndGroups, {
				title: mollify.ui.texts.get('configAdminFolderUsersTitle'),
				actions: [
					{ id: "action-add", content:'<i class="icon-plus"></i>', callback: onAddUserGroup },
					{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
						mollify.service.post("configuration/folders/"+f.id+"/remove_users/", mollify.helpers.extractValue(sel, "id")).done(updateUsersAndGroups);
					}}
				],
				table: {
					id: "config-admin-folderusers",
					key: "id",
					narrow: true,
					columns: [
						{ type:"selectrow" },
						{ id: "icon", title:"", valueMapper: function(i, v) { if (i.is_group == 1) return "<i class='icon-user'></i><i class='icon-user'></i>"; return "<i class='icon-user'></i>"; } },
						{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
						{ id: "name", title: mollify.ui.texts.get('configAdminUserDialogUsernameTitle') },
						{ id: "remove", title: mollify.ui.texts.get('configAdminActionRemoveTitle'), type: "action", content: '<i class="icon-trash"></i>' }
					],
					onRowAction: function(id, u) {
						if (id == "remove") {
							mollify.service.post("configuration/folders/"+f.id+"/remove_users/", [u.id]).done(updateUsersAndGroups);
						}
					}
				}
			});
			
			updateUsersAndGroups();
		}
		
		this._removeFolders = function(f) {
			return mollify.service.del("configuration/folders", {ids: mollify.helpers.extractValue(f, "id")});
		}
		
		this._isValidPath = function(p) {
			if (!p) return false;
			if (p.indexOf("..") >= 0) return false;
			if (that._settings.published_folders_root) {
				// if root setting is defined, prevent using absolute paths
				if (p.indexOf("/") === 0 || p.indexOf(":\\") === 0) return false;	
			}
			return true;
		}
		
		this.onAddEditFolder = function(f, cb) {
			var $content = false;
			var $name = false;
			var $path = false;
			
			mollify.ui.dialogs.custom({
				resizable: true,
				initSize: [500, 300],
				title: mollify.ui.texts.get(f ? 'configAdminFoldersFolderDialogEditTitle' : 'configAdminFoldersFolderDialogAddTitle'),
				content: mollify.dom.template("mollify-tmpl-config-admin-folderdialog", {folder: f}),
				buttons: [
					{ id: "yes", "title": mollify.ui.texts.get('dialogSave') },
					{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
				],
				"on-button": function(btn, d) {
					if (btn.id == 'no') {
						d.close();
						return;
					}
					$content.find(".control-group").removeClass("error");
					
					var name = $name.val();					
					if (!name) $name.closest(".control-group").addClass("error");
					
					var path = $path.val();
					var pathValid = that._isValidPath(path);
					if (!pathValid) $path.closest(".control-group").addClass("error");
					
					if (!name) {
						$name.focus();
						return;
					}
					if (!pathValid) {
						$path.focus();
						return;
					}
					
					var folder = {name: name, path: path};
					var onFail = function(e){
						if (e.code == 105) {
							this.handled = true;
							
							mollify.ui.dialogs.confirmation({title:mollify.ui.texts.get('configAdminFoldersFolderDialogAddTitle'), message: mollify.ui.texts.get('configAdminFoldersFolderDialogAddFolderDoesNotExist'), callback: function() {
								folder.create = true;
								if (!f)
									mollify.service.post("configuration/folders", folder).done(d.close).done(cb);
								else
									mollify.service.put("configuration/folders/"+f.id, folder).done(d.close).done(cb);
							}});
						}
					};
					if (f) {	
						mollify.service.put("configuration/folders/"+f.id, folder).done(d.close).done(cb).fail(onFail);
					} else {
						mollify.service.post("configuration/folders", folder).done(d.close).done(cb).fail(onFail);
					}
				},
				"on-show": function(h, $d) {
					$content = $d.find("#mollify-config-admin-folderdialog-content");
					$name = $d.find("#nameField");
					$path = $d.find("#pathField");
					
					if (f) {
						$name.val(f.name);
						$path.val(f.path);
					}
					$name.focus();

					h.center();
				}
			});
		}
	}

}(window.jQuery, window.mollify);

/**
 * init.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
var mollifyDefaults = {
	"language": {
		"default": "en",
		"options": ["en"]	
	},
	"view-url" : false,
	"app-element-id" : "mollify",
	"service-path": "backend/",
	"limited-http-methods" : false,
	"file-view" : {
		"default-view-mode" : false,
		"list-view-columns": {
			"name": { width: 250 },
			"size": {},
			"file-modified": { width: 150 }
		},
		"actions": false
	},
	"html5-uploader": {
		maxChunkSize: 0
	},
	dnd : {
		dragimages : {
			"filesystemitem-file" : "css/images/mimetypes64/empty.png",
			"filesystemitem-folder" : "css/images/mimetypes64/folder.png",
			"filesystemitem-many" : "css/images/mimetypes64/application_x_cpio.png"
		}
	}
};

!function($) {

	"use strict"; // jshint ;_;
	
	var mollify = {
		App : {},
		view : {},
		ui : {},
		events : {},
		service : {},
		filesystem : {},
		plugins : {},
		features : {},
		dom : {},
		templates : {}
	};
	
	mollify._time = new Date().getTime();
	mollify._hiddenInd = 0;
	mollify.settings = false;
	mollify.session = false;
		
	/* APP */

	mollify.App.init = function(s, p) {
		window.Modernizr.testProp("touch");
		
		mollify.App._initialized = false;
		mollify.App._views = {};
		mollify.App.pageUrl = mollify.request.getBaseUrl(window.location.href);
		mollify.App.pageParams = mollify.request.getParams(window.location.href);
		mollify.App.mobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
		
		mollify.settings = $.extend(true, {}, mollifyDefaults, s);
		mollify.service.init(mollify.settings["limited-http-methods"]);
		
		mollify.plugins.register(new mollify.plugin.Core());
		mollify.plugins.register(new mollify.plugin.PermissionsPlugin());
		if (p) {
			for (var i=0, j=p.length; i < j; i++)
				mollify.plugins.register(p[i]);
		}
		
		mollify.events.addEventHandler(function(e) {
			if (e.type == 'session/start') {
				mollify.App._onSessionStart(e.payload);
			} else if (e.type == 'session/end') {
				mollify.session = {};
				mollify.filesystem.init([]);
				start();
			}
		});
		
		var start = function() {
			mollify.service.get("session/info/").fail(function() {
				new mollify.ui.FullErrorView('Failed to initialize Mollify').show();
			}).done(function(s) {
				mollify.events.dispatch('session/start', s);
			});
		};
		
		var onError = function() { new mollify.ui.FullErrorView('Failed to initialize Mollify').show(); };
		mollify.ui.initialize().done(function() {
			mollify.plugins.initialize().done(function() {
				mollify.App._initialized = true;
				start();
			}).fail(onError);
		}).fail(onError);
		
		if (mollify.settings["view-url"])
			window.onpopstate = function(event) {
				mollify.App.onRestoreState(document.location.href, event.state);
			};
	};
	
	mollify.App.getElement = function() { return $("#"+mollify.settings["app-element-id"]); };
	
	mollify.App._onSessionStart = function(s) {
		var user = s.authenticated ? {
			id : s.user_id,
			name : s.username,			
			type: s.user_type,
			lang: s.lang,
			admin: s.user_type == 'a',
			permissions: s.permissions,
			hasPermission : function(name, required) { return mollify.helpers.hasPermission(s.permissions, name, required); }
		} : null;

		mollify.session = {
			id: s.session_id,
			user: user,
			features: s.features,
			plugins: s.plugins,
			data: s
		};
		
		mollify.filesystem.init(mollify.session.data.folders, ((mollify.session.user && mollify.session.user.admin) ? mollify.session.data.roots : false));
		mollify.ui.initializeLang().done(mollify.App._doStart).fail(function() { new mollify.ui.FullErrorView('Failed to initialize Mollify').show(); });
	};
	
	mollify.App._doStart = function() {
		mollify.App.activeView = false;
		mollify.App.activeViewId = null;	
		mollify.App.openView(mollify.App.pageParams.v || "/files/");
	};
	
	mollify.App.openView = function(viewId) {
		var id = viewId.split("/");

		var onView = function(v) {
			if (v) {
				mollify.App.activeView = v;
				mollify.App.activeViewId = id[0];
			} else {
				if (!mollify.session.user) {
					mollify.App.activeView = new mollify.view.LoginView();
					mollify.App.activeViewId = "login";
				} else {
					mollify.App.activeView = new mollify.view.MainView();
					mollify.App.activeViewId = "main";
				}
			}
			
			mollify.App.activeView.init(mollify.App.getElement(), id);
		};
		
		if (id) {
			var custom = !!mollify.App._views[id[0]];
			var isActiveView = (custom && mollify.App.activeViewId == id[0]) || (!custom && mollify.App.activeViewId == "main");
			
			if (isActiveView) mollify.App.activeView.onRestoreView(id);
			else mollify.App._getView(id, onView);
		} else onView();
	};
	
	mollify.App._getView = function(id, cb) {
		var h = mollify.App._views[id[0]];
		if (h && h.getView) {
			var view = h.getView(id, mollify.App.pageParams);
			if (view && view.done) view.done(cb);
			else cb(view);
		} else cb(false);
	};
	
	mollify.App.onRestoreState = function(url, o) {
		if (!mollify.settings["view-url"]) return;
		
		// if no view active, app is not loaded -> don't restore
		if (!mollify.App.activeView) return;
		
		if (!o || !o.user_id || !mollify.session.user || mollify.session.user.id != o.user_id) return;
		
		//baseUrl = mollify.request.getBaseUrl(url);
		var params = mollify.request.getParams(url);
		if (!params.v || params.v.length < 1) return;
		mollify.App.openView(params.v);
	};
	
	mollify.App.storeView = function(viewId) {
		if (!mollify.settings["view-url"]) return;
		var obj = {
			user_id : mollify.session.user ? mollify.session.user.id : null
		};
		if (window.history) window.history.pushState(obj, "", "?v="+viewId);	
	};
	
	mollify.App.registerView = function(id, h) {
		mollify.App._views[id] = h;
	};
	
	mollify.App.openPage = function(pageUrl) {
		window.location = mollify.App.getPageUrl(pageUrl);
	};
	
	mollify.App.getPageUrl = function(pageUrl) {
		return mollify.App.pageUrl + "?v="+pageUrl;
	}
	
	mollify.getItemDownloadInfo = function(i) {
		if (!i) return false;
		var single = false;

		if (!window.isArray(i)) single = i;
		else if (i.length === 0) single = i[0];

		if (single && single.is_file) {
			return {
				name: single.name,
				url: mollify.filesystem.getDownloadUrl(single)
			};
		} else {
			if (!single) return false;
			
			if (mollify.plugins.exists("plugin-archiver")) return {
				name: single.name + ".zip",	//TODO get extension from plugin
				url: mollify.plugins.get("plugin-archiver").getDownloadCompressedUrl(i)
			};
		}

		return false;
	};
	
	mollify.resourceUrl = function(u) {
		if (!mollify.settings["resource-map"]) return u;
		
		var urlParts = mollify.helpers.breakUrl(u);
		if (!urlParts) return u;
		
		var mapped = mollify.settings["resource-map"][urlParts.path];
		if (mapped === undefined) return u;
		if (mapped === false) return false;
		
		return mapped + urlParts.paramsString;
	};
	
	/* REQUEST */
	
	mollify.request = {
		getParam: function(name) {
			if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
				return decodeURIComponent(name[1]);
		},
		getParams: function() {
			return mollify.helpers.getUrlParams(location.search);
		},
		getBaseUrl : function(url) {
			var param = url.lastIndexOf('?');
			if (param >= 0) url = url.substring(0, param+1);
			
			var dash = url.lastIndexOf('/');
			return url.substring(0, dash+1);
		}
	}
	
	/* EVENTS */
	var et = mollify.events;
	et._handlers = [];
	et._handlerTypes = {};
		
	et.addEventHandler = function(h, t) {
		et._handlers.push(h);
		if (t) et._handlerTypes[h] = t;
	};
	
	et.dispatch = function(type, payload) {
		var e = { type: type, payload: payload };
		$.each(et._handlers, function(i, h) {
			if (!et._handlerTypes[h] || type == et._handlerTypes[h])
				h(e);
		});
	};
	
	/* SERVICE */
	var st = mollify.service;
	
	st.init = function(limitedHttpMethods) {
		st._limitedHttpMethods = !!limitedHttpMethods;
	};
	
	st.url = function(u, full) {
		if (u.startsWith('http')) return u;
		var url = mollify.settings["service-path"]+"r.php/"+u;
		if (!full) return url;
		return mollify.App.pageUrl + url;
	};
	
	st.get = function(url, s, err) {
		return st._do("GET", url, null);
	};

	st.post = function(url, data) {
		return st._do("POST", url, data);
	};
	
	st.put = function(url, data) {
		return st._do("PUT", url, data);
	};
	
	st.del = function(url, data) {
		return st._do("DELETE", url, data);
	};
			
	st._do = function(type, url, data) {
		var t = type;
		var diffMethod = (st._limitedHttpMethods && (t == 'PUT' || t == 'DELETE'));
		if (diffMethod) t = 'POST';
		
		return (function(sid) { return $.ajax({
			type: t,
			url: st.url(url),
			processData: false,
			data: data ? JSON.stringify(data) : null,
			contentType: 'application/json',
			dataType: 'json',
			beforeSend: function(xhr) {
				if (mollify.session && mollify.session.id)
					xhr.setRequestHeader("mollify-session-id", mollify.session.id);
				if (st._limitedHttpMethods || diffMethod)
					xhr.setRequestHeader("mollify-http-method", type);
			}
		}).pipe(function(r) {			
			if (!r) {
				return $.Deferred().reject({ code: 999 });
			}
			return r.result;
		}, function(xhr) {
			var df = $.Deferred();
			
			// if session has expired since starting request, ignore it
			if (mollify.session.id != sid) return df;

			var error = false;
			var data = false;

			if (xhr.responseText && xhr.responseText.startsWith('{')) error = JSON.parse($.trim(xhr.responseText));
			if (!error) error = { code: 999 };	//unknown
			
			var failContext = {
				handled: false
			}
			if (error.code == 100 && mollify.session.user) {
				mollify.events.dispatch('session/end');
				failContext.handled = true;
			}
			// push default handler to end of callback list
			setTimeout(function(){
				df.fail(function(err){
					if (!failContext.handled) mollify.ui.dialogs.showError(err);
				});
			}, 0);
			return df.rejectWith(failContext, [error]);
		}).promise()}(mollify.session.id));
	};
	
	/* FILESYSTEM */
	
	var mfs = mollify.filesystem;
	
	mfs.init = function(f, allRoots) {
		mollify.filesystem.permissionCache = {};
		mollify.filesystem.roots = [];
		mollify.filesystem.allRoots = false;
		mollify.filesystem.rootsById = {};
		
		if (f && mollify.session.user) {
			mollify.filesystem.roots = f;
			for (var i=0,j=f.length; i<j; i++)
				mollify.filesystem.rootsById[f[i].id] = f[i];
			
			if (allRoots) {
				mollify.filesystem.allRoots = allRoots;
				for (var k=0,l=allRoots.length; k<l; k++)
					if (!mollify.filesystem.rootsById[allRoots[k].id])
						mollify.filesystem.rootsById[allRoots[k].id] = allRoots[k];
			}
		}
	};
	
	mfs.getDownloadUrl = function(item) {
		if (!item.is_file) return false;
		var url = mollify.service.url("filesystem/"+item.id, true);
		if (mollify.App.mobile)
			url = url + ((url.indexOf('?') >= 0) ? "&" : "?") + "m=1";
		return url;
	};

	mfs.getUploadUrl = function(folder) {	
		if (!folder || folder.is_file) return null;
		return mollify.service.url("filesystem/"+folder.id+'/files/') + "?format=binary";
	};
	
	mfs.itemDetails = function(item, data) {
		return mollify.service.post("filesystem/"+item.id+"/details/", { data : data }).done(function(r) {
			mollify.filesystem.permissionCache[item.id] = r.permissions;
			if (item.parent_id && r.parent_permissions) mollify.filesystem.permissionCache[item.parent_id] = r.parent_permissions;
		});
	};
	
	mfs.folderInfo = function(id, hierarchy, data) {
		return mollify.service.post("filesystem/"+ (id ? id : "roots") + "/info/" + (hierarchy ? "?h=1" : ""), { data : data }).done(function(r) {
			mollify.filesystem.permissionCache[id] = r.permissions;
		});
	};

	mfs.findFolder = function(d, data) {
		return mollify.service.post("filesystem/find/", { folder: d, data : data });
	};
	
	mfs.hasPermission = function(item, name, required) {
		if (!mollify.session.user) return false;
		if (mollify.session.user.admin) return true;
		return mollify.helpers.hasPermission(mollify.filesystem.permissionCache[((typeof(item) === "string") ? item : item.id)], name, required);
	};
		
	mfs.items = function(parent, files) {
		if (parent == null) {
			var df = $.Deferred();
			df.resolve({ folders: mfs.roots , files: [] });
			return df.promise();
		}
		return mollify.service.get("filesystem/"+parent.id+"/items/?files=" + (files ? '1' : '0'));
	};
	
	mfs.copy = function(i, to) {
		if (!i) return;
		
		if (window.isArray(i) && i.length > 1) {
			if (!to) {
				var df = $.Deferred();
				mollify.ui.dialogs.folderSelector({
					title: mollify.ui.texts.get('copyMultipleFileDialogTitle'),
					message: mollify.ui.texts.get('copyMultipleFileMessage', [i.length]),
					actionTitle: mollify.ui.texts.get('copyFileDialogAction'),
					handler: {
						onSelect: function(f) { $.when(mfs._copyMany(i, f)).then(df.resolve, df.reject); },
						canSelect: function(f) { return mfs.canCopyTo(i, f); }
					}
				});
				return df.promise();
			} else
				return mfs._copyMany(i, to);

			return;	
		}
		
		if (window.isArray(i)) i = i[0];
		
		if (!to) {
			var df2 = $.Deferred();
			mollify.ui.dialogs.folderSelector({
				title: mollify.ui.texts.get('copyFileDialogTitle'),
				message: mollify.ui.texts.get('copyFileMessage', [i.name]),
				actionTitle: mollify.ui.texts.get('copyFileDialogAction'),
				handler: {
					onSelect: function(f) { $.when(mfs._copy(i, f)).then(df2.resolve, df2.reject); },
					canSelect: function(f) { return mfs.canCopyTo(i, f); }
				}
			});
			return df2.promise();
		} else
			return mfs._copy(i, to);
	};
	
	mfs.copyHere = function(item, name) {
		if (!item) return;
		
		if (!name) {
			var df = $.Deferred();
			mollify.ui.dialogs.input({
				title: mollify.ui.texts.get('copyHereDialogTitle'),
				message: mollify.ui.texts.get('copyHereDialogMessage'),
				defaultValue: item.name,
				yesTitle: mollify.ui.texts.get('copyFileDialogAction'),
				noTitle: mollify.ui.texts.get('dialogCancel'),
				handler: {
					isAcceptable: function(n) { return !!n && n.length > 0 && n != item.name; },
					onInput: function(n) { $.when(mfs._copyHere(item, n)).then(df.resolve, df.reject); }
				}
			});
			return df.promise();
		} else {
			return mfs._copyHere(item, name);
		}
	};
	
	mfs.canCopyTo = function(item, to) {
		if (window.isArray(item)) {
			for(var i=0,j=item.length;i<j;i++)
				if (!mfs.canCopyTo(item[i], to)) return false;
			return true;
		}
		
		// cannot copy into file
		if (to.is_file) return false;

		// cannot copy into itself
		if (item.id == to.id) return false;
		
		// cannot copy into same location
		if (item.parent_id == to.id) return false;
		return true;
	};
	
	mfs.canMoveTo = function(item, to) {
		if (window.isArray(item)) {
			for(var i=0,j=item.length;i<j;i++)
				if (!mfs.canMoveTo(item[i], to)) return false;
			return true;
		}
		
		// cannot move into file
		if (to.is_file) return false;

		// cannot move folder into its own subfolder
		if (!to.is_file && item.root_id == to.root_id && to.path.startsWith(item.path)) return false;

		// cannot move into itself
		if (item.id == to.id) return false;
		
		// cannot move into same location
		if (item.parent_id == to.id) return false;
		return true;
	};

	mfs._copyHere = function(i, name) {
		return mollify.service.post("filesystem/"+i.id+"/copy/", {name:name}).done(function(r) {
			mollify.events.dispatch('filesystem/copy', { items: [ i ], name: name });
		});
	};
		
	mfs._copy = function(i, to) {
		return mollify.service.post("filesystem/"+i.id+"/copy/", {folder:to.id}).done(function(r) {
			mollify.events.dispatch('filesystem/copy', { items: [ i ], to: to });
		});
	};
	
	mfs._copyMany = function(i, to) {
		return mollify.service.post("filesystem/items/", {action: 'copy', items: i, to: to}).done(function(r) {
			mollify.events.dispatch('filesystem/copy', { items: i, to: to });
		});
	};
	
	mfs.move = function(i, to) {
		if (!i) return;
		
		if (window.isArray(i) && i.length > 1) {
			if (!to) {
				var df = $.Deferred();
				mollify.ui.dialogs.folderSelector({
					title: mollify.ui.texts.get('moveMultipleFileDialogTitle'),
					message: mollify.ui.texts.get('moveMultipleFileMessage', [i.length]),
					actionTitle: mollify.ui.texts.get('moveFileDialogAction'),
					handler: {
						onSelect: function(f) { $.when(mfs._moveMany(i, f)).then(df.resolve, df.reject); },
						canSelect: function(f) { return mfs.canMoveTo(i, f); }
					}
				});
				return df.promise();
			} else
				return mfs._moveMany(i, to);
		}
		
		if (window.isArray(i)) i = i[0];
		
		if (!to) {
			var df2 = $.Deferred();
			mollify.ui.dialogs.folderSelector({
				title: mollify.ui.texts.get('moveFileDialogTitle'),
				message: mollify.ui.texts.get('moveFileMessage', [i.name]),
				actionTitle: mollify.ui.texts.get('moveFileDialogAction'),
				handler: {
					onSelect: function(f) { $.when(mfs._move(i, f)).then(df2.resolve, df2.reject); },
					canSelect: function(f) { return mfs.canMoveTo(i, f); }
				}
			});
			return df2.promise();
		} else
			return mfs._move(i, to);
	};
	
	mfs._move = function(i, to) {
		return mollify.service.post("filesystem/"+i.id+"/move/", {id:to.id}).done(function(r) {
			mollify.events.dispatch('filesystem/move', { items: [ i ], to: to });
		});
	};

	mfs._moveMany = function(i, to) {
		return mollify.service.post("filesystem/items/", {action: 'move', items: i, to: to}).done(function(r) {
			mollify.events.dispatch('filesystem/move', { items: i, to: to });
		});
	};
	
	mfs.rename = function(item, name) {
		if (!name || name.length === 0) {
			var df = $.Deferred();
			mollify.ui.dialogs.input({
				title: mollify.ui.texts.get(item.is_file ? 'renameDialogTitleFile' : 'renameDialogTitleFolder'),
				message: mollify.ui.texts.get('renameDialogNewName'),
				defaultValue: item.name,
				yesTitle: mollify.ui.texts.get('renameDialogRenameButton'),
				noTitle: mollify.ui.texts.get('dialogCancel'),
				handler: {
					isAcceptable: function(n) { return !!n && n.length > 0 && n != item.name; },
					onInput: function(n) { $.when(mfs._rename(item, n)).then(df.resolve, df.reject); }
				}
			});
			return df.promise();			
		} else {
			return mfs._rename(item, name);
		}
	};
	
	mfs._rename = function(item, name) {
		return mollify.service.put("filesystem/"+item.id+"/name/", {name: name}).done(function(r) {
			mollify.events.dispatch('filesystem/rename', { items: [item], name: name });
		});
	};
	
	mfs._handleDenied = function(action, i, data, msgTitleDenied, msgTitleAccept) {
		var df = $.Deferred();
		var handlers = [];
		var findItem = function(id) {
			if (!window.isArray(data.target)) return data.target;

			for(var i=0,j=data.target.length;i<j;i++) {
				if (data.target[i].id == id) return data.target[i];
			}
			return null;
		};
		for(var k in data.items) {
			var plugin = mollify.plugins.get(k);
			if (!plugin || !plugin.actionValidationHandler) return false;
			
			var handler = plugin.actionValidationHandler();
			handlers.push(handler);

			var items = data.items[k];
			for(var m=0,l=items.length;m<l;m++) {
				var item = items[m];
				item.item = findItem(item.item);
			}
		}

		var validationMessages = [];
		var nonAcceptable = [];
		var acceptKeys = [];
		var allAcceptable = true;
		for(var ind=0,j=handlers.length; ind<j; ind++) {
			var msg = handlers[ind].getValidationMessages(action, data.items[k], data);
			for(var mi = 0, mj= msg.length; mi<mj; mi++) {
				var ms = msg[mi];
				acceptKeys.push(ms.acceptKey);
				validationMessages.push(ms.message);
				if (!ms.acceptable) nonAcceptable.push(ms.message);
			}
		}		
		if (nonAcceptable.length === 0) {
			// retry with accept keys
			mollify.ui.dialogs.confirmActionAccept(msgTitleAccept, validationMessages, function() {
				df.resolve(acceptKeys);
			}, df.reject);
		} else {
			mollify.ui.dialogs.showActionDeniedMessage(msgTitleDenied, nonAcceptable);
			df.reject();
		}
		return df;
	}
	
	mfs.del = function(i) {
		if (!i) return;
		
		var df = $.Deferred();
		if (window.isArray(i) && i.length > 1) {
			mfs._delMany(i).done(df.resolve).fail(function(e) {
				// request denied
				if (e.code == 109 && e.data && e.data.items) {
					this.handled = true;
					mfs._handleDenied("delete", i, e.data, mollify.ui.texts.get("actionDeniedDeleteMany"), mollify.ui.texts.get("actionAcceptDeleteMany", i.length)).done(function(acceptKeys) { mfs._delMany(i, acceptKeys).done(df.resolve).fail(df.reject); }).fail(function(){df.reject(e);});
				} else df.reject(e);
			});
			return df.promise();
		}
		
		if (window.isArray(i)) i = i[0];
		mfs._del(i).done(df.resolve).fail(function(e) {
			// request denied
			if (e.code == 109 && e.data && e.data.items) {
				this.handled = true;
				mfs._handleDenied("delete", i, e.data, mollify.ui.texts.get("actionDeniedDelete", i.name), mollify.ui.texts.get("actionAcceptDelete", i.name)).done(function(acceptKeys) { mfs._del(i, acceptKeys).done(df.resolve).fail(df.reject); }).fail(function(){df.reject(e);});
			} else df.reject(e);
		});
		return df.promise();
	};
	
	mfs._del = function(item, acceptKeys) {
		return mollify.service.del("filesystem/"+item.id, acceptKeys ? { acceptKeys : acceptKeys } : null).done(function(r) {
			mollify.events.dispatch('filesystem/delete', { items: [item] });
		});
	};
	
	mfs._delMany = function(i, acceptKeys) {
		return mollify.service.post("filesystem/items/", {action: 'delete', items: i, acceptKeys : (acceptKeys ? acceptKeys : null)}).done(function(r) {
			mollify.events.dispatch('filesystem/delete', { items: i });
		});
	};
	
	mfs.createFolder = function(folder, name) {
		return mollify.service.post("filesystem/"+folder.id+"/folders/", {name: name}).done(function(r) {
			mollify.events.dispatch('filesystem/createfolder', { items: [folder], name: name });
		});
	};

	/* PLUGINS */
	
	var pl = mollify.plugins;
	pl._list = {};
	
	pl.register = function(p) {
		var id = p.id;
		if (!id) return;
		
		pl._list[id] = p;
	};
	
	pl.initialize = function(cb) {
		var df = $.Deferred();
		var l = [];
		for (var id in pl._list) {
			var p = pl._list[id];
			if (p.initialize) p.initialize();
			if (p.resources) {
				var pid = p.backendPluginId || id;
				if (p.resources.texts) {
					if (mollify.settings.texts_js)
						l.push(mollify.dom.importScript(mollify.plugins.getJsLocalizationUrl(pid)));
					else
						l.push(mollify.ui.texts.loadPlugin(pid));
				}
				if (p.resources.css) mollify.dom.importCss(mollify.plugins.getStyleUrl(pid));
			}
		}
		if (l.length === 0) {
			return df.resolve().promise();
		}
		$.when.apply($, l).done(df.resolve).fail(df.reject);
		return df.promise();
	};
	
	pl.get = function(id) {
		if (!window.def(id)) return pl._list;
		return pl._list[id];
	};
	
	pl.exists = function(id) {
		return !!pl._list[id];
	};
	
	pl.url = function(id, p, admin) {
		var url = mollify.settings["service-path"]+"plugin/"+id;
		if (!p) return url;
		return url + (admin ? "/admin/" : "/client/")+p;
	};
	
	pl.adminUrl = function(id, p) {
		return pl.url(id)+"/admin/"+p;
	};

	pl.getLocalizationUrl = function(id) {
		return mollify.settings["service-path"]+"plugin/"+id+"/localization/texts_" + mollify.ui.texts.locale + ".json";
	};
	
	pl.getStyleUrl = function(id, admin) {
		return pl.url(id, "style.css", admin);
	};
	
	pl.getItemContextRequestData = function(item) {
		var requestData = {};
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.itemContextRequestData) continue;
			var data = plugin.itemContextRequestData(item);
			if (!data) continue;
			requestData[id] = data;
		}
		return requestData;
	};
	
	pl.getItemContextPlugins = function(item, ctx) {
		var data = {};
		if (!ctx) return data;
		var d = ctx.details;
		if (!d || !d.plugins) return data;
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.itemContextHandler) continue;
			var pluginData = plugin.itemContextHandler(item, ctx, d.plugins[id]);
			if (pluginData) data[id] = pluginData;
		}
		return data;
	};
	
	pl.getItemCollectionPlugins = function(items, ctx) {
		var data = {};
		if (!items || !window.isArray(items) || items.length < 1) return data;
		
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.itemCollectionHandler) continue;
			var pluginData = plugin.itemCollectionHandler(items, ctx);
			if (pluginData) data[id] = pluginData;
		}
		return data;
	};
	
	pl.getMainViewPlugins = function() {
		var plugins = [];
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.mainViewHandler) continue;
			plugins.push(plugin);
		}
		return plugins;
	};

	pl.getFileViewPlugins = function() {
		var plugins = [];
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.fileViewHandler) continue;
			plugins.push(plugin);
		}
		return plugins;
	};

	pl.getConfigViewPlugins = function() {
		var plugins = [];
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.configViewHandler) continue;
			plugins.push(plugin);
		}
		return plugins;
	};
		
	/* FEATURES */
	
	var ft = mollify.features;
	ft.hasFeature = function(id) {
		return mollify.session.features && mollify.session.features[id];
	};
	
	/* TEMPLATES */
	var mt = mollify.templates;
	mt._loaded = [];
	
	mt.url = function(name) {
		var base = mollify.settings["template-url"] || 'templates/';
		return mollify.helpers.noncachedUrl(mollify.resourceUrl(base + name));
	};
	
	mt.load = function(name, url) {
		var df = $.Deferred();
		if (mt._loaded.indexOf(name) >= 0) {
			return df.resolve();
		}
		
		$.get(url ? mollify.resourceUrl(url) : mt.url(name)).done(function(h) {
			mt._loaded.push(name);
			$("body").append(h);
			df.resolve();
		}).fail(function(f) {
			df.reject();
		});
		return df;
	};
	
	/* DOM */
	var md = mollify.dom;
	md._hiddenLoaded = [];
		
	md.importScript = function(url) {
		var u = mollify.resourceUrl(url);
		if (!u)
			return $.Deferred().resolve().promise();
		var df = $.Deferred();
		$.getScript(u, df.resolve).fail(function(e) {
			new mollify.ui.FullErrorView("Failed to load script ", "<code>"+u+"</code>").show();
		});
		return df.promise();
	};
		
	md.importCss = function(url) {
		var u = mollify.resourceUrl(url);
		if (!u) return;
		
		var link = $("<link>");
		link.attr({
			type: 'text/css',
			rel: 'stylesheet',
			href: mollify.helpers.noncachedUrl(u)
		});
		$("head").append(link);
	};

	md.loadContent = function(contentId, url, cb) {
		if (md._hiddenLoaded.indexOf(contentId) >= 0) {
			if (cb) cb();
			return;
		}
		var u = mollify.resourceUrl(url);
		if (!u) {
			if (cb) cb();
			return;
		}
		var id = 'mollify-tmp-'+(mollify._hiddenInd++);
		$('<div id="'+id+'" style="display:none"/>').appendTo($("body")).load(mollify.helpers.noncachedUrl(u), function() {
			md._hiddenLoaded.push(contentId);
			if (cb) cb();
		});
	};
					
	md.loadContentInto = function($target, url, handler, process) {
		var u = mollify.resourceUrl(url);
		if (!u) return;
		$target.load(mollify.helpers.noncachedUrl(u), function() {
			if (process) mollify.ui.process($target, process, handler);
			if (typeof handler === 'function') handler();
			else if (handler.onLoad) handler.onLoad($target);
		});
	};
		
	md.template = function(id, data, opt) {
		var templateId = id;
		if (mollify.settings["resource-map"] && mollify.settings["resource-map"]["template:"+id])
			templateId = mollify.settings["resource-map"]["template:"+id];
		return $("#"+templateId).tmpl(data, opt);
	};

	/* HELPERS */
	
	mollify.helpers = {
		getPluginActions : function(plugins) {
			var list = [];
			
			if (plugins) {
				for (var id in plugins) {
					var p = plugins[id];
					if (p.actions) {
						list.push({title:"-",type:'separator'});
						$.merge(list, p.actions);
					}
				}
			}
			var downloadActions = [];
			var firstDownload = -1;
			for (var i=0,j=list.length; i<j; i++) {
				var a = list[i];
				if (a.group == 'download') {
					if (firstDownload < 0) firstDownload = i;
					downloadActions.push(a);
				}
			}
			if (downloadActions.length > 1) {
				for (var i2=1,j2=downloadActions.length; i2<j2; i2++) list.remove(downloadActions[i2]); 
				list[firstDownload] = {
					type: "submenu",
					items: downloadActions,
					title: downloadActions[0].title,
					group: downloadActions[0].group,
					primary: downloadActions[0]
				};
			}
			return list;
		},
	
		getPrimaryActions : function(actions) {
			if (!actions) return [];
			var result = [];
			var p = function(list) {
				for (var i=0,j=list.length; i<j; i++) {
					var a = list[i];
					if (a.type == 'primary' || a.group == 'download') result.push(a);
				}
			}
			p(actions);
			return result;
		},

		getSecondaryActions : function(actions) {
			if (!actions) return [];
			var result = [];
			for (var i=0,j=actions.length; i<j; i++) {
				var a = actions[i];
				if (a.id == 'download' || a.type == 'primary') continue;				
				result.push(a);
			}
			return mollify.helpers.cleanupActions(result);
		},
		
		cleanupActions : function(actions) {
			if (!actions) return [];				
			var last = -1;
			for (var i=actions.length-1,j=0; i>=j; i--) {
				var a = actions[i];
				if (a.type != 'separator' && a.title != '-') {
					last = i;
					break;
				}
			}
			if (last < 0) return [];
			
			var first = -1;
			for (var i2=0; i2<=last; i2++) {
				var a2 = actions[i2];
				if (a2.type != 'separator' && a2.title != '-') {
					first = i2;
					break;
				}
			}
			actions = actions.splice(first, (last-first)+1);
			var prevSeparator = false;
			for (var i3=actions.length-1,j2=0; i3>=j2; i3--) {
				var a3 = actions[i3];
				var separator = (a3.type == 'separator' || a3.title == '-');
				if (separator && prevSeparator) actions.splice(i3, 1);
				prevSeparator = separator;
			}
			
			return actions;
		},
		
		breakUrl : function(u) {
			var parts = u.split("?");
			return { path: parts[0], params: mollify.helpers.getUrlParams(u), paramsString: (parts.length > 1 ? ("?" + parts[1]) : "") };
		},
		
		getUrlParams : function(u) {
			var params = {};
			$.each(u.substring(1).split("&"), function(i, p) {
				var pp = p.split("=");
				if (!pp || pp.length < 2) return;
				params[decodeURIComponent(pp[0])] = decodeURIComponent(pp[1]);
			});
			return params;	
		},
		
		urlWithParam : function(url, param, v) {
			var p = param;
			if (v) p = param + "=" + encodeURIComponent(v);
			return url + (window.strpos(url, "?") ? "&" : "?") + p;
		},
		
		noncachedUrl : function(url) {
			return mollify.helpers.urlWithParam(url, "_="+mollify._time);
		},
		
		hasPermission : function(list, name, required) {
			if (!list || list[name] === undefined) return false;
			var v = list[name];
			
			var options = mollify.session.data.permission_types.values[name];
			if (!required || !options) return v == "1";
			
			var ui = options.indexOf(v);
			var ri = options.indexOf(required);
			return (ui >= ri);
		},
	
		formatDateTime : function(time, fmt) {
			var ft = time.toString(fmt);
			return ft;
		},
		
		parseInternalTime : function(time) {
			if (!time || time == null || typeof(time) !== 'string' || time.length != 14) return null;
			
			var ts = new Date();
			/*ts.setUTCFullYear(time.substring(0,4));
			ts.setUTCMonth(time.substring(4,6) - 1);
			ts.setUTCDate(time.substring(6,8));
			ts.setUTCHours(time.substring(8,10));
			ts.setUTCMinutes(time.substring(10,12));
			ts.setUTCSeconds(time.substring(12,14));*/
			ts.setYear(time.substring(0,4));
			ts.setMonth(time.substring(4,6) - 1);
			ts.setDate(time.substring(6,8));
			ts.setHours(time.substring(8,10));
			ts.setMinutes(time.substring(10,12));
			ts.setSeconds(time.substring(12,14));
			return ts;
		},
	
		formatInternalTime : function(time) {
			if (!time) return null;
			
			/*var year = pad(""+time.getUTCFullYear(), 4, '0', STR_PAD_LEFT);
			var month = pad(""+(time.getUTCMonth() + 1), 2, '0', STR_PAD_LEFT);
			var day = pad(""+time.getUTCDate(), 2, '0', STR_PAD_LEFT);
			var hour = pad(""+time.getUTCHours(), 2, '0', STR_PAD_LEFT);
			var min = pad(""+time.getUTCMinutes(), 2, '0', STR_PAD_LEFT);
			var sec = pad(""+time.getUTCSeconds(), 2, '0', STR_PAD_LEFT);
			return year + month + day + hour + min + sec;*/
			//var timeUTC = new Date(Date.UTC(time.getYear(), time.getMonth(), time.getDay(), time.getHours(), time.getMinutes(), time.getSeconds()));
			return mollify.helpers.formatDateTime(time, 'yyyyMMddHHmmss');
		},
		
		mapByKey : function(list, key, value) {
			var byKey = {};
			if (!list) return byKey;
			for (var i=0,j=list.length; i<j; i++) {
				var r = list[i];
				if (!window.def(r)) continue;
				var v = r[key];
				if (!window.def(v)) continue;
				
				if (window.def(value) && r[value])
					byKey[v] = r[value];
				else
					byKey[v] = r;
			}
			return byKey;
		},
		
		getKeys : function(m) {
			var list = [];
			if (m)
				for(var k in m) {
					if (!m.hasOwnProperty(k)) continue;
					list.push(k);
				}
			return list;
		},
		
		extractValue : function(list, key) {
			var l = [];
			for (var i=0,j=list.length; i<j; i++) { var r = list[i]; l.push(r[key]); }
			return l;
		},

		filter : function(list, f) {
			var result = [];
			$.each(list, function(i, it) { if (f(it)) result.push(it); });
			return result;
		},
		
		arrayize : function(i) {
			var a = [];
			if (!window.isArray(i)) {
				a.push(i);
			} else {
				return i;
			}
			return a;
		}
	};

	window.mollify = mollify;

	/* Common */
	
	window.isArray = function(o) {
		return Object.prototype.toString.call(o) === '[object Array]';
	}
	
	if(typeof String.prototype.trim !== 'function') {
		String.prototype.trim = function() {
			return this.replace(/^\s+|\s+$/g, ''); 
		}
	}
	
	if(typeof String.prototype.startsWith !== 'function') {
		String.prototype.startsWith = function(s) {
			if (!s || s.length === 0) return false;
			return this.substring(0, s.length) == s; 
		}
	}

	if(typeof String.prototype.count !== 'function') {	
		String.prototype.count = function(search) {
			var m = this.match(new RegExp(search.toString().replace(/(?=[.\\+*?\[\^\]$(){}\|])/g, "\\"), "g"));
			return m ? m.length:0;
		}
	}
	
	window.def = function(o) {
		return (typeof(o) != 'undefined');
	}
	
	if (!Array.prototype.indexOf) { 
		Array.prototype.indexOf = function(obj, start) {
			for (var i = (start || 0), j = this.length; i < j; i++) {
				if (this[i] === obj) { return i; }
			}
			return -1;
		}
	}
	
	if (!Array.prototype.remove) { 
		Array.prototype.remove = function(from, to) {
			if (typeof(to) == 'undefined' && typeof(from) == 'object')
				from = this.indexOf(from);
			if (from < 0) return;
			var rest = this.slice((to || from) + 1 || this.length);
			this.length = from < 0 ? this.length + from : from;
			return this.push.apply(this, rest);
		};
	}
	
	window.strpos = function(haystack, needle, offset) {
		// Finds position of first occurrence of a string within another  
		// 
		// version: 1109.2015
		// discuss at: http://phpjs.org/functions/strpos
		// +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   improved by: Onno Marsman    
		// +   bugfixed by: Daniel Esteban
		// +   improved by: Brett Zamir (http://brett-zamir.me)
		var i = (haystack + '').indexOf(needle, (offset || 0));
		return i === -1 ? false : i;
	}
	
	var STR_PAD_LEFT = 1;
	var STR_PAD_RIGHT = 2;
	var STR_PAD_BOTH = 3;
	
	function pad(str, len, padstr, dir) {
		if (typeof(len) == "undefined") { len = 0; }
		if (typeof(padstr) == "undefined") { padstr = ' '; }
		if (typeof(dir) == "undefined") { dir = STR_PAD_RIGHT; }
	
		if (len + 1 >= str.length) {
			switch (dir){
				case STR_PAD_LEFT:
					str = new Array(len + 1 - str.length).join(padstr) + str;
					break;
				case STR_PAD_BOTH:
					var padlen = len - str.length;
					var right = Math.ceil(padlen / 2);
					var left = padlen - right;
					str = new Array(left+1).join(padstr) + str + new Array(right+1).join(padstr);
					break;
				default:
					str = str + new Array(len + 1 - str.length).join(padstr);
					break;
			}
		}
		return str;
	}
	
	/**
	*
	*  Base64 encode / decode
	*  http://www.webtoolkit.info/
	*
	**/
	 
	window.Base64 = {
	 
		// private property
		_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	 
		// public method for encoding
		encode : function (input) {
			var output = "";
			var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			var i = 0;
	 
			input = window.Base64._utf8_encode(input);
	 
			while (i < input.length) {
	 
				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);
	 
				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;
	 
				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}
	 
				output = output +
				this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
				this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
	 
			}
	 
			return output;
		},
	 
		// public method for decoding
		decode : function (input) {
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;
	 
			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
	 
			while (i < input.length) {
	 
				enc1 = this._keyStr.indexOf(input.charAt(i++));
				enc2 = this._keyStr.indexOf(input.charAt(i++));
				enc3 = this._keyStr.indexOf(input.charAt(i++));
				enc4 = this._keyStr.indexOf(input.charAt(i++));
	 
				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;
	 
				output = output + String.fromCharCode(chr1);
	 
				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}
	 
			}
	 
			output = window.Base64._utf8_decode(output);
	 
			return output;
	 
		},
	 
		// private method for UTF-8 encoding
		_utf8_encode : function (string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";
	 
			for (var n = 0; n < string.length; n++) {
	 
				var c = string.charCodeAt(n);
	 
				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}
	 
			}
	 
			return utftext;
		},
	 
		// private method for UTF-8 decoding
		_utf8_decode : function (utftext) {
			var string = "";
			var i = 0;
			var c = 0, c1 = 0, c2 = 0;
	 
			while ( i < utftext.length ) {
	 
				c = utftext.charCodeAt(i);
	 
				if (c < 128) {
					string += String.fromCharCode(c);
					i++;
				}
				else if((c > 191) && (c < 224)) {
					c2 = utftext.charCodeAt(i+1);
					string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				}
				else {
					c2 = utftext.charCodeAt(i+1);
					var c3 = utftext.charCodeAt(i+2);
					string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}
	 
			}
	 
			return string;
		}
	}
}(window.jQuery);

/**
 * loginview.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
!function($, mollify) {

	"use strict"; // jshint ;_;
	
	mollify.view.LoginView = function(){
		var that = this;
		
		that.init = function($c) {
			mollify.dom.loadContentInto($c, mollify.templates.url("loginview.html"), that, ['localize', 'bubble']);
		}
		
		that.onLoad = function() {
			if (mollify.features.hasFeature('lost_password')) $("#mollify-login-forgot-password").show();
			if (mollify.features.hasFeature('registration') && mollify.plugins.exists("plugin-registration")) {
				$("#mollify-login-register").click(function() {
					mollify.plugins.get("plugin-registration").show();
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
					that.wait = mollify.ui.dialogs.wait({target: "mollify-login-main"});
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
			that.wait = mollify.ui.dialogs.wait({target: "mollify-login-main"});
			mollify.service.post("session/authenticate", {username: username, password: window.Base64.encode(password), remember: remember}).done(function(s) {
				mollify.events.dispatch('session/start', s);
			}).fail(function(e) {
				if (e.code == 107) this.handled = true;
				that.showLoginError();
			});
		}
		
		that.onResetPassword = function(email) {
			mollify.service.post("lostpassword", {"email": email}).done(function(r) {
				that.wait.close();
				
				mollify.ui.dialogs.notification({
					message: mollify.ui.texts.get('resetPasswordPopupResetSuccess')
				});
			}).fail(function(e) {
				this.handled = true;
				that.wait.close();
				
				mollify.ui.dialogs.info({
					message: mollify.ui.texts.get('resetPasswordPopupResetFailed')
				});
			});
		}
		
		that.showLoginError = function() {
			that.wait.close();
			
			mollify.ui.dialogs.notification({
				message: mollify.ui.texts.get('loginDialogLoginFailedMessage')
			});
		}
	};
}(window.jQuery, window.mollify);
/**
 * mainview.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
!function($, mollify) {

	"use strict"; // jshint ;_;
	
	mollify.view.MainView = function() {
		var that = this;
		this._mainFileView = false;
		this._mainConfigView = false;
		this._views = [];
		this._currentView = false;
		
		this.init = function($c, viewId) {
			that._mainFileView = new mollify.view.MainViewFileView();
			that._mainConfigView = new mollify.view.MainViewConfigView();
			that._views = [ this._mainFileView, this._mainConfigView ];

			$.each(mollify.plugins.getMainViewPlugins(), function(i, p) {
				if (!p.mainViewHandler) return;
				var view = p.mainViewHandler();
				that._views.push(view);
			});
			
			that.itemContext = new mollify.ui.itemContext();
			mollify.dom.loadContentInto($c, mollify.templates.url("mainview.html"), function() {
				that.onLoad(viewId);
			}, ['localize']);			
		}
		
		this.onLoad = function(viewId) {
			$(window).resize(that.onResize);
			that.onResize();

			mollify.dom.template("mollify-tmpl-main-username", mollify.session).appendTo("#mollify-mainview-user");
			if (mollify.session.user) {
				mollify.ui.controls.dropdown({
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
			var $mbitems = mollify.dom.template("mollify-tmpl-main-menubar", menuitems).appendTo($mb);
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
			if (that._currentView && that._currentView.viewId == viewId) {
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
			mollify.ui.hideActivePopup();
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
			var $ntf = mollify.dom.template("mollify-tmpl-main-notification", spec).hide().appendTo($trg).fadeIn(300);
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
			var $nb = mollify.dom.template("mollify-tmpl-main-navbar", nb).appendTo($("#mollify-mainview-navlist-parent"));
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
						mollify.ui.controls.dropdown({
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
					mollify.dom.template("mollify-tmpl-main-navbar-item", items).appendTo($nb);
					initItems();
				}
			};
		}
		
		this.onResize = function() {
			if (that._currentView) that._currentView.onResize();
		}
		
		this.getSessionActions = function() {
			var actions = [];		
			if (mollify.features.hasFeature('change_password') && mollify.session.user.hasPermission("change_password")) {
				actions.push({"title-key" : "mainViewChangePasswordTitle", callback: that.changePassword});
				actions.push({"title" : "-"});
			}
			actions.push({"title-key" : "mainViewLogoutTitle", callback: that.onLogout});
			return actions;
		}
		
		this.onLogout = function() {
			mollify.service.post("session/logout").done(function(s) {
				mollify.events.dispatch('session/end');
			});
		}
		
		this.changePassword = function() {	
			var $dlg = false;
			var $old = false;
			var $new1 = false;
			var $new2 = false;
			var errorTextMissing = mollify.ui.texts.get('mainviewChangePasswordErrorValueMissing');
			var errorConfirm = mollify.ui.texts.get('mainviewChangePasswordErrorConfirm');

			var doChangePassword = function(oldPw, newPw, successCb) {
				mollify.service.put("configuration/users/current/password/", {old:window.Base64.encode(oldPw), "new": window.Base64.encode(newPw) }).done(function(r) {
					successCb();
					mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewChangePasswordSuccess')});
				}).fail(function(e) {
					this.handled = true;
					if (e.code == 107) {
						mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewChangePasswordError'), type: 'error', cls: 'full', target: $dlg.find(".modal-footer")});
					} else this.handled = false;
				});
			}
			
			mollify.ui.dialogs.custom({
				title: mollify.ui.texts.get('mainviewChangePasswordTitle'),
				content: $("#mollify-tmpl-main-changepassword").tmpl({message: mollify.ui.texts.get('mainviewChangePasswordMessage')}),
				buttons: [
					{ id: "yes", "title": mollify.ui.texts.get('mainviewChangePasswordAction'), cls: "btn-primary" },
					{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
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
	
	mollify.view.MainViewFileView = function() {
		var that = this;
		this.viewId = "files";
		
		this._currentFolder = false;
		this._currentFolderData = false;
		this._viewStyle = 0;
		this._selected = [];
		this._customFolderTypes = {};
		this._selectedItems = [];
		this._formatters = {
			byteSize : new mollify.ui.formatters.ByteSize(new mollify.ui.formatters.Number(2, false, mollify.ui.texts.get('decimalSeparator'))),
			timestamp : new mollify.ui.formatters.Timestamp(mollify.ui.texts.get('shortDateTimeFormat')),
			uploadSpeed : new mollify.ui.formatters.Number(1, mollify.ui.texts.get('dataRateKbps'), mollify.ui.texts.get('decimalSeparator'))
		};
		
		this._filelist = {
			columns : [],
			addColumn : function(c) {
				that._filelist.columns[c.id] = c;
			}
		};
		
		// spec
		this._filelist.addColumn({
			"id": "name",
			"title-key": "fileListColumnTitleName",
			"sort": function(i1, i2, sort, data) {
				return i1.name.toLowerCase().localeCompare(i2.name.toLowerCase()) * sort;
			},
			"content": function(item, data) {
				return item.name;
			}
		});
		this._filelist.addColumn({
			"id": "path",
			"title-key": "fileListColumnTitlePath",
			"sort": function(i1, i2, sort, data) {
				var p1 = mollify.filesystem.rootsById[i1.root_id].name + i1.path;
				var p2 = mollify.filesystem.rootsById[i2.root_id].name + i2.path;
				return p1.toLowerCase().localeCompare(p2.toLowerCase()) * sort;
			},
			"content": function(item, data) {
				return '<span class="item-path-root">'+mollify.filesystem.rootsById[item.root_id].name + '</span>: <span class="item-path-val">' + item.path + '</span>';
			}
		});
		this._filelist.addColumn({
			"id": "type",
			"title-key": "fileListColumnTitleType",
			"sort": function(i1, i2, sort, data) {
				var e1 = i1.is_file ? (i1.extension || '') : '';
				var e2 = i2.is_file ? (i2.extension || '') : '';
				return e1.toLowerCase().localeCompare(e2.toLowerCase()) * sort;
			},
			"content": function(item, data) {
				return item.is_file ? (item.extension || '') : '';
			}
		});
		this._filelist.addColumn({
			"id": "size",
			"title-key": "fileListColumnTitleSize",
			"min-width": 75,
			"sort": function(i1, i2, sort, data) {
				var s1 = (i1.is_file ? parseInt(i1.size, 10) : 0);
				var s2 = (i2.is_file ? parseInt(i2.size, 10) : 0);
				return (s1-s2) * sort;
			},
			"content": function(item, data) {
				return item.is_file ? that._formatters.byteSize.format(item.size) : '';
			}
		});
		this._filelist.addColumn({
			"id": "file-modified",
			"request-id": "core-file-modified",
			"title-key": "fileListColumnTitleLastModified",
			"width": 180,
			"sort": function(i1, i2, sort, data) {
				if (!i1.is_file && !i2.is_file) return 0;
				if (!data || !data["core-file-modified"]) return 0;
				
				var ts1 = data["core-file-modified"][i1.id] ? data["core-file-modified"][i1.id] * 1 : 0;
				var ts2 = data["core-file-modified"][i2.id] ? data["core-file-modified"][i2.id] * 1 : 0;
				return ((ts1 > ts2) ? 1 : -1) * sort;
			},
			"content": function(item, data) {
				if (!item.id || !item.is_file || !data || !data["core-file-modified"] || !data["core-file-modified"][item.id]) return "";
				return that._formatters.timestamp.format(mollify.helpers.parseInternalTime(data["core-file-modified"][item.id]));
			}
		});
		this._filelist.addColumn({
			"id": "item-description",
			"request-id": "core-item-description",
			"title-key": "fileListColumnTitleDescription",
			"sort": function(i1, i2, sort, data) {
				if (!i1.is_file && !i2.is_file) return 0;
				if (!data || !data["core-item-description"]) return 0;
				
				var d1 = data["core-item-description"][i1.id] ? data["core-item-description"][i1.id] : '';
				var d2 = data["core-item-description"][i2.id] ? data["core-item-description"][i2.id] : '';
				return ((d1 > d2) ? 1 : -1) * sort;
			},
			"content": function(item, data) {
				if (!item.id || !data || !data["core-item-description"] || !data["core-item-description"][item.id]) return "";
				var desc = data["core-item-description"][item.id];
				var stripped = desc.replace(/<\/?[^>]+(>|$)/g, '');
				return '<div class="item-description-container" title="'+stripped+'">'+desc+'</div>';
			}
		});
		this._filelist.addColumn({
			"id": "go-into-folder",
			"title": "",
			"width": 25,
			"sort": function(i1, i2, sort, data) {
				return 0;
			},
			"content": function(item, data) {
				if (item.is_file) return "";
				return '<div class="go-into-folder"><i class="icon-level-down"></i></div>';
			},
			"on-init": function(list) {
				list.$i.delegate(".go-into-folder", "click", function(e) {
					var item = list.getItemForElement($(this));
					if (!item || item.is_file) return;
					that.changeToFolder(item);
					return false;
				});
			}
		});
		
		this.init = function(mainview) {
			that.title = mollify.ui.texts.get('mainviewMenuTitle');
			that.icon = "icon-file-alt";
			that._viewStyle = 0;
			if (mollify.settings["file-view"]["default-view-mode"] == "small-icon") that._viewStyle = 1;
			if (mollify.settings["file-view"]["default-view-mode"] == "large-icon") that._viewStyle = 2;

			mollify.events.addEventHandler(that.onEvent);
			
			that.addCustomFolderType("search", {
				onSelectFolder : function(f) {					
					var df = $.Deferred();
					if (!f) return df.resolve({type:"search", id:""}, {items:[], info:[]});
					
					var text = decodeURIComponent(f);
					mollify.service.post("filesystem/search", {text: text, rq_data: that.getDataRequest()}).done(function(r) {
                        var items = [];
                        for (var id in r.matches) {
                            items.push(r.matches[id].item);
                        }
                        var fo = {
							id: f,
							type: "search"
						};
						var data = {
							text: text,
							items: items,
							data: r.data,
							info: r
						};
						df.resolve(fo, data);
					});
					return df.promise();
				},
		
				onRenderFolderView : function(f, fi, $h, $tb) {
					mollify.dom.template("mollify-tmpl-main-searchresults", { folder: f, info: fi }).appendTo($h);
					$("#mollify-searchresults-title-text").text(mollify.ui.texts.get('mainViewSearchResultsTitle', [""+fi.info.count]));
					$("#mollify-searchresults-desc-text").text(mollify.ui.texts.get('mainViewSearchResultsDesc', [fi.text]));
					
					var $fa = $("#mollify-fileview-folder-actions");
					that.addCommonFileviewActions($fa);
				},
				
				onItemListRendered : function(f, fi, items) {
					// tooltips
					var matchList = function(l) {
						var r = "";
						var first = true;
						$.each(l, function(i, li) {
							if (!first) r = r + ", ";
							r = r + li.type;
							first = false;
						});
						return r;
					};
					var matchesTitle = mollify.ui.texts.get('mainViewSearchResultTooltipMatches');
					$(".mollify-filelist-item").each(function() {
						var $i = $(this);
						var item = $i.tmplItem().data;
						var title = mollify.filesystem.rootsById[item.root_id].name + '/' + item.path + ', ' + matchesTitle + matchList(fi.info.matches[item.id].matches);

						mollify.ui.controls.tooltip($i, { title: title });
					});
				}
			});
			
			$.each(mollify.plugins.getFileViewPlugins(), function(i, p) {
				if (p.fileViewHandler.onInit) p.fileViewHandler.onInit(that);
				
				if (!p.fileViewHandler.filelistColumns) return;
				var cols = p.fileViewHandler.filelistColumns();
				if (!cols) return;
				
				for (var j=0;j<cols.length;j++)
					that._filelist.addColumn(cols[j]);
			});
			
			that.itemContext = new mollify.ui.itemContext();
		}

		this.addCustomFolderType = function(id, h) {
			this._customFolderTypes[id] = h;
		}
		
		this.onResize = function() {}
		
		this.onActivate = function(h) {
			mollify.dom.template("mollify-tmpl-fileview").appendTo(h.content);
			that.showProgress();
			// TODO expose file urls
			
			var navBarItems = [];
			$.each(mollify.filesystem.roots, function(i, f) {
				navBarItems.push({title:f.name, obj: f, callback:function(){ that.changeToFolder(f); }})
			});
			that.rootNav = h.addNavBar({
				title: mollify.ui.texts.get("mainViewRootsTitle"),
				items: navBarItems,
				onRender: mollify.ui.draganddrop ? function($nb, $items, objs) {
					mollify.ui.draganddrop.enableDrop($items, {
						canDrop : function($e, e, obj) {
							if (!obj || obj.type != 'filesystemitem') return false;
							var item = obj.payload;
							var me = objs($e);
							return that.canDragAndDrop(me, item);
						},
						dropType : function($e, e, obj) {
							if (!obj || obj.type != 'filesystemitem') return false;
							var item = obj.payload;
							var me = objs($e);
							return that.dropType(me, item);
						},
						onDrop : function($e, e, obj) {
							if (!obj || obj.type != 'filesystemitem') return;
							var item = obj.payload;
							var me = objs($e);							
							that.onDragAndDrop(me, item);
						}
					});
				} : false
			});
			
			that.initViewTools(h.tools);
			that.initList();
			
			that.uploadProgress = new UploadProgress($("#mollify-mainview-progress"));
			that._dndUploader = false;
			
			if (mollify.ui.uploader && mollify.ui.uploader.initDragAndDropUploader) {
				that._dndUploader = mollify.ui.uploader.initDragAndDropUploader({
					container: mollify.App.getElement(),
					dropElement: $("#mollify-folderview"),
					handler: that._getUploadHandler()
				});
			}
			
			that._scrollOutThreshold = 100000;
			that._scrollInThreshold = 0;
			$(window).bind('scroll', that._updateScroll);
			
			$.each(mollify.plugins.getFileViewPlugins(), function(i, p) {
				if (p.fileViewHandler.onActivate)
					p.fileViewHandler.onActivate(mollify.App.getElement(), h);
			});
			
			if (mollify.filesystem.roots.length === 0) {
				that.showNoRoots();
				return;
			}
			
			var params = mollify.request.getParams();
			if (params.path) {
				mollify.filesystem.findFolder({path: params.path}, that.getDataRequest()).done(function(r) {
					var folder = r.folder;
					that.changeToFolder(folder);
				}).fail(function(e) {
					if (e.code == 203) {
						mollify.ui.dialogs.error({ message: mollify.ui.texts.get('mainviewFolderNotFound', params.path) });
						this.handled = true;
					}
					that.hideProgress();
					that.openInitialFolder();
				});
				return;
			}
						
			if (h.id) {
				that.changeToFolder(h.id.join("/")).fail(function() {
					this.handled = true;
					//TODO show error message that folder was not found?
					that.hideProgress();
					that.openInitialFolder();					
				});
			} else
				that.openInitialFolder();
		};
		
		this.onRestoreView = function(id) {
			that.changeToFolder(id.join("/"), true);
		};
		
		this._getUploadHandler = function(c) {
			return {
				isUploadAllowed: function(files) {
					if (!files) return false;
					var allowed = true;
					$.each(files, function(i, f) {
						var fn = files[i].name;
						if (!fn) return;
						
						var ext = fn.split('.').pop();
						if (!ext) return;
						
						ext = ext.toLowerCase();
						if (mollify.session.data.filesystem.forbidden_file_upload_types.length > 0 && mollify.session.data.filesystem.forbidden_file_upload_types.indexOf(ext) >= 0) allowed = false;

						if (mollify.session.data.filesystem.allowed_file_upload_types.length > 0 && mollify.session.data.filesystem.allowed_file_upload_types.indexOf(ext) < 0) allowed = false;
					});
					if (!allowed) {
						mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewFileUploadNotAllowed'), type: "warning"});
					}
					return allowed;
				},
				start: function(files, ready) {
					that.uploadProgress.show(mollify.ui.texts.get(files.length > 1 ? "mainviewUploadProgressManyMessage" : "mainviewUploadProgressOneMessage", files.length), function() {
						ready();
					});
				},
				progress: function(pr, br) {
					var speed = "";
					if (br) speed = that._formatters.uploadSpeed.format(br/1024);
					that.uploadProgress.set(pr, speed);
				},
				finished: function() {
					if (c) c.close();
					that.uploadProgress.hide();
					mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewFileUploadComplete'), type: "success"});
					that.refresh();
				},
				failed: function() {
					if (c) c.close();
					that.uploadProgress.hide();
					mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewFileUploadFailed'), type: "error"});
				}
			};
		};
		
		this._updateScroll = function() {
			var s = $(window).scrollTop();			
			var $e = $("#mollify-folderview");
			
			var isDetached = $e.hasClass("detached");
			var toggle = (!isDetached && s > that._scrollOutThreshold) || (isDetached && s < that._scrollInThreshold);
			if (!toggle) return;
			
			if (!isDetached) $("#mollify-folderview").addClass("detached");
			else $("#mollify-folderview").removeClass("detached");
		};
		
		this.openInitialFolder = function() {
			if (mollify.filesystem.roots.length === 0) that.showNoRoots();
			else if (mollify.filesystem.roots.length == 1) that.changeToFolder(mollify.filesystem.roots[0]);
			else that.changeToFolder(null);
		};
		
		this.onDeactivate = function() {
			$(window).unbind('scroll');
			
			if (that._dndUploader) that._dndUploader.destroy();
			
			$.each(mollify.plugins.getFileViewPlugins(), function(i, p) {
				if (p.fileViewHandler.onDeactivate)
					p.fileViewHandler.onDeactivate();
			});
		};
		
		this.initViewTools = function($t) {
			mollify.dom.template("mollify-tmpl-fileview-tools").appendTo($t);
			
			mollify.ui.process($t, ["radio"], that);
			that.controls["mollify-fileview-style-options"].set(that._viewStyle);
			
			var onSearch = function() {
				var val = $("#mollify-fileview-search-input").val();
				if (!val || val.length === 0) return;
				$("#mollify-fileview-search-input").val("");
				that.changeToFolder({ type: "search", id: encodeURIComponent(val) });
			};
			$("#mollify-fileview-search-input").keyup(function(e){
				if (e.which == 13) onSearch();
			});
			$("#mollify-fileview-search > button").click(onSearch);
		};
				
		this.getDataRequest = function() {
			var rq = (!that._currentFolder || !that._currentFolder.type) ? {'core-parent-description': {}} : {};
			return $.extend(rq, that.itemWidget.getDataRequest ? that.itemWidget.getDataRequest() : {});
		};
		
		this.getCurrentFolder = function() {
			return that._currentFolder;
		};
		
		this.onEvent = function(e) {
			if (!e.type.startsWith('filesystem/')) return;
			//var files = e.payload.items;
			//TODO check if affects this view
			that.refresh();
		};
				
		this.onRadioChanged = function(groupId, valueId, i) {
			if (groupId == "mollify-fileview-style-options") that.onViewStyleChanged(valueId, i);
		};
		
		this.onViewStyleChanged = function(id, i) {
			that._viewStyle = i;
			that.initList();
			that.refresh();
		};
	
		this.showNoRoots = function() {
			//TODO show message, for admin instruct opening admin tool?
			that._currentFolder = false;
			that._currentFolderData = {items: mollify.filesystem.roots};
			that._updateUI();
		};
			
		this.showProgress = function() {
			$("#mollify-folderview-items").addClass("loading");
		};
	
		this.hideProgress = function() {
			$("#mollify-folderview-items").removeClass("loading");
		};
	
		this.changeToFolder = function(f, noStore) {
			var id = f;
			if (!id) {
				if (mollify.filesystem.roots)
					id = mollify.filesystem.roots[0].id;
			} else if (typeof(id) != "string") id = that._getFolderPublicId(id);	
		
			if (!noStore) mollify.App.storeView("files/"+ (id ? id : ""));
			
			if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type]) {
				if (that._customFolderTypes[that._currentFolder.type].onFolderDeselect)
					that._customFolderTypes[that._currentFolder.type].onFolderDeselect(that._currentFolder);
			}
			window.scrollTo(0, 0);
			that._selectedItems = [];
			that._currentFolder = false;
			that._currentFolderData = false;
			that.rootNav.setActive(false);

			if (!id) return $.Deferred().resolve();
			return that._onSelectFolder(id);
		};
		
		this._getFolderPublicId = function(f) {
			if (!f) return "";
			if (f.type && that._customFolderTypes[f.type])
				return f.type + "/" + f.id;
			return f.id;
		};
		
		this._onSelectFolder = function(id) {
			var onFail = function() {
				that.hideProgress();
			};
			mollify.ui.hideActivePopup();
			that.showProgress();
			
			var idParts = id ? id.split("/") : [];
			if (idParts.length > 1 && that._customFolderTypes[idParts[0]]) {
				return that._customFolderTypes[idParts[0]].onSelectFolder(idParts[1]).done(that._setFolder).fail(onFail);
			} else if (!id || idParts.length == 1) {
				return mollify.filesystem.folderInfo(id ? idParts[0] : null, true, that.getDataRequest()).done(function(r) {
					var folder = r.folder;
					var data = r;
					data.items = r.folders.slice(0).concat(r.files);
					
					that._setFolder(folder, data);
				}).fail(onFail);
			} else {
				// invalid id, just ignore
				that.hideProgress();
				return $.Deferred().reject();
			}
		};
		
		this.refresh = function() {
			if (!that._currentFolder) return;
			that._onSelectFolder(that._getFolderPublicId(that._currentFolder));
		};
		
		this._setFolder = function(folder, data) {
			that._currentFolder = folder;
			that._currentFolderData = data;
			
			that.hideProgress();
			that._updateUI();
		};
		
		this._canWrite = function() {
			return mollify.filesystem.hasPermission(that._currentFolder, "filesystem_item_access", "rw");
		}
		
		this.onRetrieveUrl = function(url) {
			if (!that._currentFolder) return;
			
			that.showProgress();
			mollify.service.post("filesystem/"+that._currentFolder.id+"/retrieve", {url:url}).done(function(r) {
				that.hideProgress();
				that.refresh();
			}).fail(function(error) {
				that.hideProgress();
				//301 resource not found
				if (error.code == 301) {
					this.handled = true;
					mollify.ui.views.dialogs.error({
						message: mollify.ui.texts.get('mainviewRetrieveFileResourceNotFound', [url])
					});
				}
			});
		};

		this.dropType = function(to, i) {
			var single = false;	
			if (!window.isArray(i)) single = i;
			else if (i.length === 0) single = i[0];
			
			var copy = (!single || to.root_id != single.root_id);
			return copy ? "copy" : "move";
		};
					
		this.canDragAndDrop = function(to, itm) {
			var single = false;	
			if (!window.isArray(itm)) single = itm;
			else if (itm.length === 0) single = itm[0];
			
			if (single)
				return that.dropType(to, single) == "copy" ? mollify.filesystem.canCopyTo(single, to) : mollify.filesystem.canMoveTo(single, to);
			
			var can = true;
			for(var i=0;i<itm.length; i++) {
				var item = itm[i];
				if (!(that.dropType(to, item) == "copy" ? mollify.filesystem.canCopyTo(item, to) : mollify.filesystem.canMoveTo(item, to))) {
					can = false;
					break;
				}
			}
			return can;
		};
		
		this.onDragAndDrop = function(to, itm) {
			var copy = (that.dropType(to, itm) == 'copy');
			//console.log((copy ? "copy " : "move ") +itm.name+" to "+to.name);
			
			if (copy) mollify.filesystem.copy(itm, to);
			else mollify.filesystem.move(itm, to);
		};
		
		this._updateUI = function() {
			var opt = {
				title: function() {
					return this.data.title ? this.data.title : mollify.ui.texts.get(this.data['title-key']);
				}
			};
			var $h = $("#mollify-folderview-header-content").empty();
						
			if (that._currentFolder && that._currentFolder.type) {
				if (that._customFolderTypes[that._currentFolder.type]) {
					that._customFolderTypes[that._currentFolder.type].onRenderFolderView(that._currentFolder, that._currentFolderData, $h, $tb);
				}
			} else {
				var currentRoot = (that._currentFolderData && that._currentFolderData.hierarchy) ? that._currentFolderData.hierarchy[0] : false;
				that.rootNav.setActive(currentRoot);
				
				if (that._currentFolder)
					mollify.dom.template("mollify-tmpl-fileview-header", {canWrite: that._canWrite(), folder: that._currentFolder}).appendTo($h);
				else
					mollify.dom.template("mollify-tmpl-main-rootfolders").appendTo($h);

				var $tb = $("#mollify-fileview-folder-tools").empty();
				var $fa = $("#mollify-fileview-folder-actions");

				if (that._currentFolder) {
					if (that._canWrite()) {
						mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-folder-close' }, opt).appendTo($tb).click(function() {
							mollify.ui.controls.dynamicBubble({element: $(this), content: mollify.dom.template("mollify-tmpl-main-createfolder-bubble"), handler: {
								onRenderBubble: function(b) {
									var $i = $("#mollify-mainview-createfolder-name-input");
									var onCreate = function(){
										var name = $i.val();
										if (!name) return;

										b.hide();
										mollify.filesystem.createFolder(that._currentFolder, name);
									};
									$("#mollify-mainview-createfolder-button").click(onCreate);
									$i.bind('keypress', function(e) {
										if ((e.keyCode || e.which) == 13) onCreate();
									}).focus();
								}
							}});
							return false;
						});
						if (mollify.ui.uploader) mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-upload-alt' }, opt).appendTo($tb).click(function() {
							mollify.ui.controls.dynamicBubble({element: $(this), content: mollify.dom.template("mollify-tmpl-main-addfile-bubble"), handler: {
								onRenderBubble: function(b) {
									mollify.ui.uploader.initUploadWidget($("#mollify-mainview-addfile-upload"), {
										url: mollify.filesystem.getUploadUrl(that._currentFolder),
										handler: that._getUploadHandler(b)
									});
									
									if (!mollify.features.hasFeature('retrieve_url')) {
										$("#mollify-mainview-addfile-retrieve").remove();
									}
									var onRetrieve = function() {
										var val = $("#mollify-mainview-addfile-retrieve-url-input").val();
										if (!val || val.length < 4 || val.substring(0,4).toLowerCase().localeCompare('http') !== 0) return false;
										b.close();
										that.onRetrieveUrl(val);
									};
									$("#mollify-mainview-addfile-retrieve-url-input").bind('keypress', function(e) {
										if ((e.keyCode || e.which) == 13) onRetrieve();
									});
									$("#mollify-mainview-addfile-retrieve-button").click(onRetrieve);
								}
							}});
							return false;
						});
					}
					
					// FOLDER
					var actionsElement = mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-cog', dropdown: true }, opt).appendTo($fa);
					mollify.ui.controls.dropdown({
						element: actionsElement,
						items: false,
						hideDelay: 0,
						style: 'submenu',
						onShow: function(drp, items) {
							if (items) return;
						
							that.getItemActions(that._currentFolder, function(a) {
								if (!a) {
									drp.hide();
									return;
								}
								drp.items(a);
							});
						}
					});
				
					that.setupHierarchy(that._currentFolderData.hierarchy, $tb);
				
					that.showProgress();
				}

				if (that._dndUploader)
					that._dndUploader.setUrl(that._canWrite() ? mollify.filesystem.getUploadUrl(that._currentFolder) : false);
				that.addCommonFileviewActions($fa);
			}
			
			mollify.ui.process($h, ['localize']);

			that._scrollOutThreshold = $("#mollify-folderview-header").outerHeight() + 40;
			that._scrollInThreshold = that._scrollOutThreshold - 60;
			$("#mollify-folderview-detachholder").css("height", (that._scrollInThreshold + 40)+"px");
			$("#mollify-folderview").removeClass("detached");
			that.onResize();
			that._updateSelect();
			
			// show description
			var descriptionExists = that._currentFolderData.data && that._currentFolderData.data['core-parent-description'];
			if (descriptionExists)
				$("#mollify-folder-description").text(that._currentFolderData.data['core-parent-description']);
			
			var $dsc = $("#mollify-folder-description");
			var descriptionEditable = that._currentFolder && !that._currentFolder.type && $dsc.length > 0 && mollify.session.features.descriptions && mollify.filesystem.hasPermission(that._currentFolder, "edit_description");
			if (descriptionEditable) {
				mollify.ui.controls.editableLabel({element: $dsc, hint: mollify.ui.texts.get('mainviewDescriptionHint'), onedit: function(desc) {
					mollify.service.put("filesystem/"+that._currentFolder.id+"/description/", {description: desc});
				}});
			} else {
				if (!descriptionExists) $dsc.hide();
			}
			
			// update file list
			that._updateList();
			
			that.hideProgress();
		};
		
		this.addCommonFileviewActions = function($c) {
			//TODO kaikki action-luonnit omaan luokkaan
			var opt = {
				title: function() {
					return this.data.title ? this.data.title : mollify.ui.texts.get(this.data['title-key']);
				}
			};
			
			// SELECT
			that._selectModeBtn = mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-check', dropdown: true, style: "narrow", action: true }, opt).appendTo($c).click(that._onToggleSelect);
			mollify.ui.controls.dropdown({
				element: that._selectModeBtn,
				items: false,
				hideDelay: 0,
				style: 'submenu',
				onShow: function(drp) {						
					that._getSelectionActions(function(a) {
						if (!a) {
							drp.hide();
							return;
						}
						drp.items(a);
					});
				}
			});
			
			// REFRESH					
			mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-refresh' }, opt).appendTo($c).click(that.refresh);	
		};
		
		this._getViewItems = function() {
			//if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type])
			//	return
			return that._currentFolderData.items;
		};
		
		this._getSelectionActions = function(cb) {
			var result = [];
			if (that._selectMode && that._selectedItems.length > 0) {
				var plugins = mollify.plugins.getItemCollectionPlugins(that._selectedItems);		
				result = mollify.helpers.getPluginActions(plugins);
				if (result.length > 0)
					result.unshift({"title" : "-"});
			}
			result.unshift({"title-key" : "mainViewFileViewSelectNone", callback: function() { that._updateSelect([]); } });
			result.unshift({"title-key" : "mainViewFileViewSelectAll", callback: function() { that._updateSelect(that._getViewItems()); } });
			cb(mollify.helpers.cleanupActions(result));
		};
		
		this._onToggleSelect = function() {
			that._selectMode = !that._selectMode;
			that._updateSelect();
		};
		
		this._updateSelect = function(sel) {
			if (sel !== undefined) {
				that._selectedItems = sel;
				that._selectMode = true;
			}
			if (that._selectMode)
				that._selectModeBtn.addClass("active");
			else
				that._selectModeBtn.removeClass("active");
			that.itemWidget.setSelectMode(that._selectMode);
			if (that._selectMode) that.itemWidget.setSelection(that._selectedItems);
		};
		
		this._getRootItems = function() {
			var rootItems = [];
			var rootCb = function(r) {
				return function() { that.changeToFolder(r); };
			};
			for(var i=0,j=mollify.filesystem.roots.length; i<j;i++) {
				var root = mollify.filesystem.roots[i];
				rootItems.push({
					title: root.name,
					callback: rootCb(root)
				});
			}
			return rootItems;
		};
					
		this.setupHierarchy = function(h, $t) {
			var items = h;
			var p = $t.append(mollify.dom.template("mollify-tmpl-fileview-folder-hierarchy", {items: items}));
			
			mollify.ui.controls.dropdown({
				element: $("#mollify-folder-hierarchy-item-root"),
				items: that._getRootItems(),
				hideDelay: 0,
				style: 'submenu'
			});
			
			var $hi = $(".mollify-folder-hierarchy-item").click(function() {
				var folder = $(this).tmplItem().data;
				that.changeToFolder(folder);
			});
			
			if (mollify.ui.draganddrop) {
				mollify.ui.draganddrop.enableDrop($hi.find("a"), {
					canDrop : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return false;
						var itm = obj.payload;
						var me = $e.parent().tmplItem().data;
						return that.canDragAndDrop(me, itm);
					},
					dropType : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return false;
						var itm = obj.payload;
						var me = $e.tmplItem().data;
						return that.dropType(me, itm);
					},
					onDrop : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return;
						var itm = obj.payload;
						var me = $e.parent().tmplItem().data;
						that.onDragAndDrop(me, itm);
					}
				});
			}
		};
		
		this.isListView = function() { return that._viewStyle === 0; };
		
		this._handleCustomAction = function(action, item, t) {
			if (!mollify.settings["file-view"] || !mollify.settings["file-view"].actions) return false;
			var actions = mollify.settings["file-view"].actions;
			if (!actions[action] || (typeof(actions[action]) !== "function")) return false;
			
			var ctx = that._getCtxObj(item, t);
			var response = actions[action](item, ctx);
			if (!response) return false;

			if (typeof(response) == "string") {
				if (response == "open_popup") that.itemContext.open(ctx);
				else if (response == "open_menu") that.showActionMenu(item, ctx.element);
				else if (!item.is_file && response == "go_into_folder") that.changeToFolder(item);
			}
			return true;
		};
		
		this._getCtxObj = function(item, target) {
			return {
				item: item,
				viewtype: that.isListView() ? "list" : "icon",
				target: target,
				element: that.itemWidget.getItemContextElement(item),
				viewport: that.itemWidget.getContainerElement(),
				container: $("#mollify-folderview-items"),
				folder: that._currentFolder,
				folder_writable: that._currentFolder ? mollify.filesystem.hasPermission(that._currentFolder, "filesystem_item_access", "rw") : false
			};	
		}
		
		this.initList = function() {
			var $h = $("#mollify-folderview-header-items").empty();
			if (that.isListView()) {
				var cols = mollify.settings["file-view"]["list-view-columns"];
				that.itemWidget = new FileList('mollify-folderview-items', $h, 'main', this._filelist, cols);
			} else {
				var thumbs = !!mollify.session.features.thumbnails;
				that.itemWidget = new IconView('mollify-folderview-items', $h, 'main', that._viewStyle == 1 ? 'iconview-small' : 'iconview-large', thumbs);
			}
			
			that.itemWidget.init({
				onFolderSelected : that.onFolderSelected,
				canDrop : that.canDragAndDrop,
				dropType : that.dropType,
				onDrop : that.onDragAndDrop,
				onClick: function(item, t, e) {
					if (that._handleCustomAction("onClick", item, t)) return;
					
					var ctx = that._getCtxObj(item, t);					
					if (that.isListView() && t != 'icon') {
						var col = that._filelist.columns[t];
						if (col["on-click"]) {
							col["on-click"](item, that._currentFolderData.data, ctx);
							return;
						}
					}
					var showContext = false;
					if (that.isListView()) {
						if (!item.is_file) {
							// folder click goes into the folder, icon opens context
							if (t=='name') that.changeToFolder(item);
							else if (t=='icon') showContext = true;
						} else {
							if (t=='name' || t=='icon') showContext = true;
						}
					} else {
						if (t=='info' || item.is_file) showContext = true;
						else that.changeToFolder(item); 
					}
					
					if (showContext) that.itemContext.open(ctx);
				},
				onDblClick: function(item) {
					if (that._handleCustomAction("onDblClick", item)) return;
					if (item.is_file) return;
					that.changeToFolder(item);
				},
				onRightClick: function(item, t, e) {
					if (that._handleCustomAction("onRightClick", item, t)) return;
					that.showActionMenu(item, that.itemWidget.getItemContextElement(item));
				},
				onContentRendered : function(items, data) {
					if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type]) {
						if (that._customFolderTypes[that._currentFolder.type].onItemListRendered)
							that._customFolderTypes[that._currentFolder.type].onItemListRendered(that._currentFolder, that._currentFolderData, items);
					}
				},
				getSelectedItems : function() {
					if (!that._selectMode || that._selectedItems.length === 0) return false;
					return that._selectedItems;
				},
				onSelectUnselect: function(item) {
					if (that._selectedItems.indexOf(item) >= 0) that._selectedItems.remove(item);
					else that._selectedItems.push(item);
					that.itemWidget.setSelection(that._selectedItems);
				}
			});
		};
		
		this._updateList = function() {
			that._items = that._currentFolderData.items;
			that._itemsById = mollify.helpers.mapByKey(that._items, "id");
			if (that._selectedItems) {
				var existing = [];
				var ids = {};
				$.each(that._selectedItems, function(i, itm) {
					var newItem = that._itemsById[itm.id];
					if (!newItem || ids[itm.id]) return;
					existing.push(newItem);
					ids[itm.id] = true;
				});
				that._selectedItems = existing;
			}
			//$("#mollify-folderview-items").css("top", $("#mollify-folderview-header").outerHeight()+"px");
			that.itemWidget.content(that._items, that._currentFolderData.data);
			if (that._selectMode) that.itemWidget.setSelection(that._selectedItems);
		};
		
		this.showActionMenu = function(item, c) {
			c.addClass("open");
			var popup = mollify.ui.controls.popupmenu({ element: c, onHide: function() {
				c.removeClass("open");
				that.itemWidget.removeHover();
			}});
			
			that.getItemActions(item, function(a) {
				if (!a) {
					popup.hide();
					return;
				}
				popup.items(a);
			});
		};
		
		this.getItemActions = function(item, cb) {
			mollify.filesystem.itemDetails(item, mollify.plugins.getItemContextRequestData(item)).done(function(d) {
				if (!d) {
					cb([]);
					return;
				}
				var ctx = {
					details: d,
					folder: that._currentFolder,
					folder_writable: that._currentFolder ? mollify.filesystem.hasPermission(that._currentFolder, "filesystem_item_access", "rw") : false
				};
				cb(mollify.helpers.cleanupActions(mollify.helpers.getPluginActions(mollify.plugins.getItemContextPlugins(item, ctx))));
			});
		};
	};
	
	var UploadProgress = function($e) {
		var t = this;
		this._h = $e.height();
		t._$title = $e.find(".title");
		t._$speed = $e.find(".speed");
		t._$bar = $e.find(".bar");
		
		return {
			show : function(title, cb) {
				$e.css("bottom", (0 - t._h)+"px");
				t._$title.text(title ? title : "");
				t._$speed.text("");
				t._$bar.css("width", "0%");
				$e.show().animate({"bottom": "0"}, 500, cb);
			},
			set : function(progress, speed) {
				t._$bar.css("width", progress+"%");
				t._$speed.text(speed ? speed : "");
			},
			hide : function(cb) {
				setTimeout(function() {
					$e.animate({"bottom": (0 - t._h) + "px"}, 500, function() {
						t._$bar.css("width", "0%");
						$e.hide();
						if (cb) cb();
					});
				}, 1000);
			}
		}
	};
	
	var IconView = function(container, $headerContainer, id, cls, thumbs) {
		var t = this;
		t.$c = $("#"+container);
		t.viewId = 'mollify-iconview-'+id;
		
		this.init = function(p) {
			t.p = p;
			
			$headerContainer.append("<div class='mollify-iconview-header'></div>");
			
			mollify.dom.template("mollify-tmpl-iconview", {viewId: t.viewId}).appendTo(t.$c.empty());
			t.$l = $("#"+t.viewId);
			if (cls) t.$l.addClass(cls);
		};
		
		this.content = function(items, data) {
			t.items = items;
			t.data = data;
			
			var supportedThumbs = ["jpg", "png", "gif", "jpeg"];	//TODO settings
			
			mollify.dom.template("mollify-tmpl-iconview-item", items, {
				showThumb: function(item) {
					if (!thumbs || !item.is_file) return false;
					return (supportedThumbs.indexOf(item.extension) >= 0);
				},
				thumbUrl: function(item) {
					return mollify.service.url("filesystem/"+item.id+"/thumbnail/");
				},
				typeClass : function(item) {
					var c = item.is_file ? 'item-file' : 'item-folder';
					if (item.is_file && item.extension) c += ' item-type-'+item.extension;
					else if (!item.is_file && item.id == item.root_id) c += ' item-root-folder';
					return c;
				}
			}).appendTo(t.$l.empty());
			
			var $items = t.$l.find(".mollify-iconview-item").hover(function() {
				$(this).addClass("hover");
			}, function() {
				$(this).removeClass("hover");
			}).bind("contextmenu",function(e){
				e.preventDefault();
				var $t = $(this);
				t.p.onRightClick($t.tmplItem().data, "", $t);
				return false;
			}).single_double_click(function(e) {
				var $t = $(this);
				var itm = $t.tmplItem().data;
				var $trg = $(e.target);
				if ($trg.hasClass("mollify-iconview-item-sel-option")) {
					t.p.onSelectUnselect(itm);
					return;
				}
				var col = "";
				if ($trg.parent().hasClass("mollify-iconview-item-info")) col = "info";

				t.p.onClick(itm, col, $t);
			},function() {
				t.p.onDblClick($(this).tmplItem().data);
			}).attr('unselectable', 'on').css({
				'-moz-user-select':'none',
				'-webkit-user-select':'none',
				'user-select':'none',
				'-ms-user-select':'none'
			});
			/*.draggable({
				revert: "invalid",
				distance: 10,
				addClasses: false,
				zIndex: 2700
			}).droppable({
				hoverClass: "drophover",
				accept: function(i) { return t.p.canDrop ? t.p.canDrop($(this).tmplItem().data, $(i).tmplItem().data) : false; }
			})*/
			
			if (mollify.ui.draganddrop) {
				mollify.ui.draganddrop.enableDrag($items, {
					onDragStart : function($e, e) {
						var item = $e.tmplItem().data;
						var sel = t.p.getSelectedItems();
						if (!sel) sel = item;
						else if (sel.indexOf(item) < 0) sel.push(item);
						return {type:'filesystemitem', payload: sel};
					}
				});
				mollify.ui.draganddrop.enableDrop(t.$l.find(".mollify-iconview-item.item-folder"), {
					canDrop : function($e, e, obj) {
						if (!t.p.canDrop || !obj || obj.type != 'filesystemitem') return false;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						return t.p.canDrop(me, i);
					},
					dropType : function($e, e, obj) {
						if (!t.p.dropType || !obj || obj.type != 'filesystemitem') return false;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						return t.p.dropType(me, i);
					},
					onDrop : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						if (t.p.onDrop) t.p.onDrop(me, i);
					}
				});
			}
			
			t.p.onContentRendered(items, data);
		};
		
		/*this.getItemContextElement = function(item) {
			return t.$l.find("#mollify-iconview-item-"+item.id);
		};*/
		
		this.getItemContextElement = function(item) {
			return t.$l.find("#mollify-iconview-item-"+item.id);
		};
		
		this.getContainerElement = function() {
			return t.$l;	
		};
		
		this.removeHover = function() {
			t.$l.find(".mollify-iconview-item.hover").removeClass('hover');
		};
		
		this.setSelectMode = function(sm) {
			t.$l.find(".mollify-iconview-item.selected").removeClass("selected");
			if (sm) {
				t.$l.addClass("select");
			} else {
				t.$l.removeClass("select");
			}
		};
		
		this.setSelection = function(items) {
			t.$l.find(".mollify-iconview-item.selected").removeClass("selected");
			$.each(items, function(i, itm) {
				t.$l.find("#mollify-iconview-item-"+itm.id).addClass("selected");
			});
		};
	};
		
	var FileList = function(container, $headerContainer, id, filelistSpec, columns) {
		var t = this;
		t.minColWidth = 25;
		t.$c = $("#"+container);
		t.$hc = $headerContainer;
		t.listId = 'mollify-filelist-'+id;
		t.cols = [];
		t.sortCol = false;
		t.sortOrderAsc = true;
		t.colWidths = {};
		
		for (var colId in columns) {
			var col = filelistSpec.columns[colId];
			if (!col) continue;
			
			var colSpec = $.extend({}, col, columns[colId]);
			t.cols.push(colSpec);
		}
		
		this.init = function(p) {
			t.p = p;
			mollify.dom.template("mollify-tmpl-filelist-header", {listId: t.listId}).appendTo(t.$hc.empty());
			mollify.dom.template("mollify-tmpl-filelist", {listId: t.listId}).appendTo(t.$c.empty());
			t.$l = $("#"+t.listId);
			t.$h = $("#"+t.listId+"-header-cols");
			t.$i = $("#"+t.listId+"-items");
			
			mollify.dom.template("mollify-tmpl-filelist-headercol", t.cols, {
				title: function(c) {
					var k = c['title-key'];
					if (!k) return "";
					
					return mollify.ui.texts.get(k);
				} 
			}).appendTo(t.$h);
			
			t.$h.find(".mollify-filelist-col-header").each(function(i) {
				var $t = $(this);
				var ind = $t.index();
				if (ind <= 1) return;
				var col = t.cols[ind-2];
				
				var minColWidth = col["min-width"] || t.minColWidth;
				
				$t.css("min-width", minColWidth);
				if (col.width) $t.css("width", col.width);
				
				$t.find(".mollify-filelist-col-header-title").click(function() {
					t.onSortClick(col);
				});
				
				if (i != (t.cols.length-1)) {
					$t.resizable({
						handles: "e",
						minWidth: minColWidth,
						//autoHide: true,
						start: function(e, ui) {
							//TODO max?
							var max = t.$c.width() - (t.cols.length * t.minColWidth);
							$t.resizable("option", "maxWidth", max);
						},
						stop: function(e, ui) {
							var w = $t.width();
							t.colWidths[col.id] = w;
							t.updateColWidth(col.id, w);
						}
					});/*.draggable({
						axis: "x",
						helper: "clone",
						revert: "invalid",
						distance: 30
					});*/
				}
				if (col["on-init"]) col["on-init"](t);
			});
			t.items = [];
			t.data = {};
			t.onSortClick(t.cols[0]);
		};
	
		this.updateColWidths = function() {
			for (var colId in t.colWidths) t.updateColWidth(colId, t.colWidths[colId]);
		};
			
		this.updateColWidth = function(id, w) {
			$(".mollify-filelist-col-"+id).width(w);
		};
		
		this.onSortClick = function(col) {
			if (col.id != t.sortCol.id) {
				t.sortCol = col;
				t.sortOrderAsc = true;
			} else {
				t.sortOrderAsc = !t.sortOrderAsc;
			}
			t.refreshSortIndicator();
			t.content(t.items, t.data);
		};
		
		this.sortItems = function() {
			var s = t.sortCol.sort;
			t.items.sort(function(a, b) {
				return s(a, b, t.sortOrderAsc ? 1 : -1, t.data);
			});
		};
		
		this.refreshSortIndicator = function() {
			t.$h.find(".mollify-filelist-col-header").removeClass("sort-asc").removeClass("sort-desc");
			$("#mollify-filelist-col-header-"+t.sortCol.id).addClass("sort-" + (t.sortOrderAsc ? "asc" : "desc"));
		};
		
		this.getDataRequest = function() {
			var rq = {};
			for (var i=0, j=t.cols.length; i<j; i++) {
				var c = t.cols[i];
				if (c['request-id']) rq[c['request-id']] = {};
			}
			return rq;
		};
		
		this.content = function(items, data) {
			t.items = items;
			t.data = data;
			t.sortItems();
			
			mollify.dom.template("mollify-tmpl-filelist-item", items, {
				cols: t.cols,
				typeClass : function(item) {
					var c = item.is_file ? 'item-file' : 'item-folder';
					if (item.is_file && item.extension) c += ' item-type-'+item.extension;
					else if (!item.is_file && item.id == item.root_id) c += ' item-root-folder';
					return c;
				},
				col: function(item, col) {
					return col.content(item, t.data);
				},
				itemColStyle: function(item, col) {
					var style="min-width:"+(col["min-width"] || t.minColWidth)+"px";
					if (col.width) style = style+";width:"+col.width+"px";
					return style;
				}
			}).appendTo(t.$i.empty());
			
			for (var i=0,j=t.cols.length; i<j; i++) {
				var col = t.cols[i];
				if (col["on-render"]) col["on-render"](t);
			}
			
			var $items = t.$i.find(".mollify-filelist-item");
			$items.hover(function() {
				$(this).addClass("hover");
			}, function() {
				$(this).removeClass("hover");
			}).bind("contextmenu",function(e){
				e.preventDefault();
				t.onItemClick($(this), $(e.toElement || e.target), false);
				return false;
			}).single_double_click(function(e) {
				e.preventDefault();
				e.stopPropagation();
				t.onItemClick($(this), $(e.toElement || e.target), true);
				return false;
			},function() {
				t.p.onDblClick($(this).tmplItem().data);
			});
			
			if (mollify.ui.draganddrop) {
				mollify.ui.draganddrop.enableDrag($items, {
					onDragStart : function($e, e) {
						var item = $e.tmplItem().data;
						var sel = t.p.getSelectedItems();
						if (!sel) sel = item;
						else if (sel.indexOf(item) < 0) sel.push(item);
						return {type:'filesystemitem', payload: sel};
					}
				});
				mollify.ui.draganddrop.enableDrop(t.$i.find(".mollify-filelist-item.item-folder"), {
					canDrop : function($e, e, obj) {
						if (!t.p.canDrop || !obj || obj.type != 'filesystemitem') return false;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						return t.p.canDrop(me, i);
					},
					dropType : function($e, e, obj) {
						if (!t.p.dropType || !obj || obj.type != 'filesystemitem') return false;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						return t.p.dropType(me, i);
					},
					onDrop : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						if (t.p.onDrop) t.p.onDrop(me, i);
					}
				});
			}
			
			/*.click(function(e) {
				e.preventDefault();
				t.onItemClick($(this), $(e.srcElement), true);
				return false;
			})*/
	
			/*t.$i.find(".mollify-filelist-quickmenu").click(function(e) {
				e.preventDefault();
				var $t = $(this);
				t.p.onMenuOpen($t.tmplItem().data, $t);
			});*/
	
			/*t.$i.find(".mollify-filelist-item-name-title").click(function(e) {
				e.preventDefault();
				t.p.onClick($(this).tmplItem().data, "name");
			});*/
			/*t.$i.find(".item-folder .mollify-filelist-item-name-title").click(function(e) {
				e.preventDefault();
				t.p.onFolderSelected($(this).tmplItem().data);
			});*/
			
			t.updateColWidths();
			
			t.p.onContentRendered(items, data);
		};
		
		this.onItemClick = function($item, $el, left) {
			var i = $item.find(".mollify-filelist-col").index($el.closest(".mollify-filelist-col"));
			if (i<0) return;
			var itm = $item.tmplItem().data;
			if (i === 0) {
				t.p.onSelectUnselect(itm);
				return;
			}
			var colId = (i === 1 ? "icon" : t.cols[i-2].id);
			if (left)
				t.p.onClick(itm, colId, $item);
			else
				t.p.onRightClick(itm, colId, $item);
		};
			
		this.getItemContextElement = function(item) {
			var $i = t.$i.find("#mollify-filelist-item-"+item.id);
			return $i.find(".mollify-filelist-col-name") || $i; 
		};
		
		this.getItemForElement = function($el) {
			return $el.tmplItem().data;
		};
		
		this.getContainerElement = function() {
			return t.$i;	
		};
		
		this.removeHover = function() {
			t.$i.find(".mollify-filelist-item.hover").removeClass('hover');
		};
		
		this.setSelectMode = function(sm) {
			t.$i.find(".mollify-filelist-item.selected").removeClass("selected");
			if (sm) {
				t.$l.addClass("select");
				t.$h.addClass("select");
			} else {
				t.$l.removeClass("select");
				t.$h.removeClass("select");				
			}
		};
		
		this.setSelection = function(items) {
			t.$i.find(".mollify-filelist-item.selected").removeClass("selected");
			$.each(items, function(i, itm) {
				t.$i.find("#mollify-filelist-item-"+itm.id).addClass("selected");
			});
		};
	};
}(window.jQuery, window.mollify);

/**
 * plugins.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
!function($, mollify) {

	"use strict"; // jshint ;_;
	
	mollify.plugin = {};
	
	mollify.plugin.Core = function() {
		var that = this;
								
		return {
			id: "plugin-core",
			itemContextHandler : function(item, ctx, data) {
				var root = item.id == item.root_id;
				var writable = !root && mollify.filesystem.hasPermission(item, "filesystem_item_access", "rw");
				var deletable = !root && mollify.filesystem.hasPermission(item, "filesystem_item_access", "rwd");
				var parentWritable = !root && mollify.filesystem.hasPermission(item.parent_id, "filesystem_item_access", "rw");

				var actions = [];				
				if (item.is_file ) {
					actions.push({ 'title-key': 'actionDownloadItem', icon: 'download', type:"primary", group:"download", callback: function() { mollify.ui.download(mollify.filesystem.getDownloadUrl(item)); } });
					actions.push({ title: '-' });
				}
				
				actions.push({ 'title-key': 'actionCopyItem', icon: 'copy', callback: function() { return mollify.filesystem.copy(item); }});
				if (parentWritable)
					actions.push({ 'title-key': 'actionCopyItemHere', icon: 'copy', callback: function() { return mollify.filesystem.copyHere(item); } });
				
				if (writable) {	
					actions.push({ 'title-key': 'actionMoveItem', icon: 'mail-forward', callback: function() { return mollify.filesystem.move(item); } });
					actions.push({ 'title-key': 'actionRenameItem', icon: 'pencil', callback: function() { return mollify.filesystem.rename(item); } });
					if (deletable)
						actions.push({ 'title-key': 'actionDeleteItem', icon: 'trash', callback: function() { var df = $.Deferred(); mollify.ui.dialogs.confirmation({
							title: item.is_file ? mollify.ui.texts.get("deleteFileConfirmationDialogTitle") : mollify.ui.texts.get("deleteFolderConfirmationDialogTitle"),
							message: mollify.ui.texts.get(item.is_file ? "confirmFileDeleteMessage" : "confirmFolderDeleteMessage", [item.name]),
							callback: function() { $.when(mollify.filesystem.del(item)).then(df.resolve, df.reject); }
						});
					return df.promise(); }});
				}
				return {
					actions: actions
				};
			},
			itemCollectionHandler : function(items) {
				var roots = false;
				$.each(items, function(i, itm) {
					var root = (itm.id == itm.root_id);
					if (root) {
						roots = true;
						return false;
					}
				});
				var actions = [ { 'title-key': 'actionCopyMultiple', icon: 'copy', callback: function() { return mollify.filesystem.copy(items); } } ];

				if (!roots) {
					actions.push({ 'title-key': 'actionMoveMultiple', icon: 'mail-forward', callback: function() { return mollify.filesystem.move(items); } });
					actions.push({ 'title-key': 'actionDeleteMultiple', icon: 'trash', callback: function() { return mollify.filesystem.del(items); } });
				}
				
				return {
					actions: actions
				};
			}
		};
	}

	/**
	/* Item details plugin
	/**/
	mollify.plugin.ItemDetailsPlugin = function(conf, sp) {
		var that = this;
		that.formatters = {};
		that.typeConfs = false;
		
		this.initialize = function() {
			that.fileSizeFormatter = new mollify.ui.formatters.ByteSize(new mollify.ui.formatters.Number(2, false, mollify.ui.texts.get('decimalSeparator')));
			that.timestampFormatter = new mollify.ui.formatters.Timestamp(mollify.ui.texts.get('shortDateTimeFormat'));
			/*if (sp) {
				for (var i=0; i<sp.length;i++)
					that.addDetailsSpec(sp[i]);
			}*/
			if (conf) {
				that.typeConfs = {};
				
				for (var t in conf) {
					var parts = t.split(",");
					var c = conf[t];
					for (var i=0; i < parts.length; i++) {
						var p = parts[i].trim();
						if (p.length > 0)
							that.typeConfs[p] = c;
					}
				}
			}
		};
		
		/*this.addDetailsSpec = function(s) {
			if (!s || !s.key) return;
			that.specs[s.key] = s;
		}*/
		
		this.getApplicableSpec = function(item) {
			var ext = (item.is_file && item.extension) ? item.extension.toLowerCase().trim() : "";
			if (ext.length === 0 || !that.typeConfs[ext]) {
				ext = item.is_file ? "[file]" : "[folder]";
				if (!that.typeConfs[ext])
					return that.typeConfs["*"];
			}
			return that.typeConfs[ext];
		}
		
		this.renderItemContextDetails = function(el, item, $content, data) {
			$content.addClass("loading");
			mollify.templates.load("itemdetails-content", mollify.helpers.noncachedUrl(mollify.plugins.url("ItemDetails", "content.html"))).done(function() {
				$content.removeClass("loading");
				that.renderItemDetails(el, item, {element: $content.empty(), data: data});
			});
		};
		
		this.renderItemDetails = function(el, item, o) {
			var s = that.getApplicableSpec(item);
			var groups = that.getGroups(s, o.data);
			
			var result = [];
			for (var i=0,j=groups.length; i<j; i++) {
				var g = groups[i];
				result.push({
					key: g,
					title: that.getGroupTitle(g),
					rows: that.getGroupRows(g, s, o.data)
				});
			}
			
			/*var data = [];
			for (var k in s) {
				var rowSpec = s[k];
				var rowData = o.data[k];
				if (!rowData) continue;
				
				data.push({key:k, title:that.getTitle(k, rowSpec), value: that.formatData(k, rowData)});
			}*/
			mollify.dom.template("itemdetails-template", {groups: result}).appendTo(o.element);
		};
		
		this.getGroups = function(s, d) {
			var groups = [];
			for (var k in s) {
				var spec = s[k];
				var data = d[k];
				if (!data) continue;
				
				var g = 'file';
				if (k == 'exif' || that.formatters[k]) g = k;
				
				if (groups.indexOf(g) < 0)
					groups.push(g);
			}
			return groups;
		};
		
		this.getGroupTitle = function(g) {				
			if (that.formatters[g]) {
				var f = that.formatters[g];
				if (f.groupTitle) return f.groupTitle;
				if (f["group-title-key"]) return mollify.ui.texts.get(f["group-title-key"]);
			}
			if (g == 'file') return mollify.ui.texts.get('fileItemDetailsGroupFile');
			if (g == 'exif') return mollify.ui.texts.get('fileItemDetailsGroupExif');
			return '';
		};
		
		this.getGroupRows = function(g, s, d) {
			if (that.formatters[g])
				return that.formatters[g].getGroupRows(s[g], d[g]);
			if (g == 'exif') return that.getExifRows(s[g], d[g]);
			
			// file group rows
			var rows = [];
			for (var k in s) {
				if (k == 'exif' || that.formatters[k]) continue;
				var spec = s[k];

				var rowData = d[k];
				if (!rowData) continue;
				
				rows.push({
					title: that.getFileRowTitle(k, s[k]),
					value: that.formatFileData(k, rowData)
				});
			}
			return rows;
		};
		
		this.getFileRowTitle = function(dataKey, rowSpec) {
			if (rowSpec.title) return rowSpec.title;
			if (rowSpec["title-key"]) return mollify.ui.texts.get(rowSpec["title-key"]);
	
			if (dataKey == 'name') return mollify.ui.texts.get('fileItemContextDataName');
			if (dataKey == 'size') return mollify.ui.texts.get('fileItemContextDataSize');
			if (dataKey == 'path') return mollify.ui.texts.get('fileItemContextDataPath');
			if (dataKey == 'extension') return mollify.ui.texts.get('fileItemContextDataExtension');
			if (dataKey == 'last-modified') return mollify.ui.texts.get('fileItemContextDataLastModified');
			if (dataKey == 'image-size') return mollify.ui.texts.get('fileItemContextDataImageSize');
			
			/*if (that.specs[dataKey]) {
				var spec = that.specs[dataKey];
				if (spec.title) return spec.title;
				if (spec["title-key"]) return mollify.ui.texts.get(spec["title-key"]);
			}*/
			return dataKey;
		};
		
		this.formatFileData = function(key, data) {
			if (key == 'size') return that.fileSizeFormatter.format(data);
			if (key == 'last-modified') return that.timestampFormatter.format(mollify.helpers.parseInternalTime(data));
			if (key == 'image-size') return mollify.ui.texts.get('fileItemContextDataImageSizePixels', [data]);
			
			if (that.specs[key]) {
				var spec = that.specs[key];
				if (spec.formatter) return spec.formatter(data);
			}
	
			return data;
		};
		
		this.getExifRows = function(spec, data) {
			var rows = [];
			for (var section in data) {				
				var html = '';
				var first = true;
				var count = 0;
				for (var key in data[section]) {
					var v = that.formatExifValue(section, key, data[section][key]);
					if (!v) continue;
					
					html += '<tr id="exif-row-'+section+'-'+key+'" class="'+(first?'exif-row-section-first':'exif-row')+'"><td class="exif-key">'+key+'</td><td class="exif-value">'+v+'</td></tr>';
					first = false;
					count++;
				}
				
				if (count > 0)
					rows.push({title: section, value: '<table class="exif-section-'+section+'">'+html+"</table>"});
			}
			return rows;
		};
		
		this.formatExifValue = function(section, key, value) {
			if (section == 'FILE' && key == 'SectionsFound') return false;
			//TODO format values?
			return value;
		};

		return {
			id: "plugin-itemdetails",
			initialize: that.initialize,
			itemContextRequestData : function(item) {
				if (!that.typeConfs) return false;
				var spec = that.getApplicableSpec(item);
				if (!spec) return false;
				
				var data = [];
				for (var k in spec)
					data.push(k);
				return data;
			},
			itemContextHandler : function(item, ctx, data) {
				if (!data || !that.typeConfs) return false;
				var spec = that.getApplicableSpec(item);
				if (!spec) return false;
				
				return {
					details: {
						"title-key": "pluginItemDetailsContextTitle",
						"on-render": function(el, $content) {
							that.renderItemContextDetails(el, item, $content, data);
						}
					}
				};
			}
		};
	}
	
	/**
	*	Item collection plugin
	**/
	mollify.plugin.ItemCollectionPlugin = function() {
		var that = this;
		
		this.initialize = function() {
		};
		
		this.onStore = function(items) {
			var df = $.Deferred();
			mollify.ui.dialogs.input({
				title: mollify.ui.texts.get('pluginItemCollectionStoreDialogTitle'),
				message: mollify.ui.texts.get('pluginItemCollectionStoreDialogMessage'),
				defaultValue: "",
				yesTitle: mollify.ui.texts.get('pluginItemCollectionStoreDialogAction'),
				noTitle: mollify.ui.texts.get('dialogCancel'),
				handler: {
					isAcceptable: function(n) { return (!!n && n.length > 0); },
					onInput: function(n) { $.when(that._onStore(items, n)).then(df.resolve, df.reject); }
				}
			});
			return df.promise();
		};
		
		this._onStore = function(items, name) {
			return mollify.service.post("itemcollections", {items : items, name:name}).done(function(list) {
				//TODO show message
				that._updateNavBar(list);
			});
		};
		
		this.onAddItems = function(ic, items) {
			return mollify.service.post("itemcollections/"+ic.id, {items : window.isArray(items) ? items: [ items ]});
		};
		
		this._removeCollectionItem = function(ic, items) {
			return mollify.service.del("itemcollections/"+ic.id+"/items", {items : window.isArray(items) ? items: [ items ]});
		};
				
		this._showCollection = function(ic) {
			that._fileView.changeToFolder("ic/"+ic.id);
		};
		
		this.editCollection = function(ic, done) {
			mollify.service.get("itemcollections/"+ic.id).done(function(loaded){
				mollify.ui.dialogs.tableView({
					title: mollify.ui.texts.get('pluginItemCollectionsEditDialogTitle', ic.name),
					buttons:[{id:"close", title:mollify.ui.texts.get('dialogClose')},{id:"remove", title:mollify.ui.texts.get("pluginItemCollectionsEditDialogRemove"), type:"secondary", cls:"btn-danger secondary"}],
					onButton: function(btn, h) {
						h.close();
						if (btn.id == 'remove') that.removeCollection(ic);
						done(btn.id == 'remove');
					},
					table: {
						key: "item_id",
						columns: [
							{ id: "icon", title:"", renderer: function(i, v, $c) {
								$c.html(i.is_file ? '<i class="icon-file"></i>' : '<i class="icon-folder-close-alt"></i>');
							} },
							{ id: "name", title: mollify.ui.texts.get('fileListColumnTitleName') },
							{ id: "remove", title: "", type: "action", content: '<i class="icon-trash"></i>' }
						]
					},
					onTableRowAction: function(d, table, id, item) {
						if (id == "remove") {
							that._removeCollectionItem(ic, item).done(function() {
								table.remove(item);
							});
						}
					},
					onRender: function(d, $c, table) {
						table.set(loaded.items);
						$c.removeClass("loading");
					}
				});
			});
		};

		this._updateNavBar = function(list) {
			that._list = list;
			var navBarItems = [];
			var itemsById = {};
			$.each(list, function(i, ic) {
				itemsById[ic.id] = ic;
				navBarItems.push({title:ic.name, obj: ic, callback:function(){ that._showCollection(ic); }})
			});
			that._collectionsNav.update(navBarItems);
			
			var f = that._fileView.getCurrentFolder();
			if (f.type == 'ic') that._collectionsNav.setActive(itemsById[f.id]);
		}

		this.removeCollection = function(ic) {
			return mollify.service.del("itemcollections/"+ic.id).done(that._updateNavBar);
		};

		this._onShareNavItem = function(ic) {
			if (!mollify.plugins.exists("plugin-share")) return;
			mollify.plugins.get("plugin-share").openShares({ id: "ic_" + ic.id, "name": ic.name, shareTitle: mollify.ui.texts.get("pluginItemCollectionShareTitle") });
		};

		this._getItemActions = function(ic) {
			var items = [
				{"title-key":"pluginItemCollectionsNavEdit", callback: function() {
					that.editCollection(ic, function(removed) {
						var f = that._fileView.getCurrentFolder();
						if (f.type != 'ic' || f.id != ic.id) return;

						if (removed) that._fileView.openInitialFolder();
						else that._fileView.refresh();
					});
				}},
				{"title-key":"pluginItemCollectionsNavRemove", callback: function() { that._fileView.openInitialFolder(); that.removeCollection(ic); }}
			];
			if (mollify.plugins.exists("plugin-share")) items.push({"title-key":"pluginItemCollectionsNavShare", callback: function() { that._onShareNavItem(ic); }});
			return items;
		}
		
		this._onFileViewInit = function(fv) {
			that._fileView = fv;
			that._fileView.addCustomFolderType("ic", {		
				onSelectFolder : function(id) {
					var df = $.Deferred();
					mollify.service.post("itemcollections/"+id+"/data", {rq_data: that._fileView.getDataRequest() }).done(function(r) {
						that._collectionsNav.setActive(r.ic);
						
						var fo = {
							type: "ic",
							id: r.ic.id,
							name: r.ic.name
						};
						var data = {
							items: r.ic.items,
							ic: r.ic,
							data: r.data
						};
						df.resolve(fo, data);
					});
					return df.promise();
				},
				
				onFolderDeselect : function(f) {
					that._collectionsNav.setActive(false);
				},
		
				onRenderFolderView : function(f, data, $h, $tb) {
					mollify.dom.template("mollify-tmpl-fileview-header-custom", { folder: f }).appendTo($h);
		
					var opt = {
						title: function() {
							return this.data.title ? this.data.title : mollify.ui.texts.get(this.data['title-key']);
						}
					};
					var $fa = $("#mollify-fileview-folder-actions");
					var actionsElement = mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-cog', dropdown: true }, opt).appendTo($fa);
					mollify.ui.controls.dropdown({
						element: actionsElement,
						items: that._getItemActions(data.ic),
						hideDelay: 0,
						style: 'submenu'
					});
					that._fileView.addCommonFileviewActions($fa);
				}
			});
		};
		
		this._onFileViewActivate = function($e, h) {
			that._collectionsNav = h.addNavBar({
				title: mollify.ui.texts.get("pluginItemCollectionsNavTitle"),
				classes: "ic-navbar-item",
				items: [],
				dropdown: {
					items: that._getItemActions
				},
				onRender: mollify.ui.draganddrop ? function($nb, $items, objs) {
					mollify.ui.draganddrop.enableDrop($items, {
						canDrop : function($e, e, obj) {
							if (!obj || obj.type != 'filesystemitem') return false;
							return true;
						},
						dropType : function($e, e, obj) {
							if (!obj || obj.type != 'filesystemitem') return false;
							return "copy";
						},
						onDrop : function($e, e, obj) {
							if (!obj || obj.type != 'filesystemitem') return;
							var item = obj.payload;
							var ic = objs($e);							
							that.onAddItems(ic, item);
						}
					});
				} : false
			});
			mollify.service.get("itemcollections").done(that._updateNavBar);
		};

		return {
			id: "plugin-itemcollection",
			initialize: that.initialize,
			itemCollectionHandler : function(items) {
				return {
					actions: [{
						"title-key": "pluginItemCollectionStore",
						callback: function() { return that.onStore(items); }
					}]
				};
			},
			fileViewHandler : {
				onInit: that._onFileViewInit,
				onActivate: that._onFileViewActivate
			}
		};
	}
	
	/**
	*	Archiver plugin
	**/
	mollify.plugin.ArchiverPlugin = function() {
		var that = this;
		
		this.initialize = function() {
		};
		
		this.onCompress = function(i, f) {
			if (!i) return;
			
			var defaultName = '';
			var item = false;
			var items = mollify.helpers.arrayize(i);
			if (items.length == 1) {
				item = i[0];
			}
			
			var df = $.Deferred();
			var doCompress = function(folder) {
				if (item) defaultName = item.name + ".zip";				
	
				mollify.ui.dialogs.input({
					title: mollify.ui.texts.get('pluginArchiverCompressDialogTitle'),
					message: mollify.ui.texts.get('pluginArchiverCompressDialogMessage'),
					defaultValue: defaultName,
					yesTitle: mollify.ui.texts.get('pluginArchiverCompressDialogAction'),
					noTitle: mollify.ui.texts.get('dialogCancel'),
					handler: {
						isAcceptable: function(n) { return (!!n && n.length > 0 && (!item || n != item.name)); },
						onInput: function(n) { $.when(that._onCompress(items, folder, n)).then(df.resolve, df.reject); }
					}
				});
			};
			if (!f) {
				mollify.ui.dialogs.folderSelector({
					title: mollify.ui.texts.get('pluginArchiverCompressDialogTitle'),
					message: mollify.ui.texts.get('pluginArchiverCompressSelectFolderDialogMessage'),
					actionTitle: mollify.ui.texts.get('ok'),
					handler: {
						onSelect: function(folder) { doCompress(folder); },
						canSelect: function(folder) { return true; }
					}
				});
			} else {
				doCompress(f);
			}
			
			return df.promise();
		};
		
		this.onDownloadCompressed = function(items) {
			//TODO show progress
			return mollify.service.post("archiver/download", {items : items}).done(function(r) {
				//TODO remove progress
				mollify.ui.download(mollify.service.url('archiver/download/'+r.id, true));
			});
		};
		
		this._onCompress = function(items, folder, name) {
			return mollify.service.post("archiver/compress", { 'items' : items, 'folder': folder, 'name': name}).done(function(r) {
				mollify.events.dispatch('archiver/compress', { items: items, folder: folder, name: name });
				mollify.events.dispatch('filesystem/update', { folder: folder });
			});
		};
		
		this._onExtract = function(a, folder) {
			return mollify.service.post("archiver/extract", { item : a, folder : folder }).done(function(r) {
				mollify.events.dispatch('archiver/extract', { item : a, folder : folder });
				mollify.events.dispatch('filesystem/update', { folder : folder });
			});
		};
		
		this._isArchive = function(item) {
			if (!item.is_file) return false;
			
			var ext = item.extension.toLowerCase();
			return ext == 'zip';	//TODO get supported extensions from backend
		};
								
		return {
			id: "plugin-archiver",
			initialize: that.initialize,
			getDownloadCompressedUrl : function(i) {
				var single = false;
		
				if (!window.isArray(i)) single = i;
				else if (i.length == 1) single = i[0];
				
				if (single)
					return mollify.service.url("archiver/download?item="+single.id, true);

				return false;	//TODO enable downloading array of items?
			},
			itemContextHandler : function(item, ctx, data) {
				var root = (item.id == item.root_id);

				var writable = !root && mollify.filesystem.hasPermission(item, "filesystem_item_access", "rw");
				var parentWritable = !root && mollify.filesystem.hasPermission(item.parent_id, "filesystem_item_access", "rw");
				//TODO folder? is this ever something else than parent?
				var folderWritable = !root && ctx.folder && ctx.folder_writable;

				if (parentWritable && that._isArchive(item)) {
					return {
						actions: [
							{"title-key":"pluginArchiverExtract", callback: function() { return that._onExtract(item) } }
						]
					};
				}
				
				var actions = [
					{"title-key":"pluginArchiverDownloadCompressed", icon: 'archive', type:"primary", group:"download", callback: function() { that.onDownloadCompressed([item]); } }
				];
				if (ctx.folder && folderWritable) actions.push({"title-key":"pluginArchiverCompress", icon: 'archive', callback: function() { return that.onCompress(item, ctx.folder); } });
				return {
					actions: actions
				};
			},
			itemCollectionHandler : function(items, ctx) {
				return {
					actions: [
						{"title-key":"pluginArchiverCompress", icon: 'archive', callback: function() { return that.onCompress(items) } },
						{"title-key":"pluginArchiverDownloadCompressed", icon: 'archive', type:"primary", group:"download", callback: function() { return that.onDownloadCompressed(items) } }
					]
				};
			}
		};
	}
	
	/**
	/* File viewer editor plugin
	/**/
	mollify.plugin.FileViewerEditorPlugin = function() {
		var that = this;
		
		this.initialize = function() {
		};
		
		this.onEdit = function(item, spec) {
			mollify.ui.dialogs.custom({
				resizable: true,
				initSize: [600, 400],
				title: mollify.ui.texts.get('fileViewerEditorViewEditDialogTitle'),
				content: '<div class="fileviewereditor-editor-content"></div>',
				buttons: [
					{ id: "yes", "title": mollify.ui.texts.get('dialogSave') },
					{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
				],
				"on-button": function(btn, d) {
					if (btn.id == 'no') {
						d.close();
						return;
					}
					document.getElementById('editor-frame').contentWindow.onEditorSave(function() {
						d.close();
						//TODO dispatch changed event
					}, function(c, er) {
						d.close();
						return true;
					});
				},
				"on-show": function(h, $d) {						
					var $content = $d.find(".fileviewereditor-editor-content");
					var $frm = $('<iframe id="editor-frame" width=\"100%\" height:\"100%\" style=\"width:100%;height:100%;border: none;overflow: none;\" />').attr('src', spec.embedded);
					$content.removeClass("loading").append($frm);
					h.center();
				}
			});
		};
			
		this.onView = function(item, all, spec) {
			var loaded = {};
			var list = [{
				embedded: spec.view.embedded,
				full: spec.view.full,
				edit: !!spec.edit,
				item: item
			}];
			var init = list[0];
			var visible = false;
			init.init = true;
			var activeItem = false;
			
			var $lb;
			var $lbc;
			var $i = false;
			var maxW;
			var maxH;
			var resize = function() {
				maxW = ($(window).width()-100);
				maxH = ($(window).height()-100);
				$lbc.css({
					"max-width": maxW+"px",
					"max-height": maxH+"px"
				});
				if ($i) {
					$i.css({
						"max-width": maxW+"px",
						"max-height": maxH+"px"
					});
				}
				$lb.lightbox('center');
			};
			$(window).resize(resize);
			var load = function(itm) {
				var id = itm.item.id;
				activeItem = itm;
				
				if (loaded[id]) return;
				$.ajax({
					type: 'GET',
					url: itm.embedded
				}).done(function(data) {
					loaded[id] = true;
					
					$i = $("#mollify-fileviewereditor-viewer-item-"+id);
					var $ic = $i.find(".mollify-fileviewereditor-viewer-item-content");
					$ic.removeClass("loading").html(data.result.html);
					if (data.result.size) {
						var sp = data.result.size.split(';');
						$("#"+data.result.resized_element_id).css({
							"width": sp[0]+"px",
							"height": sp[1]+"px"
						});
					}
					
					// if img, wait until it is loaded
					var $img = $ic.find('img:first');
					if ($img.length > 0) {
						$img.one('load', function() {
							var w = $img.width();
							if (!data.result.size && w > 0)
								$img.css({
									"width": w+"px",
									"height": $img.height()+"px"
								});
							resize();
						});
					} else {
						resize();
					}
					
					if (!visible) {
						$lb.lightbox('show');
						visible = true;
					}
				});
			};
			
			var $v = mollify.dom.template("mollify-tmpl-fileviewereditor-popup", {
				items : list
			}, {
				content: function(i) {
					return i.content;
				}
			}).appendTo($("body"));
			
			var onHide = function() {
				$v.remove();
			};
			
			$lb = $v.lightbox({backdrop: true, resizeToFit: false, show: false, onHide: onHide});
			mollify.ui.process($lb, ["localize"]);
			
			$lb.find("button.close").click(function(){
				$lb.lightbox('hide');
			});
			$lbc = $lb.find(".carousel-inner");
			
			var $c = $v.find(".carousel").carousel({interval: false}).on('slid', function() {
				var $active = $v.find(".mollify-fileviewereditor-viewer-item.active");
				load($active.tmplItem().data);
			});
			$c.find(".carousel-control").click(function() {
				if ($(this).hasClass("left")) $c.carousel('prev');
				else $c.carousel('next');
			});
			var $tools = $c.find(".mollify-fileviewereditor-viewer-tools");
			$tools.find(".mollify-fileviewereditor-viewer-item-viewinnewwindow").click(function(){
				$lb.lightbox('hide');
				mollify.ui.window.open(activeItem.full);
			});
			$tools.find(".mollify-fileviewereditor-viewer-item-edit").click(function(){
				$lb.lightbox('hide');
				that.onEdit(item, spec.edit);	//TODO activeItem
			});
			load(init);
		};
					
		return {
			id: "plugin-fileviewereditor",
			initialize: that.initialize,
			itemContextHandler : function(item, ctx, data) {
				if (!data) return false;
				
				var previewerAvailable = !!data.preview;
				var viewerAvailable = !!data.view;
				var editorAvailable = !!data.edit;
				
				var result = {
					details : false,
					actions: []
				};
				if (previewerAvailable) {
					result.details = {
						"title-key": "pluginFileViewerEditorPreview",
						"on-render": function(el, $content) {
							$content.empty().addClass("loading");
							
							$.ajax({
								type: 'GET',
								url: data.preview
							}).done(function(r) {
								$content.removeClass("loading").html(r.result.html);
							});
						}
					};
				}

				if (viewerAvailable) {
					result.actions.push(
						{ id: 'pluginFileViewerEditorView', "title-key": 'pluginFileViewerEditorView', type:"primary", callback: function() {
							that.onView(item, [], data);
						}}
					);
				}
				if (editorAvailable) {
					result.actions.push(
						{ id: 'pluginFileViewerEditorView', "title-key": 'pluginFileViewerEditorEdit', type:"primary", callback: function() {
							that.onEdit(item, data.edit);
						}}
					);
				}
				return result;
			}
		};
	};
	
	/**
	*	Comment plugin
	**/
	mollify.plugin.CommentPlugin = function() {
		var that = this;
		
		this.initialize = function() {
			that._timestampFormatter = new mollify.ui.formatters.Timestamp(mollify.ui.texts.get('shortDateTimeFormat'));
			mollify.dom.importCss(mollify.plugins.url("Comment", "style.css"));
		};
		
		this.getListCellContent = function(item, data) {
			if (!item.id || item.id.length === 0 || !data || !data["plugin-comment-count"]) return "";
			var counts = data["plugin-comment-count"];
	
			if (!counts[item.id])
				return "<div id='item-comment-count-"+item.id+"' class='filelist-item-comment-count-none'></div>";
			
			return "<div id='item-comment-count-"+item.id+"' class='filelist-item-comment-count'>"+counts[item.id]+"</div>";
		};
		
		this.renderItemContextDetails = function(el, item, ctx, $content, data) {
			$content.addClass("loading");
			mollify.templates.load("comments-content", mollify.helpers.noncachedUrl(mollify.plugins.url("Comment", "content.html"))).done(function() {
				$content.removeClass("loading");
				if (data.count === 0) {
					that.renderItemContextComments(el, item, ctx, [], {element: $content.empty(), contentTemplate: 'comments-template'});
				} else {
					that.loadComments(item, false, function(item, comments) {
						that.renderItemContextComments(el, item, ctx, comments, {element: $content.empty(), contentTemplate: 'comments-template'});
					});
				}
			});
		};
		
		this.renderItemContextComments = function(el, item, ctx, comments, o) {
			var canAdd = (mollify.session.user.admin || mollify.filesystem.hasPermission(item, "comment_item"));
			var $c = mollify.dom.template(o.contentTemplate, {item: item, canAdd: canAdd}).appendTo(o.element);

			if (canAdd)			
				$c.find(".comments-dialog-add").click(function() {
					var comment = $c.find(".comments-dialog-add-text").val();
					if (!comment || comment.length === 0) return;
					that.onAddComment(item, comment, el.close);
				});
			
			that.updateComments($c.find(".comments-list"), item, comments);
		};
		
		this.showCommentsBubble = function(item, e, ctx) {
			var bubble = mollify.ui.controls.dynamicBubble({element:e, title: item.name, container: ctx.container});
			
			mollify.templates.load("comments-content", mollify.helpers.noncachedUrl(mollify.plugins.url("Comment", "content.html"))).done(function() {
				that.loadComments(item, true, function(item, comments, permission) {
					var canAdd = mollify.session.user.admin || permission == '1';
					var $c = mollify.dom.template("comments-template", {item: item, canAdd: canAdd});
					bubble.content($c);
		
					if (canAdd)
						$c.find(".comments-dialog-add").click(function() { 
							var comment = $c.find(".comments-dialog-add-text").val();
							if (!comment || comment.length === 0) return;
							that.onAddComment(item, comment, bubble.close);
						});

					that.updateComments($c.find(".comments-list"), item, comments);
				});
			});
		};
		
		this.loadComments = function(item, permission, cb) {
			mollify.service.get("comment/"+item.id+(permission ? '?p=1' : '')).done(function(r) {
				cb(item, that.processComments(permission ? r.comments : r), permission ? r.permission : undefined);
			});
		};
		
		this.processComments = function(comments) {
			var userId = mollify.session.user_id;
			
			for (var i=0,j=comments.length; i<j; i++) {
				comments[i].time = that._timestampFormatter.format(mollify.helpers.parseInternalTime(comments[i].time));
				comments[i].comment = comments[i].comment.replace(new RegExp('\n', 'g'), '<br/>');
				comments[i].remove = mollify.session.user.admin || (userId == comments[i].user_id);
			}
			return comments;
		};
		
		this.onAddComment = function(item, comment, cb) {
			mollify.service.post("comment/"+item.id, { comment: comment }).done(function(result) {
				that.updateCommentCount(item, result.count);
				if (cb) cb();
			});
		};
		
		this.onRemoveComment = function($list, item, id) {		
			mollify.service.del("comment/"+item.id+"/"+id).done(function(result) {
				that.updateCommentCount(item, result.length);
				that.updateComments($list, item, that.processComments(result));
			});
		};
		
		this.updateCommentCount = function(item, count) {
			var e = document.getElementById("item-comment-count-"+item.id);
			if (!e) return;
			
			if (count < 1) {
				e.innerHTML = '';
				e.setAttribute('class', 'filelist-item-comment-count-none');
			} else {
				e.innerHTML = count;
				e.setAttribute('class', 'filelist-item-comment-count');
			}
		};
		
		this.updateComments = function($list, item, comments) {
			$list.removeClass("loading");
			
			if (comments.length === 0) {
				$list.html("<span class='message'>"+mollify.ui.texts.get("commentsDialogNoComments")+"</span>");
				return;
			}
	
			mollify.dom.template("comment-template", comments).appendTo($list.empty());
			$list.find(".comment-content").hover(
				function () { $(this).addClass("hover"); }, 
				function () { $(this).removeClass("hover"); }
			);
			$list.find(".comment-remove-action").click(function(e) {
				e.preventDefault();
				var comment = $(this).tmplItem().data;
				that.onRemoveComment($list, item, comment.id);
			});
		};
		
		return {
			id: "plugin-comment",
			initialize: that.initialize,
			fileViewHandler : {
				filelistColumns : function() {
					return [{
						"id": "comment-count",
						"request-id": "plugin-comment-count",
						"title-key": "",
						"width" : 50,
						"content": that.getListCellContent,
						"request": function(parent) { return {}; },
						"on-click": function(item, data, ctx) {
							that.showCommentsBubble(item, $("#item-comment-count-"+item.id), ctx);
						}
					}];
				}
			},
			itemContextHandler : function(item, ctx, data) {
				return {
					details: {
						"title-key": "pluginCommentContextTitle",
						"on-render": function(el, $content, ctx) { that.renderItemContextDetails(el, item, ctx, $content, data); }
					}
				};
			}
		};
	}

	/**
	*	Permission plugin
	**/
	mollify.plugin.PermissionsPlugin = function() {
		var that = this;
		this._permissionTypes = false;
		
		this.initialize = function() {
			mollify.events.addEventHandler(function(e) {
				if (!that._permissionTypes && mollify.session.user) that._permissionTypes = mollify.session.data.permission_types
			}, "session/start");
			that._pathFormatter = new mollify.ui.formatters.FilesystemItemPath();
		};
		
		this._formatPermissionName = function(p) {
			var name = mollify.ui.texts.get('permission_'+p.name);
			if (p.subject == null && that._permissionTypes.filesystem[p.name])
				return mollify.ui.texts.get('permission_default', name);
			return name;
		};
		
		this._formatPermissionValue = function(name, val) {
			var values = that._getPermissionValues(name);
			if (values)
				return mollify.ui.texts.get('permission_'+name+'_value_'+val);
			return mollify.ui.texts.get('permission_value_'+val);
		};
		
		this._getPermissionValues = function(name) {
			return that._permissionTypes.values[name];
		};
		
		this.editItemPermissions = function(item) {
			var modificationData = {
				"new": [],
				"modified": [],
				"removed": []
			};
			var originalValues = [];
			var $content = false;
			
			mollify.ui.dialogs.custom({
				resizable: true,
				initSize: [600, 400],
				title: mollify.ui.texts.get('pluginPermissionsEditDialogTitle', item.name),
				content: mollify.dom.template("mollify-tmpl-permission-editor", {item: item}),
				buttons: [
					{ id: "yes", "title": mollify.ui.texts.get('dialogSave') },
					{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
				],
				"on-button": function(btn, d) {
					if (btn.id == 'no') {
						d.close();
						return;
					}
					if (modificationData["new"].length === 0 && modificationData.modified.length === 0 && modificationData.removed.length === 0)
						return;
					
					mollify.service.put("permissions/list", modificationData).done(d.close).fail(d.close);
				},
				"on-show": function(h, $d) {
					$content = $d.find("#mollify-pluginpermissions-editor-content");
					var $subContents = $content.find(".mollify-pluginpermissions-editor-subcontent").hide();
					var $activeSubContent = false;
					var activeTab = 0;
					var selectedPermission = false;
					
					h.center();
					
					mollify.service.get("configuration/users?g=1").done(function(l) {
						var users = that.processUserData(l);
						var names = that._permissionTypes.keys.filesystem;
						var init = 'filesystem_item_access';
						var onPermissionsModified = function() {
							var info = (modificationData["new"].length > 0 || modificationData.modified.length > 0 || modificationData.removed.length > 0) ? "<i class='icon-exclamation-sign '/>&nbsp;" + mollify.ui.texts.get('pluginPermissionsEditDialogUnsaved') : false;
							h.setInfo(info);
						};
						var getPermissionKey = function(p) { return p.user_id+":"+p.subject+":"+p.name; };
						var changes = {
							addNew : function(p) {
								if (!p.isnew) return;
								modificationData["new"].push(p);
								onPermissionsModified();
							},
							remove : function(p) {
								if (p.isnew) {
									modificationData["new"].remove(modificationData["new"].indexOf(p));
								} else {
									modificationData.removed.push(p);
								}
								onPermissionsModified();
							},
							update : function(p, v) {
								if (!p.isnew) {
									var key = getPermissionKey(p);
									// store original value
									if (!originalValues[key]) originalValues[key] = p.value;
									
									modificationData.removed.remove(p);

									var mi = modificationData.modified.indexOf(p);
									
									if (originalValues[key] == v) {
										if (mi >= 0) modificationData.modified.remove(mi);
									} else {
										if (mi < 0) modificationData.modified.push(p);
									}
								}
								p.value = v;
								onPermissionsModified();
							},
							getNew : function(name) {
								return $.grep(modificationData["new"], function(p) { return p.name == name; });
							},
							findRemoved : function(userId, subject, permissionName) {
								for (var i=0,j=modificationData.removed.length; i<j; i++) {
									var d = modificationData.removed[i];
									if (d.user_id == userId && d.subject == subject && d.name == permissionName)
										return d;
								}
								return false;
							}
						};
						
						var removeAndUpdate = function(list) {
							var byKey = {};
							$.each(list, function(i, p) {
								byKey[getPermissionKey(p)] = p;
							});
							//remove
							for (var i=0,j=modificationData.removed.length; i<j; i++) {
								var rp = modificationData.removed[i];
								var rpk = getPermissionKey(rp);
								if (rpk in byKey) list.remove(list.indexOf(byKey[rpk]));
							}
							//update
							for (var k=0,l=modificationData.modified.length; k<l; k++) {
								var mp = modificationData.modified[k];
								var mpk = getPermissionKey(mp);
								if (mpk in byKey) byKey[mpk].value = mp.value;
							}
						};
						
						var addNewUserAndGroupPermissions = function(list, user, permissionName) {
							var usersAndGroupsAndItemDefault = [];
							$.each(list, function(i, p) {
								if (p.user_id !== 0 && p.user_id != user.id && user.group_ids.indexOf(p.user_id) < 0) return false;
								usersAndGroupsAndItemDefault.push(p);
							});
							$.each(usersAndGroupsAndItemDefault, function(i, p) {
								list.remove(p);
							});
							var newList = [];
							$.each(changes.getNew(permissionName), function(i, p) {
								if (p.subject != item.id) return;
								if (p.user_id === 0 || p.user_id == user.id || user.group_ids.indexOf(p.user_id) >= 0) usersAndGroupsAndItemDefault.push(p);
							});
							newList = usersAndGroupsAndItemDefault.concat(list);
							var indx = function(p) {
								var i = 0;

								if (p.subject == item.id) i = 20;
								else if (p.subject != null && p.subject !== "") i = 10;
																
								if (p.user_id == user.id) i = i + 2;
								else if (user.group_ids.indexOf(p.user_id) >= 0) i = i + 1;
								
								return i;
							};
							newList = newList.sort(function(a, b){
								return indx(b) - indx(a);
							});

							return newList;
						}
						
						var activateTab = function(i) {
							$("#mollify-pluginpermissions-editor-tab > li").removeClass("active").eq(i).addClass("active");
							$activeSubContent = $subContents.hide().eq(i).show();
							activeTab = i;
							
							if (i === 0) onActivateItemPermissions($activeSubContent);
							else onActivateUserPermissions($activeSubContent);
						};

						var onChangePermission = function(sel) {
							selectedPermission = sel;
							activateTab(activeTab);
						};
						
						mollify.ui.controls.select("mollify-pluginpermissions-editor-permission-name", {
							onChange: onChangePermission,
							formatter: function(name) {
								return mollify.ui.texts.get('permission_'+name);
							},
							values: names,
							value: init
						});
						
						$("#mollify-pluginpermissions-editor-tab > li").click(function() {
							var i = $(this).addClass("active").index();
							activateTab(i);
						});
						
						var onActivateItemPermissions = function($sc) {
							$sc.addClass("loading");
							
							that.loadPermissions(item, selectedPermission).done(function(p) {
								$sc.removeClass("loading");
								
								var permissions = p.permissions.slice(0);
								removeAndUpdate(permissions);
								permissions = permissions.concat(changes.getNew(selectedPermission));
								that.initItemPermissionEditor(changes, item, selectedPermission, permissions, users);
							}).fail(h.close);
						};
						
						var onActivateUserPermissions = function($sc) {
							var resetUserPermissions = function() {
								$("#mollify-pluginpermissions-editor-user-related-permissions").hide();
								$("#mollify-pluginpermissions-editor-user-permissions-description").html("");								
							}
							resetUserPermissions();
							
							var onChangeUser = function(sel) {
								resetUserPermissions();
								if (!sel) return;
								
								if (sel.user_type == 'a') {
									$("#mollify-pluginpermissions-editor-user-permissions-description").html(mollify.ui.texts.get("pluginPermissionsUserPermissionsAdmin"));
									return;
								}
								$sc.addClass("loading");
								
								mollify.service.get("permissions/user/"+sel.id+"?e=1&subject="+item.id+"&name="+selectedPermission).done(function(p) {
									$sc.removeClass("loading");
									
									var permissions = p.permissions.slice(0);
									removeAndUpdate(permissions);
									permissions = addNewUserAndGroupPermissions(permissions, sel, selectedPermission);
									that.initUserPermissionInspector(changes, sel, item, selectedPermission, permissions, p.items, users);
								}).fail(h.close);								
							};
							
							mollify.ui.controls.select("mollify-pluginpermissions-editor-permission-user", {
								onChange: onChangeUser,
								none: mollify.ui.texts.get("pluginPermissionsEditNoUser"),
								values: users.users,
								title: "name"
							});			
						};
						
						onChangePermission(init);
					}).fail(h.close);
				}
			});
		};
		
		this.processUserData = function(l) {
			var userData = {
				users : [],
				groups : [],
				all : [],
				usersById : {}
			};
			for (var i=0,j=l.length; i<j; i++) {
				var u = l[i];
				if (u.is_group == "0") {
					userData.users.push(u);
					userData.all.push(u);
					userData.usersById[u.id] = u;
				} else {
					userData.groups.push(u);
					userData.all.push(u);
					userData.usersById[u.id] = u;
				}
			}
			return userData;
		};
		
		this.loadPermissions = function(item, name, users) {
			return mollify.service.get("permissions/list?subject="+item.id+(name ? "&name="+name : "")+(users?"&u=1":""));
		};

		this.initUserPermissionInspector = function(changes, user, item, permissionName, relatedPermissions, items, userData) {
			var updateEffectivePermission = function() {
				var ep = false;
				if (relatedPermissions.length > 0) ep = relatedPermissions[0].value;
				if (ep) {
					$("#mollify-pluginpermissions-editor-user-permissions-description").html(mollify.ui.texts.get('pluginPermissionsEffectiveUserPermission', that._formatPermissionValue(permissionName, ep)));
					$("#mollify-pluginpermissions-editor-user-related-permissions").show();
				} else {
					var values = that._getPermissionValues(permissionName);
					$("#mollify-pluginpermissions-editor-user-permissions-description").html(mollify.ui.texts.get('pluginPermissionsNoEffectiveUserPermission', that._formatPermissionValue(permissionName, values ? values[0] : '0')));
				}
			}
			updateEffectivePermission();
			if (relatedPermissions.length === 0) return;

			var isGroup = function(id) {
				return (id != '0' && userData.usersById[id].is_group != "0");
			};
			var onRemove = function(permission) {
				changes.remove(permission);
				relatedPermissions.remove(permission);
				updateEffectivePermission();
			};
			
			var $list = mollify.ui.controls.table("mollify-pluginpermissions-editor-user-permission-list", {
				key: "user_id",
				onRow: function($r, i) { if (isGroup(i.user_id)) $r.addClass("group"); },
				columns: [
					{
						id: "user_id",
						title: mollify.ui.texts.get('pluginPermissionsEditColUser'),
						renderer: function(i, v, $c) {
							if (v == '0' && i.subject === '') return;
							if (v == '0') {
								$c.html("<em>"+mollify.ui.texts.get('pluginPermissionsEditDefaultPermission')+"</em>");
								return;
							}
							$c.html(userData.usersById[v].name).addClass("user");
						}
					},
					{
						id: "value",
						title: mollify.ui.texts.get('pluginPermissionsPermissionValue'),
						formatter: function(item, k) {
							return that._formatPermissionValue(permissionName, k);
						}
					},
					{
						id: "subject",
						title: mollify.ui.texts.get('pluginPermissionsEditColSource'),
						renderer: function(i, s, $c) {
							var subject = items[s];
							if (!subject) {
								var n = mollify.ui.texts.get("permission_system_default");
								if (i.user_id != '0') {
									var user = userData.usersById[i.user_id];
									n = mollify.ui.texts.get((user.is_group == '1' ? "permission_group_default" : "permission_user_default"));
								}
								$c.html("<em>"+n+"</em>");
							} else {
								if (subject.id == item.id) {
									$c.html('<i class="icon-file-alt"/>&nbsp;' + mollify.ui.texts.get('pluginPermissionsEditColItemCurrent'));
								} else {
									var level = Math.max(item.path.count("/"), item.path.count("\\")) - Math.max(subject.path.count("/"), subject.path.count("\\")) + 1;
									$c.html('<i class="icon-file-alt"/>&nbsp;' + mollify.ui.texts.get('pluginPermissionsEditColItemParent', level));
								}
								$c.tooltip({
									placement: "bottom",
									html: true,
									title: that._pathFormatter.format(subject),
									trigger: "hover",
									container: "#mollify-pluginpermissions-editor-user-related-permissions"
								});
							}
						}
					},
					{ id: "remove", title: "", type:"action", content: mollify.dom.template("mollify-tmpl-permission-editor-listremove").html() }
				],
				onRowAction: function(id, permission) {
					changes.remove(permission);
					relatedPermissions.remove(permission);
					$list.remove(permission);
					updateEffectivePermission();
				}
			});
			$list.add(relatedPermissions);
		};
				
		this.initItemPermissionEditor = function(changes, item, permissionName, permissions, userData) {
			var $list;
			
			var permissionValues = that._getPermissionValues(permissionName);
			var isGroup = function(id) {
				return (id != '0' && userData.usersById[id].is_group != "0");
			};
			var onAddOrUpdate = function(user, permissionVal) {
				var userVal = $list.findByKey(user.id);
				if (userVal) {
					changes.update(userVal, permissionVal);
					$list.update(userVal);
				} else {
					var removed = changes.findRemoved(user.id, item.id, permissionName);
					if (removed) {
						// if previously deleted, move it to modified
						removed.permission = permissionVal;
						changes.update(removed);
						$list.add(removed);
					} else {
						// not modified or deleted => create new
						var p = {"user_id": user.id, "subject": item.id, "name" : permissionName, "value": permissionVal, isnew: true };
						changes.addNew(p);
						$list.add(p);
					}
				}					
			};
			
			$list = mollify.ui.controls.table("mollify-pluginpermissions-editor-permission-list", {
				key: "user_id",
				onRow: function($r, i) { if (isGroup(i.user_id)) $r.addClass("group"); },
				columns: [
					{ id: "user_id", title: mollify.ui.texts.get('pluginPermissionsEditColUser'), renderer: function(i, v, $c){
						var name = (v != '0' ? userData.usersById[v].name : mollify.ui.texts.get('pluginPermissionsEditDefaultPermission'));
						$c.html(name).addClass("user");
					} },
					{
						id: "value",
						title: mollify.ui.texts.get('pluginPermissionsPermissionValue'),
						type: "select",
						options: permissionValues || ['0', '1'],
						formatter: function(item, k) {
							return that._formatPermissionValue(item.name, k);
						},
						onChange: function(item, p) {
							changes.update(item, p);
						}, cellClass: "permission" },
					{ id: "remove", title: "", type:"action", content: mollify.dom.template("mollify-tmpl-permission-editor-listremove").html() }
				],
				onRowAction: function(id, permission) {
					changes.remove(permission);
					$list.remove(permission);
				}
			});
			
			$list.add(permissions);
			var $newUser = mollify.ui.controls.select("mollify-pluginpermissions-editor-new-user", {
				none: mollify.ui.texts.get('pluginPermissionsEditNoUser'),
				title : "name",
				onCreate : function($o, i) { if (isGroup(i.id)) $o.addClass("group"); }
			});
			$newUser.add({ name: mollify.ui.texts.get('pluginPermissionsEditDefaultPermission'), id: 0, is_group: 0 });
			$newUser.add(userData.users);
			$newUser.add(userData.groups);
			
			var $newPermission = mollify.ui.controls.select("mollify-pluginpermissions-editor-new-permission", {
				values: permissionValues || ['0', '1'],
				none: mollify.ui.texts.get('pluginPermissionsEditNoPermission'),
				formatter : function(p) {
					return that._formatPermissionValue(permissionName, p);
				}
			});
			
			var resetNew = function() {
				$newUser.select(false);
				$newPermission.select(false);
			};
			resetNew();
			
			$("#mollify-pluginpermissions-editor-new-add").unbind("click").click(function() {
				var selectedUser = $newUser.selected();
				if (!selectedUser) return;
				var selectedPermission = $newPermission.selected();
				if (!selectedPermission) return;
				
				onAddOrUpdate(selectedUser, selectedPermission);
				resetNew();
			});
		};
		
		this.renderItemContextDetails = function(el, item, $content) {
			mollify.dom.template("mollify-tmpl-permission-context").appendTo($content);
			mollify.ui.process($content, ["localize"]);
						
			that.loadPermissions(item, "filesystem_item_access", true).done(function(p) {
				var userData = that.processUserData(p.users);
				
				$("#mollify-pluginpermissions-context-content").removeClass("loading");
				
				var $list = mollify.ui.controls.table("mollify-pluginpermissions-context-permission-list", {
					key: "user_id",
					columns: [
						{ id: "user_id", title: mollify.ui.texts.get('pluginPermissionsEditColUser'), formatter: function(i, v){
							return (v != '0' ? userData.usersById[v].name : mollify.ui.texts.get('pluginPermissionsEditDefaultPermission'));
						} },
						{ id: "value", title: mollify.ui.texts.get('pluginPermissionsPermissionValue'), formatter: function(i, v){
							return that._formatPermissionValue(i.name, v);
						}}
					]
				});
				$list.add(p.permissions);
				$("#mollify-pluginpermissions-context-edit").click(function(){
					el.close();
					that.editItemPermissions(item);
				});
			}).fail(function(e) {
				el.close();
			});
		};
		
		this.onActivateConfigView = function($c, cv) {
			mollify.service.get("configuration/users?g=1").done(function(l) {
				var users = that.processUserData(l);
				
				var allTypeKeys = that._permissionTypes.keys.all;
				var $optionName, $optionUser, $optionSubject;
				var queryItems = [];

				var getQueryParams = function(i) {					
					var name = $optionName.get();
					var user = $optionUser.get();
					var subject = $optionSubject.get();
										
					var params = {};
					if (name) params.name = name;
					if (user) params.user_id = user.id;
					if (subject) {
						params.subject_type = subject;
						
						if (subject == 'filesystem_item' || subject == 'filesystem_child') {
							if (selectedSubjectItem)
								params.subject_value = selectedSubjectItem.id;
							else
								params.subject_type = null;
						}
					}
					
					return params;
				};
				
				var refresh = function() {
					cv.showLoading(true);
					listView.table.refresh().done(function(){
						cv.showLoading(false);
					});
				};
				
				var removePermissions = function(list) {
					return mollify.service.del("permissions/list/", { list: list });
				}
	
				var listView = new mollify.view.ConfigListView($c, {
					actions: [
						{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
							mollify.ui.dialogs.confirmation({
								title: mollify.ui.texts.get("configAdminPermissionsRemoveConfirmationTitle"),
								message: mollify.ui.texts.get("configAdminPermissionsRemoveConfirmationMessage", [sel.length]),
								callback: function() { removePermissions(sel).done(refresh); }
							});
						}},
						{ id: "action-edit-generic", content:'<i class="icon-globe"></i>', tooltip: mollify.ui.texts.get('pluginPermissionsEditDefaultPermissionsAction'), callback: function() { that.editGenericPermissions(); } },
						{ id: "action-refresh", content:'<i class="icon-refresh"></i>', callback: refresh }
					],
					table: {
						id: "config-permissions-list",
						key: "id",
						narrow: true,
						hilight: true,
						remote: {
							path : "permissions/query",
							paging: { max: 50 },
							queryParams: getQueryParams,
							onData: function(r) { queryItems = r.items; },
							onLoad: function(pr) {
								$c.addClass("loading");
								pr.done(function(r) {
									$c.removeClass("loading");
								});
							}
						},
						defaultSort: { id: "time", asc: false },
						columns: [
							{ type:"selectrow" },
							{ id: "name", title: mollify.ui.texts.get('pluginPermissionsPermissionName'), sortable: true, formatter: function(item, name) {
								return that._formatPermissionName(item);
							} },
							{ id: "value", title: mollify.ui.texts.get('pluginPermissionsPermissionValue'), sortable: true, formatter: function(item, k) {
								return that._formatPermissionValue(item.name, k);
							} },
							{ id: "user_id", title: mollify.ui.texts.get('pluginPermissionsPermissionUser'), sortable: true, formatter: function(item, u) {
								if (!u || u == "0")
									return "";
								return users.usersById[u].name;
							} },
							{ id: "subject", title: mollify.ui.texts.get('pluginPermissionsPermissionSubject'), formatter: function(item, s) {
								if (!s) return "";
								if ((that._permissionTypes.keys.filesystem.indexOf(item.name) >= 0) && queryItems[s]) {
									var itm = queryItems[s];
									if (itm) return that._pathFormatter.format(itm);
								}
								return s;
							} },
							{ id: "remove", title: "", type:"action", content: mollify.dom.template("mollify-tmpl-permission-editor-listremove").html() }
						],
						onRowAction: function(id, permission) { removePermissions([permission]).done(refresh); }
					}
				});
				var $options = $c.find(".mollify-configlistview-options");
				mollify.dom.template("mollify-tmpl-permission-admin-options").appendTo($options);				
				mollify.ui.process($options, ["localize"]);
				
				$("#permissions-subject-any").attr('checked', true);

				$optionName = mollify.ui.controls.select("permissions-name", {
					values: allTypeKeys,
					formatter: function(t) { return mollify.ui.texts.get('permission_'+t); },
					none: mollify.ui.texts.get('pluginPermissionsAdminAny')
				});
				
				$optionUser = mollify.ui.controls.select("permissions-user", {
					values: users.all,
					title: "name",
					none: mollify.ui.texts.get('pluginPermissionsAdminAny')
				});
				
				var $subjectItemSelector = $("#permissions-subject-filesystem-item-selector");
				var $subjectItemSelectorValue = $("#permissions-subject-filesystem-item-value");
				var selectedSubjectItem = false;
				var onSelectItem = function(i) {
					selectedSubjectItem = i;
					$subjectItemSelectorValue.val(that._pathFormatter.format(i));
				};
				$("#permissions-subject-filesystem-item-select").click(function(e) {
					if ($optionSubject.get() == 'filesystem_item') {
						mollify.ui.dialogs.itemSelector({
							title: mollify.ui.texts.get('pluginPermissionsSelectItemTitle'),
							message: mollify.ui.texts.get('pluginPermissionsSelectItemMsg'),
							actionTitle: mollify.ui.texts.get('ok'),
							handler: {
								onSelect: onSelectItem,
								canSelect: function(f) { return true; }
							}
						});
					} else {
						mollify.ui.dialogs.folderSelector({
							title: mollify.ui.texts.get('pluginPermissionsSelectFolderTitle'),
							message: mollify.ui.texts.get('pluginPermissionsSelectFolderMsg'),
							actionTitle: mollify.ui.texts.get('ok'),
							handler: {
								onSelect: onSelectItem,
								canSelect: function(f) { return true; }
							}
						});
					}
					return false;
				});
				$optionSubject = mollify.ui.controls.select("permissions-subject", {
					values: ['none', 'filesystem_item', 'filesystem_child'],
					formatter: function(s) { return mollify.ui.texts.get('pluginPermissionsAdminOptionSubject_'+s); },
					none: mollify.ui.texts.get('pluginPermissionsAdminAny'),
					onChange: function(s) {
						if (s == 'filesystem_item' || s == 'filesystem_child') {
							selectedSubjectItem = false;
							$subjectItemSelectorValue.val("");
							$subjectItemSelector.show();
						} else {
							$subjectItemSelector.hide();
						}
					}
				});
				//refresh();
			});
		};
		
		this.editGenericPermissions = function(user, changeCallback) {
			var permissionData = {
				"new": [],
				"modified": [],
				"removed": []
			};
			var $content = false;
			
			mollify.ui.dialogs.custom({
				resizable: true,
				initSize: [600, 400],
				title: user ? mollify.ui.texts.get('pluginPermissionsEditDialogTitle', user.name) : mollify.ui.texts.get('pluginPermissionsEditDefaultDialogTitle'),
				content: mollify.dom.template("mollify-tmpl-permission-generic-editor", {user: user}),
				buttons: [
					{ id: "yes", "title": mollify.ui.texts.get('dialogSave') },
					{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
				],
				"on-button": function(btn, d) {
					if (btn.id == 'no') {
						d.close();
						return;
					}
					if (permissionData["new"].length === 0 && permissionData.modified.length === 0 && permissionData.removed.length === 0)
						return;
					
					$content.addClass("loading");
					mollify.service.put("permissions/list", permissionData).done(function() { d.close(); if (changeCallback) changeCallback(); }).fail(d.close);
				},
				"on-show": function(h, $d) {
					$content = $d.find("#mollify-pluginpermissions-editor-generic-content");
					h.center();
					var $list = false;
					
					mollify.service.get("permissions/user/"+(user ? user.id : '0')+"/generic/").done(function(r) {
						var done = function(dp) {
							$content.removeClass("loading");
							
							var allTypeKeys = that._permissionTypes.keys.all;
							var values = mollify.helpers.mapByKey(r.permissions, "name", "value");
							var defaultPermissions = dp ? mollify.helpers.mapByKey(dp.permissions, "name", "value") : {};
													
							var permissions = [];
							
							$.each(allTypeKeys, function(i, t) {
								var p = { name: t, value: values[t], subject: '', user_id: user ? user.id : '0' };
								if (!values[t]) p.isnew = true;
								permissions.push(p);
							});
							
							var cols = [
								{ id: "name", title: mollify.ui.texts.get('pluginPermissionsPermissionName'), formatter: function(item, name) {
									if (that._permissionTypes.keys.filesystem.indexOf(name) >= 0) {
										if (!user) return that._formatPermissionName(item) + " (" + mollify.ui.texts.get('permission_system_default') + ")";
										return that._formatPermissionName(item) + " (" + mollify.ui.texts.get(user.is_group == '1' ? 'permission_group_default' : 'permission_user_default') + ")";
									}
									return that._formatPermissionName(item);
								} },
								{
									id: "value",
									title: mollify.ui.texts.get('pluginPermissionsPermissionValue'),
									type: "select",
									options: function(item) {
										var itemValues = that._permissionTypes.values[item.name];
										if (itemValues) return itemValues;
										return ["0", "1"];
									},
									none:  mollify.ui.texts.get('permission_value_undefined'),
									formatter: function(item, k) {
										return that._formatPermissionValue(item.name, k);
									},
									onChange: function(item, p) {
										item.value = p;
										
										permissionData['new'].remove(item);
										permissionData.modified.remove(item);
										permissionData.removed.remove(item);
										
										if (p != null) {
											if (item.isnew) permissionData['new'].push(item);
											else permissionData.modified.push(item);
										} else {
											if (!item.isnew) permissionData.removed.push(item);											
										}
									}
								}
							];
							if (user) {
								cols.push({
									id: "default",
									title: mollify.ui.texts.get('permission_system_default'),
									formatter: function(p) {
										if (!(p.name in defaultPermissions) || defaultPermissions[p.name] === undefined) return "";
										return that._formatPermissionValue(p.name, defaultPermissions[p.name]);								
									}
								});
							}
							
							$list = mollify.ui.controls.table("mollify-pluginpermissions-editor-generic-permission-list", {
								key: "name",
								columns: cols
							});
							$list.add(permissions);
						};
						if (user) mollify.service.get("permissions/user/0/generic/").done(done);
						else done();
					}).fail(h.close);
				}
			});
		};
		
		this.getUserConfigPermissionsListView = function($c, title, u) {
			var permissions = false;
			var defaultPermissions = false;
			var permissionsView = false;
			
			var refresh = function() {
				$c.addClass("loading");
				mollify.service.get("permissions/user/"+u.id+"/generic/").done(function(l) {
					mollify.service.get("permissions/user/0/generic/").done(function(d){
						$c.removeClass("loading");
						
						defaultPermissions = mollify.helpers.mapByKey(d.permissions, "name", "value");
						
						var values = mollify.helpers.mapByKey(l.permissions, "name");												
						permissions = [];
						
						$.each(that._permissionTypes.keys.all, function(i, t) {
							var op = values[t];
							var p =  op ? op : { name: t, value: undefined, subject: '', user_id: u.id };
							permissions.push(p);
						});
						
						permissionsView.table.set(permissions);						
					});
				});
			};

			permissionsView = new mollify.view.ConfigListView($c, {
				title: title,
				actions: [
					{ id: "action-edit", content:'<i class="icon-user"></i>', tooltip: mollify.ui.texts.get(u.is_group == '1' ? 'pluginPermissionsEditGroupPermissionsAction' : 'pluginPermissionsEditUserPermissionsAction'), callback: function() { that.editGenericPermissions(u, refresh); } },
					{ id: "action-edit-defaults", content:'<i class="icon-globe"></i>', tooltip: mollify.ui.texts.get('pluginPermissionsEditDefaultPermissionsAction'), callback: function() { that.editGenericPermissions(false, refresh); } }
				],
				table: {
					id: "config-admin-userpermissions",
					key: "id",
					narrow: true,
					columns: [
						{ id: "name", title: mollify.ui.texts.get('pluginPermissionsPermissionName'), formatter: function(p, v) {
							if (v in that._permissionTypes.keys.filesystem)
								return mollify.ui.texts.get('permission_default_'+v);
							return mollify.ui.texts.get('permission_'+v);
						} },
						{ id: "value", title: mollify.ui.texts.get('pluginPermissionsPermissionValue'), formatter: function(p, v) {
							if (v === undefined) return "";
							return that._formatPermissionValue(p.name, v);
						} },
						{ id: "default", title: mollify.ui.texts.get('permission_system_default'), formatter: function(p) {
							if (!(p.name in defaultPermissions) || defaultPermissions[p.name] === undefined) return "";
							return that._formatPermissionValue(p.name, defaultPermissions[p.name]);
						} }
					]
				}
			});
			
			refresh();
			
			return {
				refresh : refresh,
				view: permissionsView
			};
		};

		return {
			id: "plugin-permissions",
			initialize: that.initialize,
			itemContextHandler : function(item, ctx, data) {
				if (!mollify.session.user.admin) return false;
				
				return {
					details: {
						"title-key": "pluginPermissionsContextTitle",
						"on-render": function(el, $content) {
							that.renderItemContextDetails(el, item, $content);
						}
					},
					actions: [
						{ id: 'pluginPermissions', 'title-key': 'pluginPermissionsAction', callback: function() { that.editItemPermissions(item); } }
					]
				};
			},
			configViewHandler : {
				views : function() {
					return [{
						viewId: "permissions",
						admin: true,
						title: mollify.ui.texts.get("pluginPermissionsConfigViewNavTitle"),
						onActivate: that.onActivateConfigView
					}];
				}
			},
			editGenericPermissions: that.editGenericPermissions,
			getUserConfigPermissionsListView : that.getUserConfigPermissionsListView
		};
	}

	/**
	*	Dropbox plugin
	**/
	mollify.plugin.DropboxPlugin = function() {
		var that = this;
		that.w = 0;
		that.$dbE = false;
		that.items = [];
		that.itemsByKey = {};
		
		this.initialize = function() {
			that._pathFormatter = new mollify.ui.formatters.FilesystemItemPath();
			that.itemContext = new mollify.ui.itemContext();
			mollify.events.addEventHandler(function(e) {
				if (e.type == 'filesystem/delete') that.onRemoveItems(mollify.helpers.extractValue(e.payload.items, "id"));
				//TODO else if (e.type == 'filesystem/rename') that.updateItems(mollify.helpers.extractValue(e.payload.items));
			});
		};
		
		this.onFileViewActivate = function($container) {
			mollify.dom.template("mollify-tmpl-mainview-dropbox").appendTo($container);
			$("#mollify-dropbox-handle").click(function() {
				that.openDropbox();
			});
			
			that.$dbE = $("#mollify-dropbox");
			that.w = $("#mollify-dropbox-content").outerWidth();
			
			var onResize = function() {
				var y = $("#mollify-mainview-header").height();
				that.$dbE.css("top", y+"px").height($(window).height()-y);
			};
			$(window).resize(onResize);
			onResize();
			
			if (mollify.ui.draganddrop) {
				var dnd = {
					canDrop : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return false;
						var item = obj.payload;
						return (that.items.indexOf(item) < 0);
					},
					dropType : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return false;
						return "copy";
					},
					onDrop : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return;
						var item = obj.payload;
						that.onAddItem(item);
					}
				};
				mollify.ui.draganddrop.enableDrop($("#mollify-dropbox-list"), dnd);
				mollify.ui.draganddrop.enableDrop($("#mollify-dropbox-handle"), dnd);
			}
			
			var ab = mollify.ui.controls.dropdown({
				element: $("#mollify-dropbox-actions"),
				container: $("body"),
				hideDelay: 0,
				dynamic: true,
				onShow: function(drp, items) {			
					that.getActions(function(a) {
						if (!a) {
							drp.hide();
							return;
						}
						drp.items(a);
					});
				},
				onItem: function(i, cbr) {
					if (cbr) cbr.done(that.emptyDropbox);
					else that.emptyDropbox();
				},
				onBlur: function(dd) {
					
				}
			});
			that._updateButton();
			that.openDropbox(false);
		};
		
		this.onFileViewDeactivate = function() {
			$("#mollify-dropbox").remove();
		};
		
		this.getActions = function(cb) {				
			if (that.items.length === 0) {
				cb([]);
				return;
			}
			var actions = mollify.helpers.getPluginActions(mollify.plugins.getItemCollectionPlugins(that.items, {src: "dropbox"}));
			actions.push({title:"-"});
			actions.push({"title-key":"dropboxEmpty"});
			cb(mollify.helpers.cleanupActions(actions));
		};
		
		this.openDropbox = function(o) {
			var open = that.$dbE.hasClass("opened");
			if (window.def(o)) {
				if (o == open) return;
			} else {
				o = !open;
			}
			
			if (!o) that.$dbE.removeClass("opened").addClass("closed").animate({"width": "0"}, 300);
			else that.$dbE.addClass("opened").removeClass("closed").animate({"width": that.w+""}, 300);
		};
		
		this.emptyDropbox = function() {
			that.items = [];
			that.itemsByKey = {};
			that.refreshList();
		};
				
		this.onAddItem = function(i) {
			that.openDropbox(true);
			var list = i;
			if (!window.isArray(i))
				list = [i];
			$.each(list, function(ind, item) {
				if (that.items.indexOf(item) >= 0) return;
				that.items.push(item);
				that.itemsByKey[item.id] = item;
			});
			that.refreshList();
			that._updateButton();
		};
		
		this.onRemoveItem = function(item) {
			that.items.remove(item);
			delete that.itemsByKey[item.id];
			that.refreshList();
			that._updateButton();
		};

		this.onRemoveItems = function(ids) {
			var count = 0;
			$.each(ids, function(i, id) {
				var item = that.itemsByKey[id];
				if (!item) return;
				
				that.items.remove(item);
				delete that.itemsByKey[id];
				count++;
			});
			if (count > 0) {
				that.refreshList();
				that._updateButton();
			}
		};
		
		this.refreshList = function() {
			$("#mollify-dropbox-list").empty().append(mollify.dom.template("mollify-tmpl-mainview-dropbox-item", that.items));
			var $items = $("#mollify-dropbox-list .mollify-dropbox-list-item");
			$items.click(function(e) {
				e.preventDefault();
				e.stopPropagation();
				var $i = $(this);
				var item = $i.tmplItem().data;
				$i.tooltip('hide');
				that.itemContext.open({
					item: item,
					element: $i,
					container: mollify.App.getElement(),
					viewport: mollify.App.getElement()
				});
				return false;
			}).each(function() {
				var $i = $(this);
				var item = $i.tmplItem().data;
				$i.tooltip({
					placement: "bottom",
					html: true,
					title: that._pathFormatter.format(item),
					trigger: "hover"
				});
			});
			if (mollify.ui.draganddrop) {
				mollify.ui.draganddrop.enableDrag($items, {
					onDragStart : function($e, e) {
						var item = $e.tmplItem().data;
						return {type:'filesystemitem', payload: item};
					}
				});
			}
			$("#mollify-dropbox-list .mollify-dropbox-list-item > a.item-remove").click(function() {
				mollify.ui.hideActivePopup();
				var $t = $(this);
				that.onRemoveItem($t.tmplItem().data);
			});
		};
		
		this._updateButton = function() {
			var $btn = $("#mollify-dropbox-actions > button");
			if (that.items.length > 0)
				$btn.removeClass("disabled");
			else
				$btn.addClass("disabled");
		};
					
		return {
			id: "plugin-dropbox",
			initialize: that.initialize,
			fileViewHandler : {
				onActivate: that.onFileViewActivate,
				onDeactivate: that.onFileViewDeactivate
			},
			itemContextHandler : function(item, ctx, data) {
				return {
					actions: [
						{ id: 'pluginDropbox', 'title-key': 'pluginDropboxAddTo', callback: function() { that.onAddItem(item); that.openDropbox(true); } }
					]
				};
			},
			itemCollectionHandler : function(items, ctx) {
				if (ctx && ctx.src == 'dropbox') return false;
				return {
					actions: [
						{ 'title-key': 'pluginDropboxAddTo', callback: function() { return that.onAddItem(items); } }
					]
				};
			}
		};
	}

	/**
	*	Share plugin
	**/
	mollify.plugin.SharePlugin = function() {
		var that = this;
		
		this.initialize = function() {
			that._timestampFormatter = new mollify.ui.formatters.Timestamp(mollify.ui.texts.get('shortDateTimeFormat'));
			
			mollify.App.registerView("share", {
				getView : function(rqParts, urlParams) {					
					if (rqParts.length != 2) return false;
					var df = $.Deferred();
					
					var shareId = rqParts[1];
					mollify.service.get("public/"+shareId+"/info/").done(function(result) {
						if (!result || !result.type || (["download", "upload", "prepared_download"].indexOf(result.type) < 0)) {
							df.resolve(new mollify.ui.FullErrorView(mollify.ui.texts.get('shareViewInvalidRequest')));
							return;
						}
						
						if (result.restriction == "private") {
							if (!mollify.session || !mollify.session.authenticated) {
								df.resolve(false);
								return;
							}
						} else if (result.restriction == "pw" && !result.auth) {
							df.resolve(new that.ShareAccessPasswordView(shareId, result));
							return;
						}
						
						df.resolve(that._getShareView(shareId, result));
					}).fail(function() {
						df.resolve(new mollify.ui.FullErrorView(mollify.ui.texts.get('shareViewInvalidRequest')));
					});
					return df.promise();
				}
			});
		};
		
		this._getShareView = function(id, info) {
			var serviceUrl = mollify.service.url("public/"+id, true);			
			var urlProvider = {
				get : function(path, param) {
					var url = serviceUrl;
					if (path) url = url + path;
					if (param) url = mollify.helpers.urlWithParam(url, param);
					return mollify.helpers.noncachedUrl(url);
				}
			}
			
			if (info.type == "download") {
				return new that.ShareDownloadView(id, urlProvider, info.name);
			} else if (info.type == "prepared_download") {
				return new that.SharePreparedDownloadView(id, urlProvider, info.name);
			} else {
				return new that.ShareUploadView(id, urlProvider, info.name);
			}
			return new mollify.ui.FullErrorView(mollify.ui.texts.get('shareViewInvalidRequest'));
		};

		this.ShareAccessPasswordView = function(shareId, info) {
			var vt = this;
			
			this.init = function($c) {
				vt._$c = $c;
				
				mollify.dom.loadContentInto($c, mollify.plugins.url("Share", "public_share_access_password.html"), function() {
					$("#mollify-share-access-button").click(vt._onAccess);
					$("#mollify-share-access-password").focus();
					$("#mollify-share-access-password").bind('keypress', function(e) {
						if ((e.keyCode || e.which) == 13) vt._onAccess();
					});
				}, ['localize']);
			};
			
			this._onAccess = function() {
				var pw = $("#mollify-share-access-password").val();
				if (!pw || pw.length === 0) return;
				var key = window.Base64.encode(pw);
				
				mollify.service.post("public/"+shareId+"/key/", { key: key }).done(function(r) {
					if (!r.result) {
						mollify.ui.dialogs.notification({
							message: mollify.ui.texts.get('shareAccessPasswordFailed')
						});
						$("#mollify-share-access-password").focus();
						return;
					}
					//proceed to original view
					that._getShareView(shareId, info, key).init(vt._$c);
				});				
			};
		};
		
		this.ShareDownloadView = function(shareId, u, shareName) {
			var vt = this;
			
			this.init = function($c) {
				mollify.dom.loadContentInto($c, mollify.plugins.url("Share", "public_share_download.html"), function() {
					$("#mollify-share-title").text(mollify.ui.texts.get("shareViewDownloadTitle", shareName));
					
					setTimeout(function() { mollify.ui.download(u.get()); }, 1000);
				}, ['localize']);
			};
		};

		this.SharePreparedDownloadView = function(shareId, u, shareName) {
			var vt = this;
			
			this.init = function($c) {
				mollify.dom.loadContentInto($c, mollify.plugins.url("Share", "public_share_prepared_download.html"), function() {
					$("#mollify-share-download-prepare").text(mollify.ui.texts.get("shareViewPreparedDownloadPreparingTitle", shareName));
					$("#mollify-share-download").text(mollify.ui.texts.get("shareViewPreparedDownloadDownloadingTitle", shareName));
					$("#mollify-share-download-error").text(mollify.ui.texts.get("shareViewPreparedDownloadErrorTitle", shareName));
					
					mollify.service.get(u.get("/prepare")).done(function(r) {
						$("#mollify-share-download-prepare").hide();
						$("#mollify-share-download").show();
						mollify.ui.download(u.get(false, "key="+r.key));
					}).fail(function() {
						this.handled = true;
						$("#mollify-share-download-prepare").hide();
						$("#mollify-share-download-error").show();
					});
				}, ['localize']);
			};
		};
						
		this.ShareUploadView = function(shareId, u, shareName) {
			var vt = this;
			
			this.init = function($c) {
				var uploadSpeedFormatter = new mollify.ui.formatters.Number(1, mollify.ui.texts.get('dataRateKbps'), mollify.ui.texts.get('decimalSeparator'));
				
				mollify.dom.loadContentInto($c, mollify.plugins.url("Share", "public_share_upload.html"), function() {
					$("#mollify-share-title").text(mollify.ui.texts.get("shareViewUploadTitle", shareName));
					vt._uploadProgress = new that.PublicUploaderProgress($("#mollify-share-public-upload-progress"));
					
					mollify.ui.uploader.initUploadWidget($("#mollify-share-public-uploader"), {
						url: u.get(false, "format=binary"),
						dropElement: $("#mollify-share-public"),
						handler: {
							start: function(files, ready) {							
								vt._uploadProgress.start(mollify.ui.texts.get(files.length > 1 ? "mainviewUploadProgressManyMessage" : "mainviewUploadProgressOneMessage", files.length));
								ready();
							},
							progress: function(pr, br) {
								var speed = "";
								if (br) speed = uploadSpeedFormatter.format(br/1024);
								vt._uploadProgress.update(pr, speed);
							},
							finished: function() {
								setTimeout(function() { vt._uploadProgress.success(mollify.ui.texts.get('mainviewFileUploadComplete')); }, 1000);
							},
							failed: function(e) {
								if (e && e.code == 216) {
									vt._uploadProgress.failure(mollify.ui.texts.get('mainviewFileUploadNotAllowed'));
								} else {
									vt._uploadProgress.failure(mollify.ui.texts.get('mainviewFileUploadFailed'));
								}
							}
						}
					});
				}, ['localize']);
			};
		};
		
		this.PublicUploaderProgress = function($e) {
			var t = this;
			t._$title = $e.find(".title");
			t._$speed = $e.find(".speed");
			t._$bar = $e.find(".bar");
			
			return {
				start : function(title) {
					$e.removeClass("success failure");
					t._$title.text(title ? title : "");
					t._$speed.text("");
					t._$bar.css("width", "0%");
				},
				update : function(progress, speed) {
					t._$bar.css("width", progress+"%");
					t._$speed.text(speed ? speed : "");
				},
				success : function(text) {
					$e.addClass("success");
					t._$bar.css("width", "0%");
					t._$title.text(text);
					t._$speed.text("");
				},
				failure : function(text) {
					$e.addClass("failure");
					t._$title.text(text);
					t._$speed.text("");
					t._$bar.css("width", "0%");
				}
			}
		};
		
		this.renderItemContextDetails = function(el, item, $content, data) {
			$content.addClass("loading");
			mollify.templates.load("shares-content", mollify.helpers.noncachedUrl(mollify.plugins.url("Share", "content.html"))).done(function() {
				$content.removeClass("loading");
				mollify.dom.template("mollify-tmpl-shares", {item: item}).appendTo($content);
				that.loadShares(item).done(function(shares) {
					that.initContent(item, shares, $content);
				});
			});
		};
		
		this.loadShares = function(item) {
			if (!item) return mollify.service.get("share/all/");
			return mollify.service.get("share/items/"+item.id).done(function(result) {
				that.refreshShares(result);
			});
		};
		
		this.refreshShares = function(shares) {
			that.shares = shares;
			that.shareIds = [];
			
			for (var i=0, j=that.shares.length; i<j; i++)
				that.shareIds.push(shares[i].id);			
		};
		
		this.getShare = function(id) {
			return that.shares[that.shareIds.indexOf(id)];
		}
		
		this.initContent = function(item, shares, $c) {
			var title = item.shareTitle ? item.shareTitle : mollify.ui.texts.get(item.is_file ? 'shareDialogShareFileTitle' : 'shareDialogShareFolderTitle');
			$("#share-item-title").html(title);
			$("#share-item-name").html(item.name);
			$("#share-dialog-content").removeClass("loading");
			$("#share-new").click(function() { that.onAddShare(item); } );
			that._context = mollify.ui.controls.slidePanel($("#share-list"), { relative: true });
			
			that.updateShareList(item);
		};
		
		this.getShareLink = function(share) {
			return mollify.App.getPageUrl("share/"+share.id);
		};
		
		this.updateShareList = function(item) {
			$("#share-items").empty();
			
			if (that.shares.length === 0) {
				$("#share-items").html('<div class="no-share-items">'+mollify.ui.texts.get("shareDialogNoShares")+'</div>');
				return;
			}
			
			var opt = {
				itemClass : function() {
					var c = "item-share";
					if (!this.data.active)
						c = c + " inactive";
					if (!this.data.name || this.data.name.length === 0)
						c = c + " unnamed";
					return c;
				},
				link : function() {
					return that.getShareLink(this.data);
				}
			};
			
			mollify.dom.template("share-template", that.shares, opt).appendTo("#share-items");
			mollify.ui.process($("#share-list"), ["localize"]);
			if (!mollify.ui.clipboard) {
				$(".share-link-copy").hide();
			} else {
				var h = {
					onMouseOver: function($e, clip) { clip.setHandCursor(true); $e.addClass("hover"); },
					onMouseOut: function($e) { $e.removeClass("hover"); }
				}
				$.each($(".share-link-copy"), function(i, e) {
					var share = $(e).tmplItem().data;
					mollify.ui.clipboard.enableCopy($(e), that.getShareLink(share), h);
				});
			}
	
			$(".share-link-toggle").click(function() {
				var share = $(this).tmplItem().data;
				if (!share.active) return;

				var $link = $(this).parent();				
				var $c = $link.parent().siblings(".share-link-content");
				var $share = $c.parent();

				$(".share-link-content").not($c).hide();
				$(".item-share").not($share).removeClass("active");
				
				$share.toggleClass("active");
				$c.slideToggle();
				return false;
			});
			$(".item-share").hover(function() {
					$(".item-share").removeClass("hover");
					$(this).addClass("hover");
				},
				function() {
			});
			$(".share-edit").click(function(e) {
				var share = $(this).tmplItem().data;
				that.onEditShare(item, share);
			});
			$(".share-remove").click(function(e) {
				var share = $(this).tmplItem().data;
				that.removeShare(item, share);
			});
		}

		this.openContextContent = function(toolbarId, contentTemplateId, tmplData) {
			/*var $c = $("#share-context").empty();*/
			var $c = that._context.getContentElement().empty();
			
			mollify.dom.template(contentTemplateId, tmplData).appendTo($c);
			mollify.ui.process($c, ["localize"]);
			mollify.ui.controls.datepicker("share-validity-expirationdate-value", {
				format: mollify.ui.texts.get('shortDateTimeFormat'),
				time: true
			});
			that._context.show(false, 280);
			/*$("#share-context-container").animate({
				"top" : "18px"
			}, 500);*/
		}
		
		this.closeAddEdit = function() {
			that._context.hide();
			/*$("#share-context-container").animate({
				"top" : "300px"
			}, 500);*/
		}
		
		this.onAddShare = function(item) {
			that.openContextContent('add-share-title', 'share-context-addedit-template');
			$("#share-general-name").val('');
			$('#share-general-active').attr('checked', true);
			$("#share-access-norestriction").attr('checked', true);
			$("#share-access-public-password-value").attr("placeholder", mollify.ui.texts.get("shareDialogShareAccessEnterPwTitle"));
			
			$("#share-addedit-btn-ok").click(function() {
				$("#share-access-public-password-value").removeClass("error");
				
				var name = $("#share-general-name").val();
				var active = $("#share-general-active").is(":checked");
				var expiration = $("#share-validity-expirationdate-value").data("mollify-datepicker").get();
				
				var restriction = false;
				if ($("#share-access-private-loggedin").is(":checked")) restriction = { type: "private" };
				else if ($("#share-access-public-password").is(":checked")) {
					var value = $("#share-access-public-password-value").val();
					if (!value || value.length === 0) {
						$("#share-access-public-password-value").addClass("error");
						return;
					}
					restriction = { type: "pw", value : value };
				}
				
				$("#share-items").empty().append('<div class="loading"/>');
				that.closeAddEdit();
				that.addShare(item, name || '', expiration, active, restriction);
			});
			
			$("#share-addedit-btn-cancel").click(function() {
				that.closeAddEdit();
			});
		};
		
		this.onEditShare = function(item, share) {
			that.openContextContent('edit-share-title', 'share-context-addedit-template', { edit: true });
			
			$("#share-general-name").val(share.name);
			$("#share-general-active").attr("checked", share.active);

			var oldRestrictionPw = (share.restriction == 'pw');
			if (share.restriction == 'pw')
				$("#share-access-public-password").attr('checked', true);
			else if (share.restriction == 'private')
				$("#share-access-private-loggedin").attr('checked', true);
			else
				$("#share-access-norestriction").attr('checked', true);
			
			if (share.expiration)
				$("#share-validity-expirationdate-value").data("mollify-datepicker").set(mollify.helpers.parseInternalTime(share.expiration));
			
			if (oldRestrictionPw) $("#share-access-public-password-value").attr("placeholder", mollify.ui.texts.get("shareDialogShareAccessChangePwTitle"));
			else $("#share-access-public-password-value").attr("placeholder", mollify.ui.texts.get("shareDialogShareAccessEnterPwTitle"));
						
			$("#share-addedit-btn-ok").click(function() {
				var name = $("#share-general-name").val();
				var active = $("#share-general-active").is(":checked");
				var expiration = $("#share-validity-expirationdate-value").data("mollify-datepicker").get();
				
				var restriction = false;
				if ($("#share-access-private-loggedin").is(":checked")) restriction = { type: "private" };
				else if ($("#share-access-public-password").is(":checked")) {
					var value = $("#share-access-public-password-value").val();
					if (!oldRestrictionPw && (!value || value.length === 0)) {
						$("#share-access-public-password-value").addClass("error");
						return;
					}
					restriction = { type: "pw", value : value };
				}
				
				$("#share-items").empty().append('<div class="loading"/>')
				that.closeAddEdit();
				that.editShare(item, share.id, name || '', expiration, active, restriction);
			});
			
			$("#share-addedit-btn-cancel").click(function() {
				that.closeAddEdit();
			});
		}
		
		this.onOpenShares = function(item) {
			mollify.templates.load("shares-content", mollify.helpers.noncachedUrl(mollify.plugins.url("Share", "content.html"))).done(function() {
				mollify.ui.dialogs.custom({
					resizable: true,
					initSize: [600, 470],
					title: item.shareTitle ? item.shareTitle : mollify.ui.texts.get(item.is_file ? 'shareDialogShareFileTitle' : 'shareDialogShareFolderTitle'),
					content: mollify.dom.template("mollify-tmpl-shares", {item: item, bubble: false}),
					buttons: [
						{ id: "no", "title": mollify.ui.texts.get('dialogClose') }
					],
					"on-button": function(btn, d) {
						d.close();
						that.d = false;
					},
					"on-show": function(h, $d) {
						that.d = h;
						that.loadShares(item).done(function(shares) { that.initContent(item, shares, $d); });
					}
				});
			});
		};
		
		this.addShare = function(item, name, expiration, active, restriction) {
			return mollify.service.post("share/", { item: item.id, name: name, expiration: mollify.helpers.formatInternalTime(expiration), active: active, restriction: restriction }).done(function(result) {
				that.refreshShares(result);
				that.updateShareList(item);
			}).fail(that.d.close);
		}
	
		this.editShare = function(item, id, name, expiration, active, restriction) {
			return mollify.service.put("share/"+id, { id: id, name: name, expiration: mollify.helpers.formatInternalTime(expiration), active: active, restriction: restriction }).done(function(result) {
				var share = that.getShare(id);
				share.name = name;
				share.active = active;
				share.expiration = mollify.helpers.formatInternalTime(expiration);
				share.restriction = restriction ? restriction.type : false;
				that.updateShareList(item);
			}).fail(that.d.close);
		}
		
		this.removeShare = function(item, share) {
			return mollify.service.del("share/"+share.id).done(function(result) {
				var i = that.shareIds.indexOf(share.id);
				that.shareIds.splice(i, 1);
				that.shares.splice(i, 1);
				that.updateShareList(item);
			}).fail(that.d.close);
		}

		this.removeAllItemShares = function(item) {
			return mollify.service.del("share/items/"+item.id);
		}
		
		this.getActionValidationMessages = function(action, items, validationData) {
			var messages = [];
			$.each(items, function(i, itm) {
				var msg;
				if (itm.reason == 'item_shared') msg = mollify.ui.texts.get("pluginShareActionValidationDeleteShared", itm.item.name);
				else if (itm.reason == 'item_shared_others') msg = mollify.ui.texts.get("pluginShareActionValidationDeleteSharedOthers", itm.item.name);
				else return;

				messages.push({
					message: msg,
					acceptable: itm.acceptable,
					acceptKey: itm.acceptKey
				});
			});
			return messages;
		}
		
		this.getListCellContent = function(item, data) {
			if (!item.id || item.id.length === 0 || !data || !data["plugin-share-info"]) return "";
			var itemData = data["plugin-share-info"][item.id];
			if (!itemData) return "<div id='item-share-info-"+item.id+"' class='filelist-item-share-info empty'></div>";
			if (itemData.own > 0)
				return "<div id='item-share-info-"+item.id+"' class='filelist-item-share-info'><i class='icon-external-link'></i>&nbsp;"+itemData.own+"</div>";
			return "<div id='item-share-info-"+item.id+"' class='filelist-item-share-info others' title='"+mollify.ui.texts.get("pluginShareFilelistColOtherShared")+"'><i class='icon-external-link'></i></div>";
		};

		this._updateListCellContent = function(item, data) {
		};
		
		this.showShareBubble = function(item, cell) {
			that.d = mollify.ui.controls.dynamicBubble({element:cell, title: item.name, container: $("#mollify-filelist-main-items")});
			
			mollify.templates.load("shares-content", mollify.helpers.noncachedUrl(mollify.plugins.url("Share", "content.html"))).done(function() {
				that.d.content(mollify.dom.template("mollify-tmpl-shares", {item: item, bubble: true}));
				that.loadShares(item).done(function(shares) {
					that.initContent(item, shares, that.d.element());
					that.d.position();
				});
			});
		};

		this.onActivateConfigView = function($c, cv) {
			var shares = false;
			var items = false;
			var invalid = [];
			var listView = false;

			var updateShares = function() {
				cv.showLoading(true);
				
				that.loadShares().done(function(l) {
					shares = l.shares[mollify.session.user.id];
					items = l.items;
					invalid = l.invalid;
					listView.table.set(items);
					
					cv.showLoading(false);
				});
			};
			var isValid = function(i) {
				if (invalid.length === 0) return true;
				return (invalid.indexOf(i.id) < 0);
			};

			listView = new mollify.view.ConfigListView($c, {
				table: {
					key: "id",
					columns: [
						{ id: "icon", title:"", valueMapper: function(item) {
							return isValid(item) ? '<i class="icon-file"></i>' : '<i class="icon-exclamation"></i>';
						} },
						{ id: "name", title: mollify.ui.texts.get('fileListColumnTitleName') },
						{ id: "count", title: mollify.ui.texts.get('pluginShareConfigViewCountTitle'), formatter: function(item) {
							return shares[item.id].length;
						} },
						{ id: "edit", title: "", type: "action", formatter: function(item) {
							return isValid(item) ? '<i class="icon-edit"></i>' : '';
						} },
						{ id: "remove", title: "", type: "action", content: '<i class="icon-trash"></i>' }
					],
					onRow: function($r, item) {
						if (!isValid(item)) $r.addClass("error");	
					},
					onRowAction: function(id, item) {
						if (id == "edit") {
							that.onOpenShares(item);
						} else if (id == "remove") {
							that.removeAllItemShares(item).done(updateShares);
						}
					}
				}
			});
			updateShares();
		}
		
		return {
			id: "plugin-share",
			backendPluginId: "Share",
			resources: {
				css: true
			},
			initialize: that.initialize,

			configViewHandler : {
				views : function() {
					return [{
						viewId: "shares",
						title: mollify.ui.texts.get("pluginShareConfigViewNavTitle"),
						onActivate: that.onActivateConfigView
					}];
				}
			},
			fileViewHandler : {
				filelistColumns : function() {
					return [{
						"id": "share-info",
						"request-id": "plugin-share-info",
						"title-key": "",
						"content": that.getListCellContent,
						"request": function(parent) { return {}; },
						"on-click": function(item, data) {
							if (!item.id || item.id.length === 0 || !data || !data["plugin-share-info"]) return;
							var itemData = data["plugin-share-info"][item.id];
							if (!itemData) return;
							
							if (itemData.own > 0)
								that.showShareBubble(item, $("#item-share-info-"+item.id));
						}
					}];
				}
			},
			itemContextHandler : function(item, ctx, data) {
				if (!ctx.details.permissions.share_item) return false;
				return {				
					actions: [
						{ id: 'pluginShare', 'title-key': 'itemContextShareMenuTitle', icon: 'external-link', callback: function() { that.onOpenShares(item); } }
					]
				};
			},
			
			actionValidationHandler : function() {
				return {
					getValidationMessages : that.getActionValidationMessages
				}
			},

			openShares : that.onOpenShares
		};
	}
	
	/**
	*	Send via email -plugin
	**/
	mollify.plugin.SendViaEmailPlugin = function() {
		var that = this;
		
		this.initialize = function() {};
		
		return {
			id: "plugin-sendviaemail",
			initialize: that.initialize,

			itemContextHandler : function(item, ctx, data) {
				if (!item.is_file) return false;
				return {
					actions: [
						{ 'title-key': 'actionSendViaEmailSingle', callback: function() { } }
					]
				};
			},
			itemCollectionHandler : function(items) {
				var folder = false;
				$.each(items, function(i, itm){ if (!itm.is_file) { folder = true; return false; } });				
				if (folder) return false;
				
				return {
					actions: [
						{ 'title-key': 'actionSendViaEmailMultiple', callback: function() { } }
					]
				};
			}
		};
	}
	
	/**
	*	Registration -plugin
	**/
	mollify.plugin.RegistrationPlugin = function() {
		var that = this;
		
		this.initialize = function() {
			mollify.App.registerView("registration", {
				getView : function(rqParts, urlParams) {
					if (rqParts.length != 2) return false;
					
					if (rqParts[1] == "new") {
						return new that.NewRegistrationView(urlParams);
					} else if (rqParts[1] == "confirm") {
						return new that.ConfirmRegistrationView(urlParams);
					}
					return false;
				}
			});
		};
		
		this.NewRegistrationView = function() {
			var vt = this;
			
			this.init = function($c) {
				mollify.dom.loadContentInto($c, mollify.plugins.url("Registration", "registration_create.html"), function() {
					$("#register-new-button").click(vt.onRegister);
					$("#registration-new-name").focus();
				}, ['localize']);
			};
			
			this.onRegister = function() {
				$(".control-group").removeClass("error");
				
				var name = $("#registration-new-name").val();
				var pw = $("#registration-new-pw").val();
				var confirmPw = $("#registration-new-pw-confirm").val();
				var email = $("#registration-new-email").val();
				
				var proceed = true;
				if (!name || name.length === 0) {
					$("#registration-new-name").closest(".control-group").addClass("error");
					proceed = false;
				}
				if (!pw || pw.length === 0) {
					$("#registration-new-pw").closest(".control-group").addClass("error");
					proceed = false;
				}
				if (!confirmPw || confirmPw.length === 0) {
					$("#registration-new-pw-confirm").closest(".control-group").addClass("error");
					proceed = false;
				}
				if (!email || email.length === 0) {
					$("#registration-new-email").closest(".control-group").addClass("error");
					proceed = false;
				}
				if (!proceed) return;
				
				if (pw != confirmPw) {
					$("#registration-new-pw").closest(".control-group").addClass("error");
					$("#registration-new-pw-confirm").closest(".control-group").addClass("error");
					return;
				}
				
				mollify.service.post("registration/create", {name:name, password:window.Base64.encode(pw), email:email, data: null}).done(function() {
					$("#mollify-registration-form").hide();
					$("#mollify-registration-main").addClass("wide");
					$("#mollify-registration-success").show();
				}).fail(function() {
					this.handled = true;
					mollify.ui.dialogs.error({message: mollify.ui.texts.get('registrationFailed')});
				});
			}
		};
		
		this.ConfirmRegistrationView = function(urlParams) {
			var vt = this;
			
			this.init = function($c) {				
				mollify.dom.loadContentInto($c, mollify.plugins.url("Registration", "registration_confirm.html"), function() {
					if (!urlParams.email || urlParams.email.length === 0) {
							$("#mollify-registration-main").addClass("complete").empty().append(mollify.dom.template("mollify-tmpl-registration-errormessage", {message: mollify.ui.texts.get('registrationInvalidConfirm')}));
						return;
					}
					vt._email = urlParams.email;

					if (urlParams.key && urlParams.key.length > 0) {
						vt._confirm(vt._email, urlParams.key);
					} else {
						$("#mollify-registration-confirm-form").show();
						$("#registration-confirm-email").val(vt._email);
						$("#register-confirm-button").click(vt.onConfirm);
						$("#registration-confirm-key").focus();
					}
				}, ['localize']);
			};
			
			this.onConfirm = function() {
				$(".control-group").removeClass("error");		
				var key = $("#registration-confirm-key").val();
				
				var proceed = true;
				if (!key || key.length === 0) {
					$("#registration-confirm-key").closest(".control-group").addClass("error");
					proceed = false;
				}
				if (!proceed) return;

				vt._confirm(vt._email, key, true);
			};
			
			this._confirm = function(email, key, fromForm) {
				$("#mollify-registration-main").addClass("loading");
				mollify.service.post("registration/confirm", {email:email, key:key}).done(function(r) {
					$("#mollify-registration-confirm-form").hide();
					$("#mollify-registration-main").removeClass("loading").addClass("wide");
					
					if (!r.require_approval)
						$("#mollify-registration-confirm-success").show();
					else
						$("#mollify-registration-confirm-success-wait-approval").show();
				}).fail(function(error) {
					$("#mollify-registration-main").removeClass("loading");
					this.handled = true;
					if (fromForm)
						mollify.ui.dialogs.error({message: mollify.ui.texts.get('registrationConfirmFailed')});
					else {
						$("#mollify-registration-main").addClass("wide").empty().append(mollify.dom.template("mollify-tmpl-registration-errormessage", {message: mollify.ui.texts.get('registrationConfirmFailed')}));
					}
				});
			};
		};
		
		return {
			id: "plugin-registration",
			initialize: that.initialize,

			show : function() {
				mollify.App.openPage('registration/new');
			}
		};
	}
}(window.jQuery, window.mollify);

/**
 * ui.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
!function($, mollify) {

	"use strict"; // jshint ;_;
	
	//var t = mollify;
	
	/* TEXTS */
	mollify.ui.texts = {};
	var tt = mollify.ui.texts;
	
	tt.locale = null;
	tt._dict = {};
	tt._pluginTextsLoaded = [];
	
	tt.load = function(id) {
		var df = $.Deferred();
		if (tt.locale) {
			return df.resolve();
		}

		return tt._load("localization/texts_"+(id || 'en')+".json", df);
	};
	
	tt.clear = function() {
		tt.locale = null;
		tt._dict = {};
		tt._pluginTextsLoaded = [];		
	};

	tt.loadPlugin = function(pluginId) {
		if (tt._pluginTextsLoaded.indexOf(pluginId) >= 0) return $.Deferred().resolve();
		
		return tt._load(mollify.plugins.getLocalizationUrl(pluginId), $.Deferred()).done(function() {
			tt._pluginTextsLoaded.push(pluginId);
		});
	};
	
	tt._load = function(u, df) {
		var url = mollify.resourceUrl(u);
		if (!url) return df.resolve();
		
		$.ajax({
			type: "GET",
			dataType: 'text',
			url: url
		}).done(function(r) {
			if (!r || (typeof(r) != "string")) {
				df.reject();
				return;
			}
			var t = false;
			try {
				t = JSON.parse(r);
			} catch (e) {
				new mollify.ui.FullErrorView('<b>Localization file syntax error</b> (<code>'+url+'</code>)', '<code>'+e.message+'</code>').show();
				return;
			}
			if (!tt.locale)
				tt.locale = t.locale;
			else
				if (tt.locale != t.locale) {
					df.reject();
					return;
				}
			tt.add(t.locale, t.texts);
			df.resolve(t.locale);			
		}).fail(function(e) {
			if (e.status == 404) {
				new mollify.ui.FullErrorView('Localization file missing: <code>'+url+'</code>', 'Either create the file or use <a href="https://code.google.com/p/mollify/wiki/ClientResourceMap">client resource map</a> to load it from different location, or to ignore it').show();
				return;
			}
			df.reject();
		});
		return df;
	};
			
	tt.add = function(locale, t) {
		if (!locale || !t) return;
		
		if (!tt.locale) tt.locale = locale;
		else if (locale != tt.locale) return;
		
		for (var id in t) tt._dict[id] = t[id];
	};
	
	tt.get = function(id, p) {
		if (!id) return "";
		var t = tt._dict[id];
		if (!t) return "!"+tt.locale+":"+id;
		if (p !== undefined) {
			if (!window.isArray(p)) p = [p];
			for (var i=0,j=p.length; i<j; i++)
				t = t.replace("{" + i + "}", p[i]);
		}
		return t;
	};
	
	tt.has = function(id) {
		return !!tt._dict[id];	
	};
	
	/* FORMATTERS */
	
	mollify.ui.formatters = {
		ByteSize : function(nf) {			
			this.format = function(b) {
				if (!window.def(b)) return "";
				
				var bytes = b;
				if (typeof(b) === "string") {
					bytes = parseInt(bytes, 10);
					if (isNaN(bytes)) return "";
				} else if (typeof(b) !== "number") return "";
				
				if (bytes < 1024)
					return (bytes == 1 ? mollify.ui.texts.get('sizeOneByte') : mollify.ui.texts.get('sizeInBytes', nf.format(bytes)));
		
				if (bytes < (1024 * 1024)) {
					var kilobytes = bytes / 1024;
					return (kilobytes == 1 ? mollify.ui.texts.get('sizeOneKilobyte') : mollify.ui.texts.get('sizeInKilobytes', nf.format(kilobytes)));
				}
		
				if (bytes < (1024 * 1024 * 1024)) {
					var megabytes = bytes / (1024 * 1024);
					return mollify.ui.texts.get('sizeInMegabytes', nf.format(megabytes));
				}
		
				var gigabytes = bytes / (1024 * 1024 * 1024);
				return mollify.ui.texts.get('sizeInGigabytes', nf.format(gigabytes));
			};
		},
		Timestamp : function(fmt) {
			this.format = function(ts) {
				if (ts == null) return "";
				if (typeof(ts) === 'string') ts = mollify.helpers.parseInternalTime(ts);
				return ts.toString(fmt);
			};
		},
		Number : function(precision, unit, ds) {
			this.format = function(n) {
				if (!window.def(n) || typeof(n) !== 'number') return "";
				
				var s = Math.pow(10, precision);
				var v = Math.floor(n * s) / s;
				var sv = v.toString();
				if (ds) sv = sv.replace(".", ds);
				if (unit) return sv + " " + unit;
				return sv;
			};
		},
		FilesystemItemPath: function() {
			this.format = function(item) {
				if (!item) return "";
				return mollify.filesystem.rootsById[item.root_id].name + (item.path.length > 0 ? ":&nbsp;" + item.path : "");
			}
		}
	};
	
	/* UI */
	mollify.ui.uploader = false;
	mollify.ui.draganddrop = false;
	mollify.ui._activePopup = false;
	
	mollify.ui.initialize = function() {
		var list = [];		
		list.push(mollify.ui.initializeLang());
		
		// add invisible download frame
		$("body").append('<div style="width: 0px; height: 0px; overflow: hidden;"><iframe id="mollify-download-frame" src=""></iframe></div>');
		
		$(window).click(function(e) {
			// hide popups when clicked outside
			if (mollify.ui._activePopup) {
				if (e && e.toElement && mollify.ui._activePopup.element) {
					var popupElement = mollify.ui._activePopup.element();
					if (popupElement.has($(e.toElement)).length > 0) return;
				}
				mollify.ui.hideActivePopup();
			}
		});
		list.push(mollify.templates.load("dialogs.html"));
		
		if (!mollify.ui.draganddrop) mollify.ui.draganddrop = (window.Modernizr.draganddrop) ? new mollify.MollifyHTML5DragAndDrop() : new mollify.MollifyJQueryDragAndDrop();
		if (!mollify.ui.uploader) mollify.ui.uploader = new mollify.MollifyHTML5Uploader();
		if (!mollify.ui.clipboard) new mollify.ZeroClipboard(function(cb) {
			mollify.ui.clipboard = cb;
		});
		
		var df = $.Deferred();
		$.when.apply($, list).done(df.resolve).fail(df.reject);
		return df;
	};
	
	mollify.ui.initializeLang = function() {
		var df = $.Deferred();
		var lang = (mollify.session.user && mollify.session.user.lang) ? mollify.session.user.lang : (mollify.settings.language["default"] || 'en');
		
		if (mollify.ui.texts.locale && mollify.ui.texts.locale == lang) return df.resolve();
		
		var pluginTextsLoaded = mollify.ui.texts._pluginTextsLoaded;
		if (mollify.ui.texts.locale) {
			mollify.App.getElement().removeClass("lang-"+mollify.ui.texts.locale);
			mollify.ui.texts.clear();
		}
		
		var list = [];
		list.push(mollify.ui.texts.load(lang).done(function(locale) {
			$("html").attr("lang", locale);
			mollify.App.getElement().addClass("lang-"+locale);
		}));
		
		if (pluginTextsLoaded) {
			$.each(pluginTextsLoaded, function(i, id) {
				list.push(mollify.ui.texts.loadPlugin(id));
			});
		}
		$.when.apply($, list).done(df.resolve).fail(df.reject);
		return df;
	};
	
	mollify.ui.hideActivePopup = function() {
		if (mollify.ui._activePopup) mollify.ui._activePopup.hide();
		mollify.ui._activePopup = false;
	};
	
	mollify.ui.activePopup = function(p) {
		if (p===undefined) return mollify.ui._activePopup;
		if (mollify.ui._activePopup) {
			if (p.parentPopupId && mollify.ui._activePopup.id == p.parentPopupId) return;
			mollify.ui._activePopup.hide();
		}
		mollify.ui._activePopup = p;
		if (!mollify.ui._activePopup.id) mollify.ui._activePopup.id = new Date().getTime();
		return mollify.ui._activePopup.id;
	};
	
	mollify.ui.isActivePopup = function(id) {
		return (mollify.ui._activePopup && mollify.ui._activePopup.id == id);
	};
	
	mollify.ui.removeActivePopup = function(id) {
		if (!id || !mollify.ui.isActivePopup(id)) return;
		mollify.ui._activePopup = false;
	};
	
	mollify.ui.download = function(url) {
		if (mollify.App.mobile)
			window.open(url);
		else
			$("#mollify-download-frame").attr("src", url);
	};
		
	mollify.ui.itemContext = function(o) {
		var ict = {};
		ict._activeItemContext = false;
		
		ict.open = function(spec) {
			var item = spec.item;
			var $e = spec.element;
			var $c = spec.viewport;
			var $t = spec.container;
			var folder = spec.folder;
			
			var popupId = "mainview-itemcontext-"+item.id;
			if (mollify.ui.isActivePopup(popupId)) {
				return;
			}
			
			var openedId = false;
			if (ict._activeItemContext) {
				openedId = ict._activeItemContext.item.id;
				ict._activeItemContext.close();
				ict._activeItemContext = false;
			}
			if (item.id == openedId) return;
			
			var $cont = $t || $e.parent();				
			var html = mollify.dom.template("mollify-tmpl-main-itemcontext", item, {})[0].outerHTML;
			$e.popover({
				title: item.name,
				html: true,
				placement: 'bottom',
				trigger: 'manual',
				template: '<div class="popover mollify-itemcontext-popover"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>',
				content: html,
				container: $cont
			}).bind("shown", function(e) {
				var api = { id: popupId, hide: function() { $e.popover('destroy'); } };
				api.close = api.hide;					
				mollify.ui.activePopup(api);

				var $el = $("#mollify-itemcontext-"+item.id);
				var $pop = $el.closest(".popover");
				var maxRight = $c.outerWidth();
				var popLeft = $pop.offset().left - $cont.offset().left;
				var popW = $pop.outerWidth();
				if (popLeft < 0)						
					popLeft = 0;
				else if ((popLeft + popW) > maxRight)
					popLeft = maxRight - popW - 10;
				$pop.css("left", popLeft + "px");
				
				var arrowPos = ($e.offset().left - $cont.offset().left) + ($e.outerWidth() / 2);
				arrowPos = Math.max(0, (arrowPos - popLeft));
				$pop.find(".arrow").css("left", arrowPos + "px");
				
				$pop.find(".popover-title").append($('<button type="button" class="close">×</button>').click(api.close));
				var $content = $el.find(".mollify-itemcontext-content");
				
				mollify.filesystem.itemDetails(item, mollify.plugins.getItemContextRequestData(item)).done(function(d) {
					if (!d) {
						$t.hide();
						return;
					}
					
					var ctx = {
						details: d,
						hasPermission : function(name, required) { mollify.helpers.hasPermission(d.permissions, name, required); },
						hasParentPermission : function(name, required) { mollify.helpers.hasPermission(d.parent_permissions, name, required); },
						folder : spec.folder,
						folder_writable : spec.folder_writable
					};
					ict.renderItemContext(api, $content, item, ctx);
					//$e[0].scrollIntoView();
				});
			}).bind("hidden", function() {
				$e.unbind("shown").unbind("hidden");
				mollify.ui.removeActivePopup(popupId);
			});
			$e.popover('show');
		};
		
		ict.renderItemContext = function(cApi, $e, item, ctx) {
			var descriptionEditable = mollify.features.hasFeature("descriptions") && ctx.hasPermission("edit_description");
			var showDescription = descriptionEditable || !!ctx.details.description;
			
			var plugins = mollify.plugins.getItemContextPlugins(item, ctx);
			var actions = mollify.helpers.getPluginActions(plugins);
			var primaryActions = mollify.helpers.getPrimaryActions(actions);
			var secondaryActions = mollify.helpers.getSecondaryActions(actions);
			
			var o = {
				item:item,
				details:ctx.details,
				showDescription: showDescription,
				description: ctx.details.description || '',
				session: mollify.session,
				plugins: plugins,
				primaryActions : primaryActions
			};
			
			$e.removeClass("loading").empty().append(mollify.dom.template("mollify-tmpl-main-itemcontext-content", o, {
				title: function(o) {
					var a = o;
					if (a.type == 'submenu') a = a.primary;
					return a.title ? a.title : mollify.ui.texts.get(a['title-key']);
				}
			}));
			$e.click(function(e){
				// prevent from closing the popup when clicking the popup itself
				e.preventDefault();
				return false;
			});
			mollify.ui.process($e, ["localize"]);
			
			if (descriptionEditable) {
				mollify.ui.controls.editableLabel({element: $("#mollify-itemcontext-description"), hint: mollify.ui.texts.get('itemcontextDescriptionHint'), onedit: function(desc) { mollify.service.put("filesystem/"+item.id+"/description/", {description: desc}); }});
			}
			
			if (primaryActions) {
				var $pae = $e.find(".mollify-itemcontext-primary-action-button");
				$pae.each(function(i, $b){
					var a = primaryActions[i];
					if (a.type == 'submenu') {
						mollify.ui.controls.dropdown({
							element: $b,
							items: a.items,
							hideDelay: 0,
							style: 'submenu',
							parentPopupId: cApi.id,
							onItem: function() {
								cApi.hide();
							},
							onBlur: function(dd) {
								dd.hide();
							}
						});
					}
				});
				$pae.click(function(e) {
					var i = $pae.index($(this));
					var action = primaryActions[i];
					if (action.type == 'submenu') return;
					cApi.close();
					action.callback();
				});
			}
			
			if (plugins) {
				var $selectors = $("#mollify-itemcontext-details-selectors");
				var $content = $("#mollify-itemcontext-details-content");
				var contents = {};
				var onSelectDetails = function(id) {
					$(".mollify-itemcontext-details-selector").removeClass("active");
					$("#mollify-itemcontext-details-selector-"+id).addClass("active");
					$content.find(".mollify-itemcontext-plugin-content").hide();
					
					var $c = contents[id] ? contents[id] : false;
					if (!$c) {
						$c = $('<div class="mollify-itemcontext-plugin-content"></div>');
						plugins[id].details["on-render"](cApi, $c, ctx);
						contents[id] = $c;
						$content.append($c);
					}
											
					$c.show();
				};
				var firstPlugin = false;
				var selectorClick = function() {
					var s = $(this).tmplItem().data;
					onSelectDetails(s.id);
				};
				for (var id in plugins) {
					var plugin = plugins[id];
					if (!plugin.details) continue;
					
					if (!firstPlugin) firstPlugin = id;

					var title = plugin.details.title ? plugin.details.title : (plugin.details["title-key"] ? mollify.ui.texts.get(plugin.details["title-key"]) : id);
					var selector = mollify.dom.template("mollify-tmpl-main-itemcontext-details-selector", {id: id, title:title, data: plugin}).appendTo($selectors).click(selectorClick);
				}

				if (firstPlugin) onSelectDetails(firstPlugin);
			}
			
			mollify.ui.controls.dropdown({
				element: $e.find("#mollify-itemcontext-secondary-actions"),
				items: secondaryActions,
				hideDelay: 0,
				style: 'submenu',
				parentPopupId: cApi.id,
				onItem: function() {
					cApi.hide();
				},
				onBlur: function(dd) {
					dd.hide();
				}
			});
		}
		
		return {
			open : ict.open
		};
	};
	
	/**/
		
	mollify.ui.assign = function(h, id, c) {
		if (!h || !id || !c) return;
		if (!h.controls) h.controls = {};
		h.controls[id] = c;
	};
		
	mollify.ui.process = function($e, ids, handler) {
		$.each(ids, function(i, k) {
			if (mollify.ui.handlers[k]) mollify.ui.handlers[k]($e, handler);
		});
	};
				
	mollify.ui.handlers = {
		localize : function(p, h) {
			p.find(".localized").each(function() {
				var $t = $(this);
				var key = $t.attr('title-key');
				if (key) {
					$t.attr("title", mollify.ui.texts.get(key));
					$t.removeAttr('title-key');
				}
				
				key = $t.attr('text-key');
				if (key) {
					$t.prepend(mollify.ui.texts.get(key));
					$t.removeAttr('text-key');
				}
			});
			p.find("input.hintbox").each(function() {
				var $this = $(this);
				var hint = mollify.ui.texts.get($this.attr('hint-key'));
				$this.attr("placeholder", hint).removeAttr("hint-key");
			});//.placeholder();
		},
			
		center : function(p, h) {
			p.find(".center").each(function() {
				var $this = $(this);
				var x = ($this.parent().width() - $this.outerWidth(true)) / 2;
				$this.css({
					position: "relative",
					left: x
				});
			});
		},
		
		hover: function(p) {
			p.find(".hoverable").hover(function() {
				$(this).addClass("hover");
			}, function() {
				$(this).removeClass("hover");
			});
		},
		
		bubble: function(p, h) {
			p.find(".bubble-trigger").each(function() {
				var $t = $(this);
				var b = mollify.ui.controls.bubble({element:$t, handler: h});
				mollify.ui.assign(h, $t.attr('id'), b);
			});
		},
		
		radio: function(p, h) {
			p.find(".mollify-radio").each(function() {
				var $t = $(this);
				var r = mollify.ui.controls.radio($t, h);
				mollify.ui.assign(h, $t.attr('id'), r);
			});
		}
	};
		
	mollify.ui.window = {
		open : function(url) {
			window.open(url);
		}
	};
	
	mollify.ui.preloadImages = function(a) {
		$.each(a, function(){
			$('<img/>')[0].src = this;
		});
	};
	
	mollify.ui.FullErrorView = function(title, msg) {
		this.show = function() {
			this.init(mollify.App.getElement());
		};
		
		this.init = function($c) {
			if (mollify.App._initialized)
				mollify.dom.template("mollify-tmpl-fullpage-error", {title: title, message: msg}).appendTo($c.empty());
			else {
				var err = '<h1>'+title+'</h1><p>'+msg+'</p>';
				$c.html(err);
			}
		};
	};
	
	/* CONTROLS */
	
	var processPopupActions = function(l) {
		$.each(l, function(i, item){
			if (item.type == 'submenu') {
				processPopupActions(item.items);
				return;
			}
			if (item.title) return;
			if (item["title-key"]) item.title = mollify.ui.texts.get(item['title-key']);
		});
	};
	var createPopupItems = function(itemList) {
		var list = itemList||[];
		processPopupActions(list);
		return mollify.dom.template("mollify-tmpl-popupmenu", {items:list});
	};
	var initPopupItems = function($p, l, onItem) {
		$p.find(".dropdown-item").click(function() {
			var $e = $(this);
			var $top = $p.find(".dropdown-menu");
			var path = [];
			while (true) {
				if (!$e.hasClass("dropdown-menu"))
					path.push($e.index());
				$e = $e.parent();
				if ($e[0] == $top[0]) break;
			}
			var item = false;
			var parent = l;
			$.each(path.reverse(), function(i, ind) {
				item = parent[ind];
				if (item.type == 'submenu') parent = item.items;
			});
			if (onItem) onItem(item, item.callback ? item.callback() : null);
			else if (item.callback) item.callback();
			return false;
		});
	};
			
	mollify.ui.controls = {
		dropdown : function(a) {
			var $e = $(a.element);
			var $mnu = false;
			var popupId = false;
			var popupItems = a.items;
			//$e.addClass('dropdown');
			var hidePopup = function() {
				if (!$mnu) return;
				if (a.onHide) a.onHide();
				$mnu.parent().removeClass("open");
				mollify.ui.removeActivePopup(popupId);
			};
			var onItem = function(i, cbr) {
				hidePopup();
				if (a.onItem) a.onItem(i, cbr);
			};

			var api = {
				hide: hidePopup,
				items: function(items) {
					$mnu.remove();
					$mnu = createPopupItems(items);
					$e.removeClass("loading").append($mnu);
					initPopupItems($e, items, onItem);
					popupItems = items;
				}
			};
			if (a.parentPopupId) api.parentPopupId = a.parentPopupId;
			
			var $toggle = $e.find(".dropdown-toggle");
			if ($toggle.length != 1) return;
			
			$toggle.parent().append(createPopupItems(a.items));
			
			$toggle.dropdown({
				onshow: function($p) {
					if (!$mnu) $mnu = $($p.find(".dropdown-menu")[0]);
					if (!a.parentPopupId)
						popupId = mollify.ui.activePopup(api);
					if (!popupItems) $mnu.addClass("loading");
					if (a.onShow) a.onShow(api, popupItems);
				},
				onhide: function() {
					hidePopup();
					if (a.dynamic) popupItems = false;
				}
			});
			initPopupItems($e, a.items, onItem);
		},
		
		popupmenu : function(a) {
			var popupId = false;
			var $e = $(a.element);
			var pos = $e.offset();
			var $mnu = $('<div class="mollify-popupmenu" style="position: absolute; top: '+(pos.top + $e.outerHeight())+'px; left:'+pos.left+'px;"></div>');
			var popupitems = a.items;
			var hidePopup = function() {
				if (a.onHide) a.onHide();
				$mnu.remove();
				mollify.ui.removeActivePopup(popupId);
			};
			var onItem = function(i, cbr) {
				hidePopup();
				if (a.onItem) a.onItem(i, cbr);
			};
			
			if (!a.items) $mnu.addClass("loading");
			$mnu.append(createPopupItems(a.items).css("display", "block"));
			if (a.style) $mnu.addClass(a.style);
			mollify.App.getElement().append($mnu);//.on('click', hidePopup);
			
			var api = {
				hide: hidePopup,
				items: function(items) {
					$mnu.empty().removeClass("loading").append(createPopupItems(items).css("display", "block"));
					initPopupItems($mnu, items, onItem);
				}
			};
			if (a.items) initPopupItems($mnu, a.items, onItem);
			popupId = mollify.ui.activePopup(api);
			return api;
		},
		
		bubble: function(o) {
			var $e = o.element;
			var actionId = $e.attr('id');
			if (!actionId) return;
			
			var content = $("#" + actionId + '-bubble');
			if (!content || content.length === 0) return;

			var html = content.html();
			content.remove();

			var $tip = false;
			var rendered = false;
			var api = {
				hide: function() {
					$e.popover('hide');
				},
				close: this.hide
			};
			var $el = $('<div class="popover mollify-bubble-popover"><div class="arrow"></div><div class="popover-inner"><div class="popover-content"><p></p></div></div></div>');
			$e.popover({
				title: false,
				html: true,
				placement: 'bottom',
				trigger: 'manual',
				template: $el,
				content: html
			}).bind("shown", function(e) {
				$tip = $el;
				mollify.ui.activePopup(api);
				/*$tip.click(function(e) {
					e.preventDefault();
					return false;
				});*/
				if (!rendered) {
					if (o.handler && o.handler.onRenderBubble) o.handler.onRenderBubble(actionId, api);
					rendered = true;
				}
				if (o.handler && o.handler.onShowBubble) o.handler.onShowBubble(actionId, api);
			}).bind("hidden", function() {
				//$e.unbind("shown").unbind("hidden");
				mollify.ui.removeActivePopup(api.id);
			});
			$e.click(function(e){
				e.preventDefault();
				$e.popover('show');
				return false;
			});
		},

		dynamicBubble: function(o) {
			var $e = o.element;
			
			var bubbleHtml = function(c) {
				if (!c) return "";
				if (typeof(c) === 'string') return c;
				return $("<div/>").append(c).html();
			};
			var html = o.content ? bubbleHtml(o.content) : '<div class="loading"></div>';
			var $tip = false;
			var $cnt = o.container || $e.parent();
			var $vp = o.viewport || $cnt;
			var pos = function() {
				var $pop = $el.closest(".popover");
				var maxRight = $vp.outerWidth();
				var popLeft = $pop.offset().left - $cnt.offset().left;
				var popW = $pop.outerWidth();
				if (popLeft < 0)
					popLeft = 0;
				else if ((popLeft + popW) > maxRight)
					popLeft = maxRight - popW - 10;
				$pop.css("left", popLeft + "px");
				
				var arrowPos = ($e.offset().left - $cnt.offset().left) + ($e.outerWidth() / 2) - 10;
				arrowPos = Math.max(0, (arrowPos - popLeft));
				$pop.find(".arrow").css("left", arrowPos + "px");
			};
			var api = {
				show: function() {
					$e.popover('show');
				},
				hide: function(dontDestroy) {
					if (dontDestroy) $tip.hide();
					else $e.popover('destroy');
				},
				element : function() {
					return $tip;
				},
				getContent: function() {
					return $tip.find('.popover-content');	
				},
				content: function(c) {
					var $c = $tip.find('.popover-content');
					if (typeof(c) === 'string') $c.html(c);
					else $c.empty().append(c);
					pos();
				},
				position: pos
			};
			api.close = api.hide;
			var $el = $('<div class="popover mollify-bubble-popover"><div class="arrow"></div>' + (o.title ? '<h3 class="popover-title"></h3>' : '') + '<div class="popover-content"></div></div>');

			$e.popover({
				title: o.title ? o.title : false,
				html: true,
				placement: 'bottom',
				trigger: 'manual',
				template: $el,
				content: html,
				container: $cnt
			}).bind("shown", function(e) {
				$tip = $el;
				
				mollify.ui.activePopup(api);
				$tip.click(function(e) {
					e.stopPropagation();
				});
				if (o.title)
					$tip.find(".popover-title").append($('<button type="button" class="close">×</button>').click(function() { api.close(); }));
				mollify.ui.handlers.localize($tip);
				if (o.handler && o.handler.onRenderBubble) o.handler.onRenderBubble(api);
			}).bind("hidden", function() {
				$e.unbind("shown").unbind("hidden");
				mollify.ui.removeActivePopup(api.id);
			});
			$e.popover('show');
			
			return api;
		},
		
		table: function(id, o) {
			var $e = (typeof(id) == 'string') ? $("#"+id) : $(id);
			if ($e.length === 0 || !o.columns) return false;
			
			if ($e.hasClass("mollify-table")) {
				//already initialized, create new element
				var $n = $("<table></table>").insertAfter($e).attr("id", $e.attr("id"));
				$e.remove();
				$e = $n;
			}

			var selectionChangedCb = $.Callbacks();
			$e.addClass("mollify-table");
			if (o.id) $e.addClass("mollify-table-" + o.id);
			if (o.onSelectionChanged) selectionChangedCb.add(o.onSelectionChanged);
			$e.addClass("table");
			if (o.narrow) $e.addClass("table-condensed");
			if (o.hilight) $e.addClass("hilight");
			var dataInfo = false;
			var $pagingControls = false;
			var perPageMax = (o.remote && o.remote.paging ? o.remote.paging.max || 50 : 50);
			
			var refreshPagingControls = function() {
				var $p = $pagingControls.find("ul").empty();				
				var pages = dataInfo ? Math.ceil(dataInfo.total / perPageMax) : 0;
				if (pages < 2) return;
				
				var current = dataInfo ? (Math.floor(dataInfo.start / perPageMax) + 1) : 0;
				var mid = current + Math.floor((pages-current) / 2);
				var getNrBtn = function(nr) {
					return $('<li class="page-btn page-nr'+((current == nr) ? ' active' : '')+'"><a href="javascript:void(0);">'+nr+'</a></li>');
				};
				
				$p.append($('<li class="page-btn page-prev'+((current <= 1) ? ' disabled' : '')+'"><a href="javascript:void(0);">&laquo;</a></li>'));
				if (pages <= 10) {
					for (var i=1; i<=pages; i++) {
						$p.append(getNrBtn(i));
					}
				} else {
					if (current != 1) $p.append(getNrBtn(1));
					if (current > 2) $p.append(getNrBtn(2));					
					if (current > 3) $p.append("<li class='page-break'>...</li>");

					if (current > 4) $p.append(getNrBtn(current-2));					
					if (current > 3) $p.append(getNrBtn(current-1));
					$p.append(getNrBtn(current));
					if (current < (pages-2)) $p.append(getNrBtn(current+1));
					if (current < (pages-1)) $p.append(getNrBtn(current+2));
					
					/*if (current > 4 && current < (pages-3)) {
						$p.append("<li class='page-break'>...</li>");
						$p.append(getNrBtn(mid-1));
						$p.append(getNrBtn(mid));
						$p.append(getNrBtn(mid+1));
					}*/
					
					if (current < (pages-2)) $p.append("<li class='page-break'>...</li>");					
					if (current < (pages-1)) $p.append(getNrBtn(pages-1));
					if (current != pages) $p.append(getNrBtn(pages));
				}
				$p.append($('<li class="page-btn page-next'+((current >= pages) ? ' disabled' : '')+'"><a href="javascript:void(0);">&raquo;</a></li>'));
			};
			if (o.remote && o.remote.paging) {
				var $ctrl = o.remote.paging.controls || $("<div class='mollify-table-pager'></div>").insertAfter($e);
				$pagingControls = $('<div class="pagination"><ul></ul></div>').appendTo($ctrl);
				$ctrl.delegate(".page-btn > a", "click", function(e) {
					if (!dataInfo) return;
					
					var $t = $(this);
					var $p = $t.parent();
					if ($p.hasClass("disabled")) return;
					
					var page = Math.floor(dataInfo.start / perPageMax) + 1;
					var pages = Math.ceil(dataInfo.total / perPageMax);
					if ($p.hasClass("page-next")) page++;
					else if ($p.hasClass("page-prev")) page--;
					else {
						page = parseInt($t.text(), 10);
					}
					if (page < 1 || page > pages) return;
					dataInfo.start = (page-1) * perPageMax;
					api.refresh();
				});
				refreshPagingControls();
			}
			
			var findRow = function(item) {
				var found = false;
				$l.find("tr").each(function() {
					var $row = $(this);
					var rowItem = $row[0].data;
					if (item == rowItem) {
						found = $row;
						return false;
					}
				});
				return found;
			};
			var getSelectedRows = function() {
				var sel = [];
				$e.find(".mollify-tableselect:checked").each(function(i, e){
					var item = $(e).parent().parent()[0].data;
					sel.push(item);
				});
				return sel;
			};
			var setRowSelected = function(item, sel) {
				var $row = findRow(item);
				$row.find(".mollify-tableselect").prop("checked", sel);
				selectionChangedCb.fire();
			};
			var updateSelectHeader = function() {
				var count = $l.children().length;
				var all = (count > 0 && getSelectedRows().length == count);
				if (all)
					$e.find(".mollify-tableselect-header").prop("checked", true);
				else
					$e.find(".mollify-tableselect-header").prop("checked", false);
			};
			selectionChangedCb.add(updateSelectHeader);
			var selectAll = function(s) {
				$e.find(".mollify-tableselect").prop("checked", s);
			};
			var $h = $("<tr></tr>").appendTo($("<thead></thead>").appendTo($e));
			var firstSortable = false;
			var thClick = function(e) {
				var count = $l.children().length;
				var all = (count > 0 && getSelectedRows().length == count);
				selectAll(!all);
				selectionChangedCb.fire();
			};
			for (var i=0,j=o.columns.length; i<j; i++) {
				var $th;
				var col = o.columns[i];
				if (col.type == 'selectrow') {
					$th = $('<input class="mollify-tableselect-header" type="checkbox"></input>').click(thClick);
				} else {
					$th = $("<th>"+(col.type == 'action' ? "" : (col.title ? col.title : ""))+"</th>");
					$th[0].colId = col.id;
					if (col.sortable) {
						$th.append("<span class='mollify-tableheader-sort'></span>").addClass("sortable");
						if (!firstSortable) firstSortable = col.id;
					}
				}

				if (col.id) $th.addClass("col-"+col.id);
				$th.appendTo($h);
			}			
			var sortKey = false;
			if (firstSortable) sortKey = { id: firstSortable, asc: true };
			if (o.defaultSort) sortKey = o.defaultSort;
			var updateSort = function() {
				$e.find("th.sortable > .mollify-tableheader-sort").empty();
				if (!sortKey) return;
				var $col = $("th.col-"+sortKey.id+" > .mollify-tableheader-sort");
				$col.html("<i class='"+(sortKey.asc ? "icon-caret-up" : "icon-caret-down")+ "'></i>");
			};
			$e.delegate("th.sortable", "click", function(e) {
				var $t = $(this);

				var id = $t[0].colId;
				if (sortKey && sortKey.id == id) {
					sortKey.asc = !sortKey.asc;
				} else {
					sortKey = { id: id, asc: true };
				}
				updateSort();
				api.refresh();
			});
			updateSort();

			var $l = $("<tbody></tbody>").appendTo($e);
			var $eh = false;
			if (o.emptyHint) $eh = $("<tr class='mollify-table-empty-hint'><td colspan='"+o.columns.length+"'>"+o.emptyHint+"</td></tr>");
			$e.delegate(".mollify-tableselect", "change", function(e) { selectionChangedCb.fire(); return false; });
			$e.delegate("a.mollify-tableaction", "click", function(e) {
				var $cell = $(this).parent();
				var $row = $cell.parent();
				var colId = $cell[0].colId;
				var item = $row[0].data;
				
				e.stopPropagation();
				if (o.onRowAction) o.onRowAction(colId, item);
				return false;
			});
			if (o.hilight) {
				$e.delegate("tr", "click", function(e) {
					if (e.target && $(e.target).hasClass("mollify-tableselect")) return;

					var $t = $(this);
					var item = $t[0].data;
					if (!item) return;
					if ($t.hasClass("info")) {
						$t.removeClass("info");
						$t.find(".mollify-tableselect").prop("checked", false);
						item = null;
					} else {
						$e.find("tr").removeClass("info");
						selectAll(false);
						$t.find(".mollify-tableselect").prop("checked", true);
						$t.addClass("info");
					}
					selectionChangedCb.fire();
					if (o.onHilight) o.onHilight(item);
				});
			}
			
			var setCellValue = function($cell, col, item) {
				$cell[0].colId = col.id;
				var v = item[col.id];
				if (col.cellClass) $cell.addClass(col.cellClass);
				if (col.type == 'selectrow') {
					var $sel = $('<input class="mollify-tableselect" type="checkbox"></input>').appendTo($cell.empty());
				} else if (col.type == 'action') {
					var html = col.content;
					if (col.formatter) html = col.formatter(item, v);
					if (html) $("<a class='mollify-tableaction' title='"+col.title+"'></a>").html(html).appendTo($cell.empty());
				} else if (col.type == "input") {
					var $s = $cell[0].ctrl;
					if (!$s) {
						$s = $('<input type="text"></input>').appendTo($cell).change(function() {
							var v = $s.val();
							$cell[0].ctrlVal = v;
							if (o.selectOnEdit) setRowSelected(item, true);
							if (col.onChange) col.onChange(item, v);
						});
						$cell[0].ctrl = $s;
					}
					var sv = v;
					if (col.valueMapper) sv = col.valueMapper(item, v);
					$s.val(sv);
				} else if (col.type == "select") {					
					var $sl = $cell[0].ctrl;
					if (!$sl) {
						var selOptions = [];
						if (typeof(col.options) == "function") selOptions = col.options(item);
						else if (window.isArray(col.options)) selOptions = col.options;
						
						var noneOption;
						if (col.none) {
							if (typeof(col.none) == "function") noneOption = col.none(item);
							else noneOption = col.none;
						}
						
						var formatter;
						if (col.formatter) {
							formatter = function(sv) {
								return col.formatter(item, sv);
							};
						}

						$sl = mollify.ui.controls.select($("<select></select>").appendTo($cell), {
							values: selOptions,
							title : col.title,
							none: noneOption,
							formatter: formatter,
							onChange: function(v) {
								$cell[0].ctrlVal = v;
								if (o.selectOnEdit) setRowSelected(item, true);
								if (col.onChange) col.onChange(item, v);
							}
						});
						$cell[0].ctrl = $sl;
					} else {}
					var sv2 = v;
					if (col.valueMapper) sv2 = col.valueMapper(item, v);
					$sl.select(sv2);
				} else if (col.type == 'static') {
					$cell.html(col.content || '');
				} else {
					if (col.renderer) col.renderer(item, v, $cell);
					else if (col.valueMapper) $cell.html(col.valueMapper(item, v));
					else if (col.formatter) {
						if (typeof(col.formatter) === 'function') $cell.html(col.formatter(item, v));
						else $cell.html(col.formatter.format(v));
					}
					else $cell.html(v);
				}
			};
			var addItem = function(item) {
				if ($eh) $eh.detach();
				var $row = $("<tr></tr>").appendTo($l);
				$row[0].data = item;
				if (o.onRow) o.onRow($row, item);
				
				for (var i=0,j=o.columns.length; i<j; i++) {
					var $cell = $("<td></td>").appendTo($row);
					setCellValue($cell, o.columns[i], item);
				}
			};
			var updateRow = function($row) {
				$row.find("td").each(function() {
					var $cell = $(this);
					var index = $cell.index();
					setCellValue($cell, o.columns[index], $row[0].data);
				});
			};
			var updateHint = function() {
				if (!$eh) return;
				var count = $l.find("tr").length;
				if (count === 0) $eh.appendTo($l);
				else $eh.hide();
			};
			
			var api = {
				findByKey : function(k) {
					if (!o.key) return false;
					var found = false;
					$l.find("tr").each(function() {
						var item = $(this)[0].data;
						if (item[o.key] == k) {
							found = item;
							return false;
						}
					});
					return found;
				},
				onSelectionChanged : function(cb) {
					selectionChangedCb.add(cb);
				},
				getSelected : function() {
					return getSelectedRows();
				},
				getValues : function() {
					var values = {};
					$l.find("td").each(function() {
						var $cell = $(this);
						var ctrlVal = $cell[0].ctrlVal;
						if (!ctrlVal) return;
						
						var $row = $cell.parent();
						var item = $row[0].data;
						var key = item[o.key];
						if (!values[key]) values[key] = {};
						values[key][$cell[0].colId] = ctrlVal;
					});
					return values;	
				},
				set : function(items) {
					if ($eh) $eh.detach();
					$l.empty();
					$.each(items, function(i, item) { addItem(item); });
					updateHint();
					selectionChangedCb.fire();
				},
				add : function(item) {
					if (!item) return;
					
					if (window.isArray(item)) {
						for (var i=0,j=item.length; i<j; i++) addItem(item[i]);
					} else {
						addItem(item);
					}
					updateHint();
				},
				update : function(item) {
					if (!item) return;
					var $row = findRow(item);
					if (!$row) return;
					updateRow($row);
				},
				remove : function(item) {
					if (!item) return;
					var $row = findRow(item);
					if (!$row) return;
					$row.remove();
					updateHint();
				},
				refresh: function() {
					var df = $.Deferred();
					if (!o.remote || !o.remote.path) return df.resolve();
					var queryParams = { count: perPageMax, start: dataInfo ? dataInfo.start : 0, sort: sortKey };
					if (o.remote.queryParams) {
						var p = o.remote.queryParams(dataInfo);
						if (p) queryParams = $.extend(queryParams, p);
					}
					var pr = mollify.service.post(o.remote.path, queryParams).done(function(r) {
						if (o.remote.paging) {
							dataInfo = { start: r.start, count: r.count, total: r.total };
							refreshPagingControls();
						} else dataInfo = false;
						if (o.remote.onData) o.remote.onData(r);
						api.set(r.data);
						df.resolve();
					}).fail(df.reject);
					if (o.remote.onLoad) o.remote.onLoad(pr);
					return df;
				}
			};
			return api;
		},
		
		select: function(e, o) {				
			var $e = (typeof(e) === "string") ? $("#"+e) : e;
			if (!$e || $e.length === 0) return false;
			$e.empty();

			var addItem = function(item) {
				var $row = $("<option></option>").appendTo($e);
				if (item == o.none) {
					$row.html(item);
				} else {
					if (o.renderer) o.renderer(item, $row);
					else {
						var c = "";
						if (o.formatter)
							c = o.formatter(item);
						else if (o.title)
							c = item[o.title];
						else if (typeof(item) === "string")
							c = item;
						$row.html(c);
					}
				}
				$row[0].data = item;
			};
			
			var getSelected = function() {
				var s = $e.find('option:selected');
				if (!s || s.length === 0) return null;
				var item = s[0].data;
				if (item == o.none) return null;
				return item;
			}
			
			if (o.onChange) {
				$e.change(function() {
					o.onChange(getSelected());
				});
			}
			
			var api = {
				add : function(item) {
					if (!item) return;
					
					if (window.isArray(item)) {
						for (var i=0,j=item.length; i<j; i++) addItem(item[i]);
					} else {
						addItem(item);
					}	
				},
				select : function(item) {
					var $c = $e.find("option");
					
					if (item !== undefined && typeof(item) === 'number') {
						if ($c.length >= item) return;
						$($c[item]).prop("selected", true);
						return;	
					}
					
					var find = item;
					if (o.none && !find) find = o.none;
					
					for (var i=0,j=$c.length; i<j; i++) {
						if ($c[i].data == find || $c[i].text == find) {
							$($c[i]).prop("selected", true);
							return;
						}
					}
				},
				get : getSelected,
				set : this.select,
				selected : getSelected
			};
			if (o.none) api.add(o.none);
			if (o.values) {
				api.add(o.values);
				if (o.value) api.select(o.value);
			}
			return api;
		},
		
		radio: function(e, h) {
			var rid = e.addClass("btn-group").attr('id');
			var items = e.find("button");
			
			var select = function(item) {
				items.removeClass("active");
				item.addClass("active");
			}
			
			items.click(function() {
				var i = $(this);
				var ind = items.index(i);
				select(i);
				
				var id = i.attr('id');
				if (h && rid && h.onRadioChanged) h.onRadioChanged(rid, id, ind);
			});
			
			return {
				set: function(ind) {
					select($(items[ind]));
				}
			};
		},
		
		datepicker: function(e, o) {
			if (!e) return false;
			if (!o) o = {};
			var $e = (typeof(e) === "string") ? $("#"+e) : e;
			if (!$.fn.datetimepicker.dates.mollify) {
				$.fn.datetimepicker.dates.mollify = {
					days: mollify.ui.texts.get('days'),
					daysShort: mollify.ui.texts.get('daysShort'),
					daysMin: mollify.ui.texts.get('daysMin'),
					months: mollify.ui.texts.get('months'),
					monthsShort: mollify.ui.texts.get('monthsShort'),
					today: mollify.ui.texts.get('today'),
					weekStart: mollify.ui.texts.get('weekStart')
				};
			}
			var val = o.value || null;
			var fmt = o.format || mollify.ui.texts.get('shortDateTimeFormat');
			fmt = fmt.replace(/\b[h]\b/, "hh");
			fmt = fmt.replace(/\b[M]\b/, "MM");
			fmt = fmt.replace(/\b[d]\b/, "dd");
			fmt = fmt.replace("tt", "PP");
			var $dp = $e.datetimepicker({
				format: fmt,
				language: "mollify",
				pickTime: o.time || true,
				pickSeconds: (fmt.indexOf('s') >= 0)
			}).on("changeDate", function(ev) {
				val = ev.date;
			});
			
			var picker = $dp.data('datetimepicker');
			if (val) picker.setDate(val);
			
			var api = {
				get: function() {
					if (val)
						return new Date(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate(), val.getUTCHours(), val.getUTCMinutes(), val.getUTCSeconds());
					return val;
				},
				set: function(d) {
					val = (d != null ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds())) : null);
					picker.setDate(val);
				}
			};
			$dp.data("mollify-datepicker", api);
			return api;
		},
		
		editableLabel: function(o) {
			var $e = $(o.element);
			var id = $e.attr('id');
			var originalValue = o.value || $e.html().trim();
			if (!id) return;
			
			$e.addClass("editable-label").hover(function() {
				$e.addClass("hover");
			}, function() {
				$e.removeClass("hover");
			});
			
			var $label = $("<label></label>").appendTo($e.empty());
			var $editor = $("<input></input>").appendTo($e);
			var ctrl = {
				value: function(v) {
					originalValue = v;
					if (originalValue || !o.hint) {
						$e.removeClass("hint");
						$label.html(originalValue);
					} else {
						$e.addClass("hint");
						$label.html(o.hint);
					}
					$editor.val(originalValue);	
				}
			};
			ctrl.value(originalValue);
			
			var onFinish = function() {
				var v = $editor.val();
				if (o.isvalid && !o.isvalid(v)) return;
				
				$editor.hide();
				$label.show();
				if (originalValue != v) {
					if (o.onedit) o.onedit(v);
					ctrl.value(v);
				}
			};
			var onCancel = function() {
				$editor.hide();
				$label.show();
				ctrl.value(originalValue);
			};

			$editor.hide().bind("blur", onFinish).keyup(function(e) {
				if (e.which == 13) onFinish();
				else if (e.which == 27) onCancel();
			});
			
			$label.bind("click", function() {
				$label.hide();
				$editor.show().focus();
			});
			
			return ctrl;
		},
		
		slidePanel : function($e, o) {
			if (!$e) return;
			var $p = mollify.dom.template("mollify-tmpl-slidepanel").appendTo($e);
			if (o.relative) $p.addClass("relative");
			var $content = $p.find(".mollify-slidepanel-content");
			if (o.resizable) {
				$p.resizable({
					handles: "n"
				}).bind("resize", function (e, ui) {
					$(this).css("top", "auto");
				});
			}
			
			var api = {
				getContentElement : function() { return $content; },
				show: function($c, h) {
					if ($c) $content.empty().append($c);
					$content.parent().scrollTop(0);
					$p.animate({
						"height" : h+"px"
					}, 500);
				},
				hide: function() {
					$p.animate({"height": "0px"}, 500);
				},
				remove: function() { $p.remove(); }
			};
			$p.find(".close").click(api.hide);
			return api;
		},
		
		tooltip: function($c, o) {
			if (!$c) return;
			
			$c.tooltip($.extend({}, {
				placement: "bottom",
				title: "",
				trigger: "hover"
			}, o));

		}
	};
	
	/* DIALOGS */
	
	mollify.ui.dialogs = {};
	var dh = mollify.ui.dialogs;
			
	dh._dialogDefaults = {
		title: "Mollify"
	};
	
	dh.closeActiveDialog = function() {
		if (!dh._activeDialog) return;
		dh._activeDialog.close();
	};
			
	dh.info = function(spec) {
		dh.custom({
			title: spec.title,
			content: $("#mollify-tmpl-dialog-info").tmpl({message: spec.message}),
			buttons: [
				{ id: "ok", "title-key": "ok", cls:"btn-primary" }
			],
			"on-button": function(btn, d) {
				d.close();
				if (spec.callback) spec.callback();
			}
		});
		/*var dlg = $("#mollify-tmpl-dialog-info").tmpl($.extend(spec, dialogDefaults)).dialog({
			modal: true,
			resizable: false,
			height: 'auto',
			minHeight: 50
		});
		mollify.ui.handlers.localize(dlg);
		dlg.find("#mollify-info-dialog-close-button").click(function() { dlg.dialog('destroy'); dlg.remove(); });*/
	};
	
	dh.showActionDeniedMessage = function(title, reasons) {
		//TODO template
		var msg = '<p>'+title+'</p><p><ul>';
		for (var i=0,j=reasons.length;i<j;i++) {
			msg = msg + "<li>" + reasons[i] + "</li>";
		}
		msg = msg + "</ul></p>";
		mollify.ui.dialogs.error({
			title: mollify.ui.texts.get('errorDialogTitle'),
			message: msg
		});
	}
	
	dh.confirmActionAccept = function(title, reasons, confirmCb, cancelCb) {
		//TODO template
		var msg = '<p>'+title+'</p><p><ul>';
		for (var i=0,j=reasons.length;i<j;i++) {
			msg = msg + "<li>" + reasons[i] + "</li>";
		}
		msg = msg + "</ul></p>";
		dh.custom({
			title: mollify.ui.texts.get('errorDialogTitle'),
			content: msg,
			buttons: [
				{ id: "yes", "title-key": "yes", cls:"btn-primary" },
				{ id: "no", "title-key": "no" }
			],
			"on-button": function(btn, d) {
				d.close();
				if (btn.id === 'yes') if (confirmCb) confirmCb();
				else if (cancelCb) cancelCb();
			}
		});
	}
	
	dh.showError = function(error) {
		var msg = 'errorDialogMessage_'+error.code;
		if (!mollify.ui.texts.has(msg)) msg = 'errorDialogUnknownError';
		if (mollify.session.user && mollify.session.user.admin && error.trace) {
			dh.custom({
				title: mollify.ui.texts.get('errorDialogTitle'),
				content: $("#mollify-tmpl-dialog-error-debug").tmpl({
					title: mollify.ui.texts.get('errorDialogTitle'),
					message: mollify.ui.texts.get(msg),
					debug: error.trace.join("<br/>")}
				),
				buttons: [
					{ id: "ok", "title-key": "ok", cls:"btn-primary" }
				],
				"on-button": function(btn, d) {
					d.close();
				}
			});
		} else {
			mollify.ui.dialogs.error({
				title: mollify.ui.texts.get('errorDialogTitle'),
				message: mollify.ui.texts.get(msg)
			});
		}
	};
	
	dh.select = function(spec) {
		var table = false;
		dh.custom({
			title: spec.title,
			initSize: spec.initSize,
			content: $("#mollify-tmpl-dialog-select").tmpl({message: spec.message}),
			buttons: [
				{ id: "ok", "title-key": "ok", cls:"btn-primary" },
				{ id: "cancel", "title-key": "dialogCancel" }
			],
			"on-button": function(btn, d) {
				var sel;
				if (btn.id == "ok") {
					sel = table.getSelected();
					if (!sel || sel.length === 0) return;
				}
				d.close();
				if (btn.id == "ok" && spec.onSelect) {
					spec.onSelect(sel, table.getValues());
				}
			},
			"on-show": function(h, $dlg) {
				var $table = $($dlg.find(".mollify-selectdialog-table")[0]);
				table = mollify.ui.controls.table($table, {
					key: spec.key,
					selectOnEdit: true,
					columns: [{ type:"selectrow" }].concat(spec.columns)
				});
				table.set(spec.list);
			}
		});
	};

	dh.error = function(spec) {
		dh.custom({
			title: spec.title,
			content: $("#mollify-tmpl-dialog-error").tmpl({message: spec.message}),
			buttons: [
				{ id: "ok", "title-key": "ok", cls:"btn-primary" }
			],
			"on-button": function(btn, d) {
				d.close();
				if (spec.callback) spec.callback();
			}
		});
	};
	
	dh.confirmation = function(spec) {
		dh.custom({
			title: spec.title,
			content: spec.message,
			buttons: [
				{ id: "yes", "title-key": "yes" },
				{ id: "no", "title-key": "no" }
			],
			"on-button": function(btn, d) {
				d.close();
				if (spec.callback && btn.id === 'yes') spec.callback();
			}
		});
	};
	
	dh.input = function(spec) {
		var $input = false;
		dh.custom({
			title: spec.title,
			content: $("#mollify-tmpl-dialog-input").tmpl({message: spec.message}),
			buttons: [
				{ id: "yes", "title": spec.yesTitle, cls:"btn-primary" },
				{ id: "no", "title": spec.noTitle }
			],
			"on-button": function(btn, d) {
				if (btn.id === 'yes') {
					if (!spec.handler || !spec.handler.isAcceptable) return;
					if (!spec.handler.isAcceptable($input.val())) return;
				}
				d.close();
				if (btn.id === 'yes') spec.handler.onInput($input.val());
			},
			"on-show": function(h, $dlg) {
				$input = $dlg.find(".mollify-inputdialog-input");
				if (spec.defaultValue) $input.val(spec.defaultValue);
				$input.focus();
			}
		});
	};
	
	dh.wait = function(spec) {
		var $trg = (spec && spec.target) ? $("#"+spec.target) : $("body");
		var w = mollify.dom.template("mollify-tmpl-wait", $.extend(spec, dh._dialogDefaults)).appendTo($trg).show();
		return {
			close: function() {
				w.remove();
			}
		};
	};
	
	dh.notification = function(spec) {
		if (mollify.App.activeView && mollify.App.activeView.onNotification && mollify.App.activeView.onNotification(spec)) return;
		
		var $trg = (spec && spec.target) ? ((typeof spec.target === 'string') ? $("#"+spec.target) : spec.target) : $("#mollify-notification-container");
		if ($trg.length === 0) $trg = $("body");
		var notification = mollify.dom.template("mollify-tmpl-notification", $.extend(spec, dh._dialogDefaults)).hide().appendTo($trg).fadeIn(300);
		setTimeout(function() {
			notification.fadeOut(300);
			if (spec["on-finish"]) spec["on-finish"]();
		}, spec.time | 3000);
	};
	
	dh.custom = function(spec) {
		var center = function($d) {
			$d.css("margin-left", -$d.outerWidth()/2);
			$d.css("margin-top", -$d.outerHeight()/2);
			$d.css("top", "50%");
			$d.css("left", "50%");
		};
		var s = spec;
		if (s['title-key']) s.title = mollify.ui.texts.get(s['title-key']);
		
		var $dlg = $("#mollify-tmpl-dialog-custom").tmpl($.extend(dh._dialogDefaults, s), {
			getContent: function() {
				if (spec.html) return spec.html;
				if (spec.content) {
					var c = spec.content;
					if (typeof c === 'string') return c;
					return $("<div/>").append(c.clone()).html();
				}
				return "";
			},
			getButtonTitle: function(b) {
				if (b.title) return b.title;
				if (b["title-key"]) return mollify.ui.texts.get(b["title-key"]);
				return "";
			}
		});
		if (spec.element) $dlg.find(".modal-body").append(spec.element);
		
		mollify.ui.handlers.localize($dlg);
		$dlg.on('hidden', function(e) {
			if (e.target != $dlg[0]) return;
			$dlg.remove();
		}).modal({
			backdrop: 'static', //!!spec.backdrop,
			show: true,
			keyboard: true
		});
		var h = {
			close: function() {
				$dlg.modal('hide');
				dh._activeDialog = false;
			},
			center: function() {
				center($dlg);
			},
			setInfo : function(n) {
				var $n = $dlg.find(".modal-footer > .info").empty();
				if (n) $n.html(n);
			}
		};
		$dlg.find(".modal-footer .btn").click(function(e) {
			e.preventDefault();
			var ind = $dlg.find(".modal-footer .btn").index($(this));
			var btn = spec.buttons[ind];
			if (spec["on-button"]) spec["on-button"](btn, h);
		});
		if (spec.resizable) {
			var $header = $dlg.find(".modal-header");
			var $body = $dlg.find(".modal-body");
			var $footer = $dlg.find(".modal-footer");
			var magicNr = 30;//$body.css("padding-top") + $body.css("padding-bottom");	//TODO??
			
			$body.css({
				"max-height": "none",
				"max-width": "none"
			});
			
			var onResize = function() {
				center($dlg);
				var h = $dlg.innerHeight() - $header.outerHeight() - $footer.outerHeight() - magicNr;
				$body.css("height", h);
			}
			
			$dlg.css({
				"max-height": "none",
				"max-width": "none",
				"min-height": $dlg.outerHeight()+"px",
				"min-width": $dlg.outerWidth()+"px"
			}).on("resize", onResize).resizable();
			if (spec.initSize) {
				$dlg.css({
					"width": spec.initSize[0]+"px",
					"height": spec.initSize[1]+"px"
				});
			}
			onResize();
		}
		if (spec["on-show"]) spec["on-show"](h, $dlg);
		dh._activeDialog = h;
		return h;
	};
	
	dh.folderSelector = function(spec) {
		return dh.itemSelector($.extend({ allowFiles: false }, spec));
	};
	
	dh.itemSelector = function(s) {
		var spec = $.extend({ allowFiles: true, allowFolders: true }, s);
		var selectedItem = false;
		var content = $("#mollify-tmpl-dialog-itemselector").tmpl({message: spec.message});
		var $selector = false;
		var loaded = {};
		
		var load = function($e, parent) {
			if (loaded[parent ? parent.id : "root"]) return;
			
			$selector.addClass("loading");
			mollify.filesystem.items(parent, spec.allowFiles).done(function(r) {
				$selector.removeClass("loading");
				loaded[parent ? parent.id : "root"] = true;
				
				var all = r.files ? (r.folders.concat(r.files)) : r.folders;
				
				if (!all || all.length === 0) {
					if ($e) $e.find(".mollify-itemselector-folder-indicator").empty();
					return;
				}
				
				var level = 0;
				var levels = [];
				if (parent) {
					var matches = parent.path.match(/\//g);
					if (matches) level = matches.length + 1;
					else level = 1;
					
					//generate array for template to iterate
					for(var i=0;i<level;i++) levels.push({});
				}
				var c = $("#mollify-tmpl-dialog-itemselector-item").tmpl(all, {cls:(level === 0 ? 'root' : ''), levels: levels});
				if ($e) {
					$e.after(c);
					$e.addClass("loaded");
					if ($e) $e.find(".mollify-itemselector-folder-indicator").find("i").removeClass("icon-caret-right").addClass("icon-caret-down");
				} else {
					$selector.append(c);
				}
				if (!parent && all.length == 1) {
					load($(c[0]), all[0]);
				}
			});
		};
		
		dh.custom({
			title: spec.title,
			content: content,
			buttons: [
				{ id: "action", "title": spec.actionTitle, cls:"btn-primary" },
				{ id: "cancel", "title-key": "dialogCancel" }
			],
			"on-button": function(btn, d) {
				if (btn.id === 'action') {
					if (!selectedItem || !spec.handler || !spec.handler.canSelect(selectedItem)) return;	
				}
				d.close();
				if (btn.id === 'action') spec.handler.onSelect(selectedItem);
				
			},
			"on-show": function(h, $dlg) {
				$selector = $dlg.find(".mollify-itemselector-tree");
				$selector.on("click", ".mollify-itemselector-folder-indicator", function(e) {
					var $e = $(this).parent();
					var p = $e.tmplItem().data;
					load($e, p);
					return false;
				});
				$selector.on("click", ".mollify-itemselector-item", function(e) {
					var $e = $(this);
					var p = $(this).tmplItem().data;
					if (p.is_file && !spec.allowFiles) return;
					if (!p.is_file && !spec.allowFolders) return;
					
					if (spec.handler.canSelect(p)) {
						selectedItem = p;
						$(".mollify-itemselector-item").removeClass("selected");
						$e.addClass("selected");
					}
				});
				load(null, null);
			}
		});
	};

	dh.tableView = function(o) {
		mollify.ui.dialogs.custom({
			resizable: true,
			initSize: [600, 400],
			title: o.title,
			content: mollify.dom.template("mollify-tmpl-tableview"),
			buttons: o.buttons,
			"on-button": function(btn, d) {
				o.onButton(btn, d);
			},
			"on-show": function(h, $d) {
				var $content = $d.find("#mollify-tableview-content");

				h.center();
				var table = mollify.ui.controls.table("mollify-tableview-list", {
					key: o.table.key,
					columns: o.table.columns,
					onRowAction: function(id, obj) {
						if (o.onTableRowAction) o.onTableRowAction(h, table, id, obj);
					}
				});

				o.onRender(h, $content, table);
			}
		});
	};
	
	/* DRAG&DROP */
	
	mollify.MollifyHTML5DragAndDrop = function() {
		var t = this;
		t.dragObj = false;
		t.dragEl = false;
		t.dragListener = false;
		
		var endDrag = function(e) {
			if (t.dragEl) {
				t.dragEl.removeClass("dragged");
				if (t.dragListener && t.dragListener.onDragEnd) t.dragListener.onDragEnd(t.dragEl, e);
				t.dragEl = false;
			}
			t.dragObj = false;
			t.dragListener = false;
		};
		
		$("body").bind('dragover', function(e) {
			if (e.preventDefault) e.preventDefault();
			e.originalEvent.dataTransfer.dropEffect = "none";
			return false;
		});

		// preload drag images		
		setTimeout(function(){
			var dragImages = [];
			for (var key in mollify.settings.dnd.dragimages) {
				if (!mollify.settings.dnd.dragimages.hasOwnProperty(key)) continue;
				var img = mollify.settings.dnd.dragimages[key];
				if (!img) continue;
				if (dragImages.indexOf(img) >= 0) continue;
				dragImages.push(img);
			}
			if (dragImages) mollify.ui.preloadImages(dragImages);
		}, 0);
		
		var api = {
			enableDragToDesktop: function(item, e) {
				if (!item) return;
				var info = mollify.getItemDownloadInfo(item);
				if (info) e.originalEvent.dataTransfer.setData('DownloadURL',['application/octet-stream', info.name, info.url].join(':'));
			},
				
			enableDrag : function($e, l) {
				$e.attr("draggable","true").bind('dragstart', function(e) {
					t.dragObj = false;
					e.originalEvent.dataTransfer.effectAllowed = "none";
					if (!l.onDragStart) return false;
					
					t.dragObj = l.onDragStart($(this), e);
					if (!t.dragObj) return false;
					
					var dragImageType = t.dragObj.type;
					
					if (t.dragObj.type == 'filesystemitem') {
						var pl = t.dragObj.payload;
						if (!window.isArray(pl) || pl.length == 1) {
							var item = window.isArray(pl) ? pl[0] : pl;
							
							if (!item.is_file) dragImageType = "filesystemitem-folder";
							else dragImageType = "filesystemitem-file";
						} else {
							dragImageType = "filesystemitem-many";
						}
						api.enableDragToDesktop(pl, e);
					}
					t.dragEl = $(this);
					t.dragListener = l;
					t.dragEl.addClass("dragged");
					e.originalEvent.dataTransfer.effectAllowed = "copyMove";

					if (mollify.settings.dnd.dragimages[dragImageType]) {
						var img = document.createElement("img");
						img.src = mollify.settings.dnd.dragimages[dragImageType];
						e.originalEvent.dataTransfer.setDragImage(img, 0, 0);
					}
					return;
				}).bind('dragend', function(e) {
					endDrag(e);
				});
			},
			enableDrop : function($e, l) {
				$e.addClass("droppable").bind('drop', function(e) {
					if (e.stopPropagation) e.stopPropagation();
					if (!l.canDrop || !l.onDrop || !t.dragObj) return;
					var $t = $(this);
					if (l.canDrop($t, e, t.dragObj)) {
						l.onDrop($t, e, t.dragObj);
						$t.removeClass("dragover");
					}
					endDrag(e);
				}).bind('dragenter', function(e) {
					if (!l.canDrop || !t.dragObj) return false;
					var $t = $(this);
					if (l.canDrop($t, e, t.dragObj)) {
						$t.addClass("dragover");
					}
				}).bind('dragover', function(e) {
					if (e.preventDefault) e.preventDefault();
					
					var fx = "none";
					if (l.canDrop && l.dropType && t.dragObj) {
						var $t = $(this);
						if (l.canDrop($t, e, t.dragObj)) {
							var tp = l.dropType($t, e, t.dragObj);
							if (tp) fx = tp;
						}
					}
					
					e.originalEvent.dataTransfer.dropEffect = fx;
					return false;
				}).bind('dragleave', function(e) {
					var $t = $(this);
					$t.removeClass("dragover");
					t.dragTarget = false;
				});
			}
		};
		return api;
	};

	mollify.MollifyJQueryDragAndDrop = function() {
		return {
			enableDragToDesktop: function (item, e) {
				//not supported
			},
			
			enableDrag : function($e, l) {
				$e.draggable({
					revert: "invalid",
					distance: 10,
					addClasses: false,
					zIndex: 2700,
					start: function(e) {
						if (l.onDragStart) l.onDragStart($(this), e);
					}
				});
			}
		};
	};
	
	mollify.ZeroClipboard = function(cb) {
		if (!cb || !window.ZeroClipboard) return false;
		window.ZeroClipboard.setDefaults({
			moviePath: 'js/lib/ZeroClipboard.swf',
			hoverClass: 'hover',
			activeClass: 'active',
			forceHandCursor: true
		});
		
		var $testclip = $('<div id="zeroclipboard-test" style="width=0px; height=0px;"></div>').appendTo($("body"));
		var clip = new window.ZeroClipboard($testclip[0]);
		clip.on('load', function(client) {
			var api = {
				enableCopy : function($e, text, l) {
					var clip = $e.data("mollify-zeroclipboard");
					if (!clip) {
						clip = new window.ZeroClipboard($e);
						$e.data("mollify-zeroclipboard", clip);
						if (l) $e.data("mollify-zeroclipboard-listener", l);
					}
					if (text) $e.data("mollify-zeroclipboard-text", text);
				}
			};
			cb(api);
		});
		clip.on('dataRequested', function() {
			var $t = $(this);
			var l = $t.data("mollify-zeroclipboard-listener");
			var copied = false;
			if (l && l.onGetText)
				copied = l.onGetText($t);
			if (!copied)
				copied = $t.data("mollify-zeroclipboard-text");
			if (copied) clip.setText(copied);
		});
		clip.on('mouseover', function() {
			var $t = $(this);
			var l = $t.data("mollify-zeroclipboard-listener");
			if (l && l.onMouseOver) l.onMouseOver($t, clip);
		});
		clip.on('mouseout', function() {
			var $t = $(this);
			var l = $t.data("mollify-zeroclipboard-listener");
			if (l && l.onMouseOut) l.onMouseOut($t);
		});
		clip.on('complete', function(client, args) {
			var $t = $(this);
			var l = $t.data("mollify-zeroclipboard-listener");
			if (l && l.onCopy) l.onCopy($t, args.text);
		});
	};
}(window.jQuery, window.mollify);

/**
 * uploader.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
!function($, mollify) {

	"use strict"; // jshint ;_;

	mollify.MollifyHTML5Uploader = function() {
		var t = this;
		
		// prevent default file drag&drop		
		$(document).bind('drop dragover', function (e) {
			e.preventDefault();
			return false;
		});
		
		/*this.open = function(folder) {
			var $d = mollify.dom.template("mollify-tmpl-uploader-dlg");
			mollify.ui.dialogs.custom({
				element: $d,
				"title-key": 'fileUploadDialogTitle',
				buttons: [
					{ id:0, "title-key": "upload" },
					{ id:1, "title-key": "cancel" }
				],
				"on-button": function(btn, dlg) {
					if (btn.id == 1)
						dlg.close();
					else t.onUpload($d, dlg,folder);
				},
				"on-show": function(dlg) { t.onOpen($d, dlg, folder); }
			});
		};*/
		
		/*this.onOpen = function($d, dlg, folder) {
			//var $form = $d.find(".mollify-uploader-form");//.attr("action", );
			var $input = $d.find("input").on('change', function() {
				//if (!this.files || this.files.length == 0) return;
				//if (this.files.length == 1) alert(this.files[0].name);
				//else alert(this.files.length);
			}).fileupload({
				url: mollify.service.url("filesystem/"+folder.id+'/files/'),
				dataType: 'json',
				dropZone: $d.find(".mollify-uploader").bind("dragover", function(e) { e.stopPropagation(); }),
				drop: function (e, data) {
					alert('Dropped: ' + data.files.length);	//TODO
				},
				progressall: function (e, data) {
					var progress = parseInt(data.loaded / data.total * 100, 10);
					console.log(progress);	//TODO
				},
				done: function(e, data) {
	
				}
			});	
		};*/
		
		this._getUploaderSettings = function() {
			return mollify.settings["html5-uploader"] || {};	
		};
		
		this._initDropZoneEffects = function($e) {
			$e.bind('dragover', function (e) {
				e.stopPropagation();
				var dropZone = $e
				var timeout = window.dropZoneTimeout;
				
				if (!timeout)
					dropZone.addClass('in');
				else
					clearTimeout(timeout);

				if (e.target === dropZone[0])
					dropZone.addClass('hover');
				else
					dropZone.removeClass('hover');

				window.dropZoneTimeout = setTimeout(function () {
					window.dropZoneTimeout = null;
					dropZone.removeClass('in hover');
				}, 100);
			});
		};
		
		this.initWidget = function($e, o) {
			var $d = mollify.dom.template("mollify-tmpl-uploader-widget").appendTo($e);
			mollify.ui.handlers.localize($e);
			var $dropZone = o.dropElement || $e;
			var started = false;
			var rejected = false;
			var l = o.handler;
			
			var $input = $d.find("input");
			if (t._getUploaderSettings()["allow-folders"]) $input.attr("directory webkitdirectory mozdirectory");
			$input.fileupload($.extend({
				url: o.url,
				dataType: 'json',
				dropZone: $dropZone,
				/*add: function (e, data) {
					if (l.isUploadAllowed && !l.isUploadAllowed(data.originalFiles)) return false;
					
					if (!started && l.start)
						l.start(data.originalFiles, function() {
							data.submit();
						});
					else
						data.submit();
					started = true;
				},*/
				submit: function (e, data) {
					if (started && rejected) return;
					//console.log("submit");
					//console.log(data);

					if (!started) {
						started = true;
						rejected = false;
						
						if (l.isUploadAllowed && !l.isUploadAllowed(data.originalFiles)) {
							rejected = true;
							return false;
						}
						
						if (l.start)
							l.start(data.originalFiles, function() {});
					}
				},
				progressall: function (e, data) {
					if (!l.progress) return;
					
					var progress = parseInt(data.loaded / data.total * 100, 10);
					//console.log(progress + "%");
					l.progress(progress, data.bitrate || false);
				},
				done: function(e, data) {
					//console.log("done");
					//if (l.finished) l.finished();
					//started = false;
				},
				stop: function() {
					//console.log("all done");
					started = false;
					rejected = false;
					if (l.finished) l.finished();
				},
				fail: function(e, data) {
					var r = data.response();
					var error = null;
					if (r && r.jqXHR) {
						var response = r.jqXHR.responseText;
						if (response) error = JSON.parse(response);
					}
					if (l.failed) l.failed(data.files, error);
					//started = false;
				}
			}, t._getUploaderSettings()));
			
			if ($dropZone) t._initDropZoneEffects($dropZone);
		};
		
		return {
			initUploadWidget : function($e, o) {
				mollify.templates.load("mollify-uploader", mollify.templates.url("uploader.html")).done(function() {
					t.initWidget($e, o);
				});
			},
			initDragAndDropUploader : function(h) {
				var $p = h.container;
				var $container = $('<div style="width: 0px; height: 0px; overflow: hidden;"></div>').appendTo($p);
				var $form = $('<form enctype="multipart/form-data"></form>').appendTo($container);
				var started = false;
				var rejected = false;
				var attributes = '';
				if (t._getUploaderSettings()["allow-folders"]) attributes = "directory webkitdirectory mozdirectory";
				var $dndUploader = $('<input type="file" class="mollify-mainview-uploader-input" name="uploader-html5[]" multiple="multiple"' + attributes + '></input>').appendTo($form).fileupload($.extend({
					url: '',
					dataType: 'json',
					dropZone: h.dropElement,
					/*add: function (e, data) {
						if (h.handler.isUploadAllowed && !h.handler.isUploadAllowed(data.originalFiles)) return false;
						
						if (!started && h.handler.start)
							h.handler.start(data.originalFiles, function() {
								data.submit();
							});
						else
							data.submit();
						started = true;
					},*/
					submit: function (e, data) {
						if (started && rejected) return;
						//console.log("submit");
						//console.log(data);

						if (!started) {
							started = true;
							rejected = false;
							
							if (h.handler.isUploadAllowed && !h.handler.isUploadAllowed(data.originalFiles)) {
								rejected = true;
								return false;
							}
							
							//$.each(data.originalFiles, function(i, f) { totalSize += f.size; });
							
							if (h.handler.start)
								h.handler.start(data.originalFiles, function() {});
						}
					},
					progressall: function (e, data) {
						if (!h.handler.progress) return;
						
						var progress = parseInt(data.loaded / data.total * 100, 10);
						//console.log(progress + "%");
						h.handler.progress(progress, data.bitrate || false);
					},
					done: function(e, data) {
						//console.log("done " + data.files.length);
						//console.log(data);						
					},
					stop: function() {
						//console.log("all done");
						started = false;
						rejected = false;
						if (h.handler.finished) h.handler.finished();
					},
					fail: function(e, data) {
						var r = data.response();
						var error = null;
						if (r && r.jqXHR) {
							var response = r.jqXHR.responseText;
							if (response) error = JSON.parse(response);
						}
						if (h.handler.failed) h.handler.failed(data.files, error);
					}
				}, t._getUploaderSettings())).fileupload('disable');
				t._initDropZoneEffects(h.dropElement);
				
				return {
					destroy: function() {
						if ($dndUploader) $dndUploader.fileupload("destroy");
						$dndUploader = false;
					},
					setUrl : function(url) {
						if (!$dndUploader) return;
						if (!url) {
							$dndUploader.fileupload('disable');
							return;
						}
						$dndUploader.fileupload('enable').fileupload('option', 'url', url);
					}
				};
			}
		};
	}
}(window.jQuery, window.mollify);