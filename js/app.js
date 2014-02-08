/**
 * app.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

!function($) {

	"use strict";
	
	var DEFAULTS = {
		"language": {
			"default": "en",
			"options": ["en"]	
		},
		"view-url" : false,
		"app-element-id" : "mollify",
		"service-path": "backend/",
		"template-path": "templates/",
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
	
	window.mollify = {
		modules : [],
		init: function(config, plugins) {
			// instance
			var _m = new MollifyApp(config);
			var templateLoader = new TemplateLoader(_m.settings['template-path']);

			// Ember additions
			Em.View.reopen(Em.I18n.TranslateableAttributes);
			Ember.TextField.reopen({
			    attributeBindings: ['accept', 'autocomplete', 'autofocus', 'name', 'required']
			});

			templateLoader.load('application').done(function() {
				window.App = Ember.Application.create({
					rootElement: '#'+_m.settings["app-element-id"],
					LOG_ACTIVE_GENERATION: true,
					LOG_TRANSITIONS_INTERNAL: true
				});
				window.App.deferReadiness();
				
				var registeredRoutes = []
				var tasks = [];
				
				// init modules
				$.each(window.mollify.modules, function(i, m) {
					registeredRoutes.push(m.name);
					
					var camelCaseName = m.name.charAt(0).toUpperCase() + m.name.slice(1);
					
					// register module route
					var r = Ember.Route.extend({
						model: m.model,
						beforeModel: function(transition) {
							// prevent unauthorized access
							if (m.requiresAuthentication && !_m.session().user) {
								console.log("not authenticated, redirect to login");
								var loginController = this.controllerFor('login');
								loginController.set('previousTransition', transition);
								this.transitionTo('login');
								return;
							}
							if (!m.template || templateLoader.isLoaded(m.template)) return;
							
							// load module template
							transition.abort();
							templateLoader.load(m.template).done(function() { transition.retry(); });
						},
						setupController : function(controller, model) {
							controller.set('model', model);
							if (m.setup) m.setup(controller, model);
						},	
						renderTemplate : function(controller, model){
							if (m.template) this.render(m.template);
							else this._super(controller, model);
						}
					});
					window.App[camelCaseName+"Route"] = r;
					if (m.controller) window.App[camelCaseName+"Controller"] = m.controller;
				});

				window.App.Router.map(function() {
					var that = this;
					$.each(registeredRoutes, function(i, r) {
						that.route(r);
					});
				});
				
				window.App.IndexRoute = Ember.Route.extend({
					beforeModel: function() {
						// defaults to "main"
						this.transitionTo('main');
					}
				});

				var fh = {
					start : function() {
						window.App.advanceReadiness();
					}
				};
				
				_m.init(fh, plugins);
				
				
				// start
				$.when.apply($, tasks).done(function() {
					_m.start();
				});
			}).fail(function() {
				$("body").html("Mollify could not be started");
			});
		},
		registerModule : function(m) {
			window.mollify.modules.push(m);
		}
	};
	
	/**	
	*	TemplateLoader, loads view templates dynamically
	**/
	var TemplateLoader = function(path) {
		var that = this;
		this._loaded = [];
		
		this.load = function(name, templateName) {
			var df = $.Deferred();
			if (that._loaded.indexOf(name) >= 0) return df.resolve();
			
			$.ajax({
				url: path + name + ".html",
				dataType: 'text',
				success: function(html) {
					that._loaded.push(name);
					
					if (!html || html.length === 0) {
						df.reject();
						return;
					}

					if (html.indexOf('<script') >= 0) {
						$(html).filter('script[type="text/x-handlebars"]').each(function() {
							templateName = $(this).attr('data-template-name');
							Ember.TEMPLATES[templateName] = Ember.Handlebars.compile($(this).html());
						});
					} else {
						Ember.TEMPLATES[templateName || name] = Ember.Handlebars.compile(html);
					}
					df.resolve();
			   }
			}).fail(df.reject);
			return df;
		};
		
		this.isLoaded = function(name) { return that._loaded.indexOf(name) >= 0; };
	};
	
	var MollifyApp = function(config) {
		var that = this;		
		
		this._time = new Date().getTime(),
		this._settings = $.extend(true, {}, DEFAULTS, config);
		this._session = false;
		this._service = new Service(this._settings["service-path"], this._settings['limited-http-methods']);
		this._events = new EventHandler();
		this._filesystem = new Filesystem();
		this._ui = new UI();

		this.init = function(fh, plugins) {
			that._fh = fh;
			that._service.init(that._api);
			that._filesystem.init(that._api);
			that._ui.init(that._api);
			
			that._events.addEventHandler(function(e) {
				if (e.type == 'session/start') {
					that._onSessionStart(e.payload);
				} else if (e.type == 'session/end') {
					that._onSessionEnd();
				}
			});
			//initialize plugins	
		};
		
		this.resourceUrl = function(u) {
			if (!that._settings["resource-map"]) return u;
			
			var urlParts = window.mollify.utils.breakUrl(u);
			if (!urlParts) return u;
			
			var mapped = that._settings["resource-map"][urlParts.path];
			if (mapped === undefined) return u;
			if (mapped === false) return false;
			
			return mapped + urlParts.paramsString;
		};
		
		this._onSessionStart = function(session) {
			that._session = new Session(session);
			that._filesystem.setup(that._session.data.folders, ((that._session.user && that._session.user.admin) ? that._session.data.roots : false));
			that._ui.initializeLang();
		};
		
		this._onSessionEnd = function() {
			that._session = new Session();
			that._filesystem.setup([]);
		};
		
		this.start = function() {
			that._service.get("session/info/").fail(function() {
				console.log("error");
				//new _m.ui.FullErrorView('Failed to initialize mollify').show();
			}).done(function(s) {
				that._events.dispatch('session/start', s);
				that._fh.start();
			});
		};
		
		this.openView = function(path) {
			//var viewId = id || 'main';
			//that._fh.openView(viewId);	
		};

		this._api = {
			init: that.init,
			start: that.start,
			resourceUrl: that.resourceUrl,
			openView : that.openView,
			settings : that._settings,
			session : function() { return that._session; },
			pageUrl : "foo",	//TODO
			service : that._service
		};
		return this._api;
	};
	
	/* SESSION */
	
	var Session = function(sd) {
		var that = this;
		
		this._user = sd.authenticated ? {
			id : s.user_id,
			name : s.username,			
			type: s.user_type,
			lang: s.lang,
			admin: s.user_type == 'a',
			permissions: s.permissions
			//hasPermission : function(name, required) { return _gm.helpers.hasPermission(s.permissions, name, required); }
		} : false;
		
		return {
			id: sd ? sd.session_id : null,
			user: that._user,
			features: sd ? sd.features : [],
			plugins: sd ? sd.plugins : {},
			data: sd
		};
	};
	
	/* UI */
	
	var UI = function() {
		var that = this;
		
		this.init = function(_m) {
			that._m = _m;
			that.element = $("#"+_m.settings['app-element-id']);
			
			that.texts = {
				locale : null,
				//_dict : {},
				//_pluginTextsLoaded : [],
				
				load : function(id) {
					var df = $.Deferred();
					if (this.locale)
						return df.resolve();
			
					return this._load("localization/texts_"+(id || 'en')+".json", df);
				},
				
				clear : function() {
					this.locale = null;
					Em.I18n.translations = {};
					//this._pluginTextsLoaded = [];		
				},
			
				/*loadPlugin : function(pluginId) {
					if (this._pluginTextsLoaded.indexOf(pluginId) >= 0) return $.Deferred().resolve();
					
					return this._load(_m.plugins.getLocalizationUrl(pluginId), $.Deferred()).done(function() {
						this._pluginTextsLoaded.push(pluginId);
					});
				},*/
				
				_load : function(u, df) {
					var url = that._m.resourceUrl(u);
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
							console.log("error");
							//new _gm.ui.views.FullError('<b>Localization file syntax error</b> (<code>'+url+'</code>)', '<code>'+e.message+'</code>').show();
							return;
						}
						if (!that.texts.locale)
							that.texts.locale = t.locale;
						else
							if (that.texts.locale != t.locale) {
								df.reject();
								return;
							}
						that.texts.add(t.locale, t.texts);
						df.resolve(t.locale);			
					}).fail(function(e) {
						if (e.status == 404) {
							new _gm.ui.view.FullError('Localization file missing: <code>'+url+'</code>', 'Either create the file or use <a href="https://code.google.com/p/_m/wiki/ClientResourceMap">client resource map</a> to load it from different location, or to ignore it').show();
							return;
						}
						df.reject();
					});
					return df;
				},
						
				add : function(locale, t) {
					if (!locale || !t) return;
					
					if (!this.locale) this.locale = locale;
					else if (locale != this.locale) return;
					
					for (var id in t) Em.I18n.translations[id] = t[id];
				},
				
				get : function(id, p) {
					if (!id) return "";
					var t = Em.I18n.translations[id];
					if (!t) return "!"+this.locale+":"+id;
					
					if (p !== undefined) {
						if (!window.isArray(p)) p = [p];
						for (var i=0,j=p.length; i<j; i++)
							t = t.replace("{" + i + "}", p[i]);
					}
					return t;
				},
				
				has : function(id) {
					return !!Em.I18n.translations[id];	
				}
			};

		};
		
		this.initializeLang = function() {
			var df = $.Deferred();
			var lang = (that._m.session.user && that._m.session.user.lang) ? that._m.session.user.lang : (that._m.settings.language["default"] || 'en');
			
			if (that.texts.locale && that.texts.locale == lang) return df.resolve();
			
			var pluginTextsLoaded = that.texts._pluginTextsLoaded;
			if (that.texts.locale) {
				that.element.removeClass("lang-"+that.texts.locale);
				that.texts.clear();
			}
			
			var list = [];
			list.push(that.texts.load(lang).done(function(locale) {
				$("html").attr("lang", locale);
				that.element.addClass("lang-"+locale);
			}));
			
			if (pluginTextsLoaded) {
				$.each(pluginTextsLoaded, function(i, id) {
					list.push(that.texts.loadPlugin(id));
				});
			}
			$.when.apply($, list).done(df.resolve).fail(df.reject);
			return df;
		};	
	};
	
	/* SERVICE */
	
	var Service = function(servicePath, limitedHttpMethods) {
		var that = this;
		this._servicePath = servicePath;
		this._limitedHttpMethods = !!limitedHttpMethods;
		
		this.init = function(_m) {
			that._m = _m;	
		};
		
		this.url = function(u, full) {
			if (u.startsWith('http')) return u;
			var url = that._servicePath+"r.php/"+u;
			if (!full) return url;
			return _m.pageUrl + url;
		};
		
		this.get = function(url, s, err) {
			return that._do("GET", url, null);
		};
	
		this.post = function(url, data) {
			return that._do("POST", url, data);
		};
		
		this.put = function(url, data) {
			return that._do("PUT", url, data);
		};
		
		this.del = function(url, data) {
			return that._do("DELETE", url, data);
		};
				
		this._do = function(type, url, data) {
			var t = type;
			var diffMethod = (that._limitedHttpMethods && (t == 'PUT' || t == 'DELETE'));
			if (diffMethod) t = 'POST';
			
			return (function(sid) { return $.ajax({
				type: t,
				url: that.url(url),
				processData: false,
				data: data ? JSON.stringify(data) : null,
				contentType: 'application/json',
				dataType: 'json',
				beforeSend: function(xhr) {
					var session = that._m.session();
					if (session && session.id)
						xhr.setRequestHeader("mollify-session-id", session.id);
					if (that._limitedHttpMethods || diffMethod)
						xhr.setRequestHeader("mollify-http-method", type);
				}
			}).pipe(function(r) {			
				if (!r) {
					return $.Deferred().reject({ code: 999 });
				}
				return r.result;
			}, function(xhr) {
				var session = that._m.session();
				var df = $.Deferred();
				
				// if session has expired since starting request, ignore it
				if (session.id != sid) return df;
	
				var error = false;
				var data = false;
	
				if (xhr.responseText && xhr.responseText.startsWith('{')) error = JSON.parse($.trim(xhr.responseText));
				if (!error) error = { code: 999 };	//unknown
				
				var failContext = {
					handled: false
				}
				if (error.code == 100 && session.user) {
					_m.events.dispatch('session/end');
					failContext.handled = true;
				}
				// push default handler to end of callback list
				setTimeout(function(){
					df.fail(function(err){
						if (!failContext.handled) _m.ui.dialogs.showError(err);
					});
				}, 0);
				return df.rejectWith(failContext, [error]);
			}).promise()}(that._m.session().id));
		};
	};
	
	/* EVENTS */
	
	var EventHandler = function() {
		var that = this;
		
		this._handlers = [];
		this._handlerTypes = {};

		this.addEventHandler = function(h, t) {
			this._handlers.push(h);
			if (t) this._handlerTypes[h] = t;
		};
		
		this.dispatch = function(type, payload) {
			var e = { type: type, payload: payload };
			$.each(this._handlers, function(i, h) {
				if (!that._handlerTypes[h] || type == that._handlerTypes[h])
					h(e);
			});
		};
	};

	/* FILESYSTEM */
		
	var Filesystem = function() {
		var that = this;
		
		this.roots = [];
		this.rootsById = {};
		this.allRoots = false;
		
		this._permissionCache = {};
		
		this.init = function(_m) {
			that._m = _m;	
		};
		
		this.setup = function(f, allRoots) {
			if (f && _m.session().user) {
				that.roots = f;
				for (var i=0,j=f.length; i<j; i++)
					that.rootsById[f[i].id] = f[i];
				
				if (allRoots) {
					that.allRoots = allRoots;
					for (var k=0,l=allRoots.length; k<l; k++)
						if (!that.rootsById[allRoots[k].id])
							that.rootsById[allRoots[k].id] = allRoots[k];
				}
			}
		};
		
		this.getDownloadUrl = function(item) {
			if (!item.is_file) return false;
			var url = _m.service.url("filesystem/"+item.id, true);
			if (_m.mobile)
				url = url + ((url.indexOf('?') >= 0) ? "&" : "?") + "m=1";
			return url;
		};
	
		this.getUploadUrl = function(folder) {	
			if (!folder || folder.is_file) return null;
			return _m.service.url("filesystem/"+folder.id+'/files/') + "?format=binary";
		};
		
		this.itemDetails = function(item, data) {
			return _m.service.post("filesystem/"+item.id+"/details/", { data : data }).done(function(r) {
				_m.filesystem.permissionCache[item.id] = r.permissions;
				if (item.parent_id && r.parent_permissions) _m.filesystem.permissionCache[item.parent_id] = r.parent_permissions;
			});
		};
		
		this.folderInfo = function(id, hierarchy, data) {
			return _m.service.post("filesystem/"+ (id ? id : "roots") + "/info/" + (hierarchy ? "?h=1" : ""), { data : data }).done(function(r) {
				_m.filesystem.permissionCache[id] = r.permissions;
			});
		};
	
		this.findFolder = function(d, data) {
			return _m.service.post("filesystem/find/", { folder: d, data : data });
		};
		
		this.hasPermission = function(item, name, required) {
			if (!_m.session.user) return false;
			if (_m.session.user.admin) return true;
			return _gm.helpers.hasPermission(_m.filesystem.permissionCache[((typeof(item) === "string") ? item : item.id)], name, required);
		};
			
		this.items = function(parent, files) {
			if (parent == null) {
				var df = $.Deferred();
				df.resolve({ folders: mfs.roots , files: [] });
				return df.promise();
			}
			return _m.service.get("filesystem/"+parent.id+"/items/?files=" + (files ? '1' : '0'));
		};
		
		this.copy = function(i, to) {
			if (!i) return;
			
			if (window.isArray(i) && i.length > 1) {
				if (!to) {
					var df = $.Deferred();
					_m.ui.dialogs.folderSelector({
						title: _m.ui.texts.get('copyMultipleFileDialogTitle'),
						message: _m.ui.texts.get('copyMultipleFileMessage', [i.length]),
						actionTitle: _m.ui.texts.get('copyFileDialogAction'),
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
				_m.ui.dialogs.folderSelector({
					title: _m.ui.texts.get('copyFileDialogTitle'),
					message: _m.ui.texts.get('copyFileMessage', [i.name]),
					actionTitle: _m.ui.texts.get('copyFileDialogAction'),
					handler: {
						onSelect: function(f) { $.when(mfs._copy(i, f)).then(df2.resolve, df2.reject); },
						canSelect: function(f) { return mfs.canCopyTo(i, f); }
					}
				});
				return df2.promise();
			} else
				return mfs._copy(i, to);
		};
		
		this.copyHere = function(item, name) {
			if (!item) return;
			
			if (!name) {
				var df = $.Deferred();
				_m.ui.dialogs.input({
					title: _m.ui.texts.get('copyHereDialogTitle'),
					message: _m.ui.texts.get('copyHereDialogMessage'),
					defaultValue: item.name,
					yesTitle: _m.ui.texts.get('copyFileDialogAction'),
					noTitle: _m.ui.texts.get('dialogCancel'),
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
		
		this.canCopyTo = function(item, to) {
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
		
		this.canMoveTo = function(item, to) {
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
	
		this._copyHere = function(i, name) {
			return _m.service.post("filesystem/"+i.id+"/copy/", {name:name}).done(function(r) {
				_m.events.dispatch('filesystem/copy', { items: [ i ], name: name });
			});
		};
			
		this._copy = function(i, to) {
			return _m.service.post("filesystem/"+i.id+"/copy/", {folder:to.id}).done(function(r) {
				_m.events.dispatch('filesystem/copy', { items: [ i ], to: to });
			});
		};
		
		this._copyMany = function(i, to) {
			return _m.service.post("filesystem/items/", {action: 'copy', items: i, to: to}).done(function(r) {
				_m.events.dispatch('filesystem/copy', { items: i, to: to });
			});
		};
		
		this.move = function(i, to) {
			if (!i) return;
			
			if (window.isArray(i) && i.length > 1) {
				if (!to) {
					var df = $.Deferred();
					_m.ui.dialogs.folderSelector({
						title: _m.ui.texts.get('moveMultipleFileDialogTitle'),
						message: _m.ui.texts.get('moveMultipleFileMessage', [i.length]),
						actionTitle: _m.ui.texts.get('moveFileDialogAction'),
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
				_m.ui.dialogs.folderSelector({
					title: _m.ui.texts.get('moveFileDialogTitle'),
					message: _m.ui.texts.get('moveFileMessage', [i.name]),
					actionTitle: _m.ui.texts.get('moveFileDialogAction'),
					handler: {
						onSelect: function(f) { $.when(mfs._move(i, f)).then(df2.resolve, df2.reject); },
						canSelect: function(f) { return mfs.canMoveTo(i, f); }
					}
				});
				return df2.promise();
			} else
				return mfs._move(i, to);
		};
		
		this._move = function(i, to) {
			return _m.service.post("filesystem/"+i.id+"/move/", {id:to.id}).done(function(r) {
				_m.events.dispatch('filesystem/move', { items: [ i ], to: to });
			});
		};
	
		this._moveMany = function(i, to) {
			return _m.service.post("filesystem/items/", {action: 'move', items: i, to: to}).done(function(r) {
				_m.events.dispatch('filesystem/move', { items: i, to: to });
			});
		};
		
		this.rename = function(item, name) {
			if (!name || name.length === 0) {
				var df = $.Deferred();
				_m.ui.dialogs.input({
					title: _m.ui.texts.get(item.is_file ? 'renameDialogTitleFile' : 'renameDialogTitleFolder'),
					message: _m.ui.texts.get('renameDialogNewName'),
					defaultValue: item.name,
					yesTitle: _m.ui.texts.get('renameDialogRenameButton'),
					noTitle: _m.ui.texts.get('dialogCancel'),
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
		
		this._rename = function(item, name) {
			return _m.service.put("filesystem/"+item.id+"/name/", {name: name}).done(function(r) {
				_m.events.dispatch('filesystem/rename', { items: [item], name: name });
			});
		};
		
		this._handleDenied = function(action, i, data, msgTitleDenied, msgTitleAccept) {
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
				var plugin = _m.plugins.get(k);
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
				_m.ui.dialogs.confirmActionAccept(msgTitleAccept, validationMessages, function() {
					df.resolve(acceptKeys);
				}, df.reject);
			} else {
				_m.ui.dialogs.showActionDeniedMessage(msgTitleDenied, nonAcceptable);
				df.reject();
			}
			return df;
		}
		
		this.del = function(i) {
			if (!i) return;
			
			var df = $.Deferred();
			if (window.isArray(i) && i.length > 1) {
				mfs._delMany(i).done(df.resolve).fail(function(e) {
					// request denied
					if (e.code == 109 && e.data && e.data.items) {
						this.handled = true;
						mfs._handleDenied("delete", i, e.data, _m.ui.texts.get("actionDeniedDeleteMany"), _m.ui.texts.get("actionAcceptDeleteMany", i.length)).done(function(acceptKeys) { mfs._delMany(i, acceptKeys).done(df.resolve).fail(df.reject); }).fail(function(){df.reject(e);});
					} else df.reject(e);
				});
				return df.promise();
			}
			
			if (window.isArray(i)) i = i[0];
			mfs._del(i).done(df.resolve).fail(function(e) {
				// request denied
				if (e.code == 109 && e.data && e.data.items) {
					this.handled = true;
					mfs._handleDenied("delete", i, e.data, _m.ui.texts.get("actionDeniedDelete", i.name), _m.ui.texts.get("actionAcceptDelete", i.name)).done(function(acceptKeys) { mfs._del(i, acceptKeys).done(df.resolve).fail(df.reject); }).fail(function(){df.reject(e);});
				} else df.reject(e);
			});
			return df.promise();
		};
		
		this._del = function(item, acceptKeys) {
			return _m.service.del("filesystem/"+item.id, acceptKeys ? { acceptKeys : acceptKeys } : null).done(function(r) {
				_m.events.dispatch('filesystem/delete', { items: [item] });
			});
		};
		
		this._delMany = function(i, acceptKeys) {
			return _m.service.post("filesystem/items/", {action: 'delete', items: i, acceptKeys : (acceptKeys ? acceptKeys : null)}).done(function(r) {
				_m.events.dispatch('filesystem/delete', { items: i });
			});
		};
		
		this.createFolder = function(folder, name) {
			return _m.service.post("filesystem/"+folder.id+"/folders/", {name: name}).done(function(r) {
				_m.events.dispatch('filesystem/createfolder', { items: [folder], name: name });
			});
		};
	};
	
	/* UTILS */
	
	window.mollify.utils = {
		breakUrl : function(u) {
			var parts = u.split("?");
			return { path: parts[0], params: window.mollify.utils.getUrlParams(u), paramsString: (parts.length > 1 ? ("?" + parts[1]) : "") };
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
		
		noncachedUrl : function(url, uniqueKey) {
			return window.mollify.utils.urlWithParam(url, "_="+uniqueKey);
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
			return window.mollify.utils.formatDateTime(time, 'yyyyMMddHHmmss');
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