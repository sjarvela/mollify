/**
 * app.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

! function($) {

    "use strict";

    var DEFAULTS = {
        "language": {
            "default": "en",
            "options": ["en"]
        },
        "view-url": false,
        "app-element-id": "mollify",
        "service-path": "backend/",
        "template-path": "templates/",
        "limited-http-methods": false,
        "file-view": {
            "default-view-mode": false,
            "list-view-columns": {
                "name": {
                    width: 250
                },
                "size": {},
                "file-modified": {
                    width: 150
                }
            },
            "actions": false
        },
        "html5-uploader": {
            maxChunkSize: 0
        },
        dnd: {
            dragimages: {
                "filesystemitem-file": "css/images/mimetypes64/empty.png",
                "filesystemitem-folder": "css/images/mimetypes64/folder.png",
                "filesystemitem-many": "css/images/mimetypes64/application_x_cpio.png"
            }
        }
    };

    var createView = function(view, App, _m) {
        return view.view.apply(_m);
    };

    var createController = function(view, App, _m) {
        return view.controller.apply(_m);
    };

    var createModelFn = function(view, App, _m) {
        return $.proxy(view.model, _m);
    };

    var getEffectiveTemplates = function(view, allViews) {
        var list = [];
        if (view.templateFile) list.push(view.templateFile);

        for (var current = view.parent; true;) {
            if (!current) break;
            var cv = allViews[current];
            if (cv.templateFile) list.push(cv.templateFile);
            current = cv.parent;
        };
        return list;
    };

    var createRoute = function(view, App, _m, allViews) {
        return Ember.Route.extend({
            actions: view.routeActions,
            model: createModelFn(view, App, _m),
            beforeModel: function(transition) {
                // prevent unauthorized access
                if (view.requiresAuthentication && !_m.session.user) {
                    console.log("not authenticated, redirect to login");
                    var loginController = this.controllerFor('login');
                    _m.session._loginTransition = transition;
                    //loginController.set('previousTransition', transition);
                    this.transitionTo('login');
                    return;
                }
                if (view.before) view.before.apply(this, [_m, transition]);

                var templates = getEffectiveTemplates(view, allViews);
                if (!templates || _m.templateLoader.isLoaded(templates)) return;

                // load module template
                transition.abort();
                _m.templateLoader.load(templates).done(function() {
                    transition.retry();
                });
            },
            setupController: function(controller, model) {
                controller.set('model', model);
                controller.set('session', _m.session);
                controller._m = _m;
                //if (module.setupController) module.setupController(controller, model);
            },
            renderTemplate: function(controller, model) {
                if (view.render) view.render.apply(this, [_m, controller, model]);
                else {
                    if (view.template) this.render(view.template);
                    else this._super(controller, model);
                }
            }
        });
    };

    var setupModuleViews = function(hierarchy, views, App, _m) {
        var process = function(parent) {
            $.each(mollify.utils.getKeys(parent), function(i, viewId) {
                var view = views[viewId];

                App[view._emberName + "Route"] = createRoute(view, App, _m, views);
                if (view.index) App[view._emberName + "IndexRoute"] = createRoute(view.index, App, _m, views);
                if (view.controller) App[view._emberName + "Controller"] = createController(view, App, _m); //view.controller.apply(_m);
                if (view.view) App[view._emberName + "View"] = createView(view, App, _m); //view.view.apply(_m);
                if (view.setup) view.setup(App, _m);
                process(parent[viewId]);
            });
        };
        process(hierarchy);
    };

    var setupModuleRoutes = function(hierarchy, views, App, _m) {
        var process = function(router, parent) {
            $.each(mollify.utils.getKeys(parent), function(i, viewId) {
                var view = views[viewId];
                if (!view.path) return

                console.log(view.path);
                router.resource(viewId, {
                    path: view.path
                }, function() {
                    process(this, parent[viewId]);
                });
            });
        };

        App.Router.map(function() {
            process(this, hierarchy);
        });
    };

    var setupApp = function(App, _m) {
        App._m = _m;
        App.ApplicationController = Ember.Controller.extend({
            updateCurrentPath: function() {
                App.set('currentPath', this.get('currentPath'));
            }.observes('currentPath')
        });
        App.ApplicationRoute = Ember.Route.extend({
            actions: {
                goto: function(p) {
                    var parts = p.split("/");
                    var path = parts[0];
                    var id = parts.length > 1 ? parts[1] : undefined;
                    if (id)
                        this.transitionTo(path, id);
                    else
                        this.transitionTo(path);
                }
                /*openModal: function(modalName, model) {
                            this.controllerFor(modalName).set('model', model);
                            return this.render(modalName, {
                                into: 'application',
                                outlet: 'modal'
                            });
                        },

                        closeModal: function() {
                            return this.disconnectOutlet({
                                outlet: 'modal',
                                parentView: 'application'
                            });
                        }*/
            },
            setupController : function(c) {
				Ember.Instrumentation.subscribe('restart', {
					before: function() {},
					after: function() {
						// forward to "main", it should be redirected to default view (or login)
						c.transitionToRoute('main');
					}
				});
            }
        });

        App.IndexRoute = Ember.Route.extend({
            beforeModel: function() {
                // defaults to "files"
                this.transitionTo('files');
            }
        });

        // modules
        var hierarchy = {};
        var allViews = {};
        var allActions = {};
        $.each(window.mollify.modules, function(i, module) {
            if (module.actions) {
                allActions = $.extend(allActions, module.actions);
            }

            if (module.views) {
                allViews = $.extend(allViews, module.views);

                $.each(window.mollify.utils.getKeys(module.views), function(i, viewId) {
                    var view = allViews[viewId];
                    var parentNode = view.parent ? allViews[view.parent]._hierarchyNode : hierarchy;
                    var parentPath = view.parent ? allViews[view.parent]._path : "";
                    parentNode[viewId] = {};
                    view._hierarchyNode = parentNode[viewId];

                    view._path = (view.parent ? (allViews[view.parent]._path + "/") : "") + viewId;
                    view._emberName = window.mollify.utils.firstLetterUp(viewId);
                });
            }

            if (module.setup) module.setup.apply(_m, [App]);
        });

        //process actions

        var actionKeys = window.mollify.utils.getKeys(allActions);
        var actionsByType = {};
        $.each(actionKeys, function(i, k) {
        	var a = allActions[k];
        	var t = a.type;
        	if (!t) return;
        	if (!actionsByType[t]) actionsByType[t] = [];
        	actionsByType[t].push(k);
        });

        _m.actions = {
        	keys: actionKeys,
            all: allActions,
            byType: actionsByType,
            getByType: function(type) {
            	var that = this;
            	var list = [];
            	$.each(this.byType[type], function(i, k) {
            		list.push(that.all[k]);
                });
                return list;
            },
            getApplicableByType: function(type, ctx) {
                return $.grep(this.getByType(type), function(a) {
                    return !a.isApplicable || a.isApplicable.apply(_m, [ctx]);
                });
            }
        };

        _m.ui.views = {
            all: allViews,
            hierarchy: hierarchy
        };

        setupModuleViews(hierarchy, allViews, App, _m);
        setupModuleRoutes(hierarchy, allViews, App, _m);
    };

    // Ember additions
    Em.View.reopen(Em.I18n.TranslateableAttributes);
    Ember.TextField.reopen({
        attributeBindings: ['accept', 'autocomplete', 'autofocus', 'name', 'required']
    });

    window.mollify = {
        modules: [],
        init: function(config, plugins) {
            // instance
            var _m = new MollifyApp(config);

            window.App = Ember.Application.create({
                rootElement: '#' + _m.settings["app-element-id"],
                LOG_ACTIVE_GENERATION: true,
                LOG_TRANSITIONS_INTERNAL: true,
                currentPath: ''
            });
            var App = window.App;
            App.deferReadiness();
            window.registerPopover(App); //TODO away

            setupApp(App, _m);

            _m.templateLoader.load('application').done(function() {
                var fh = {
                    run: function() {
                        window.App.advanceReadiness();
                    },
                    restart: function() {
                        console.log('restart');
                        Ember.Instrumentation.instrument("restart", null, function(){});
                    }
                };

                _m.init(fh, plugins);
                _m.start();
            }).fail(function() {
                $("body").html("Mollify could not be started");
            });
        },
        registerModule: function(m) {
            this.modules.push(m);
        }
    };

    var MollifyApp = function(config, templateLoader) {
        var that = this;
        this._time = new Date().getTime();

        this.settings = $.extend(true, {}, DEFAULTS, config);
        this.session = false;
        this.service = new Service(this, this.settings["service-path"], this.settings['limited-http-methods']);
        this.events = new EventHandler(this);
        this.filesystem = new Filesystem(this);
        this.ui = new UI(this);
        this.templateLoader = new TemplateLoader(that.settings['template-path']);
        this.plugins = new PluginManager();

        this.init = function(fh, plugins) {
            that._fh = fh;
            this.ui.init();

            that.events.addEventHandler(function(e) {
                if (e.type == 'session/start') {
                    that._onSessionStart(e.payload);
                } else if (e.type == 'session/end') {
                    that._onSessionEnd();
                }
            });
            that._clientPlugins = plugins;
            //initialize plugins	
        };

        this.resourceUrl = function(u) {
            if (!that.settings["resource-map"]) return u;

            var urlParts = window.mollify.utils.breakUrl(u);
            if (!urlParts) return u;

            var mapped = that.settings["resource-map"][urlParts.path];
            if (mapped === undefined) return u;
            if (mapped === false) return false;

            return mapped + urlParts.paramsString;
        };

        this._onSessionStart = function(session) {
            that.session = new Session(session);
            that.plugins.init(that._clientPlugins, session);
            that.filesystem.setup(that.session.data.folders, ((that.session.user && that.session.user.admin) ? that.session.data.roots : false));
            that.ui.initializeLang();
        };

        this._onSessionEnd = function() {
            that.session = new Session();
            that.plugins.init();
            that.filesystem.setup([]);
            that._fh.restart(); //go to initial view
        };

        this.start = function() {
            that.service.get("session/info/").fail(function() {
                console.log("error");
                //new _m.ui.FullErrorView('Failed to initialize mollify').show();
            }).done(function(s) {
                that.events.dispatch('session/start', s);
                that._fh.run();
            });
        };

        this.openView = function(path) {
            //var viewId = id || 'main';
            //that._fh.openView(viewId);	
        };

        /*this._api = {
			init: that.init,
			start: that.start,
			resourceUrl: that.resourceUrl,
			openView : that.openView,
			settings : that._settings,
			session : function() { return that._session; },
			pageUrl : "foo",	//TODO
			service : that._service,
			events : that._events,
			filesystem : that._filesystem,
			templateLoader : that._templateLoader,
			plugins : that._plugins
		};
		return this._api;*/
    };

    var PluginManager = function() {
        var that = this;

        this.init = function(clientPlugins, sessionData) {
            this.list = sessionData ? sessionData.plugins : [];
        };
    };

    /**	
     *	TemplateLoader, loads view templates dynamically
     **/
    var TemplateLoader = function(path) {
        var that = this;
        this._loaded = [];

        this.load = function(t) {
            var df = $.Deferred();
            if (this.isLoaded(t)) return df.resolve();

            var doLoad = function(name) {
                return $.ajax({
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
                                var templateName = $(this).attr('data-template-name');
                                Ember.TEMPLATES[templateName] = Ember.Handlebars.compile($(this).html());
                            });
                        } else {
                            Ember.TEMPLATES[name] = Ember.Handlebars.compile(html);
                        }
                    }
                });

            }
            var list = [];
            if (window.isArray(t)) {
                $.each(t, function(i, n) {
                    list.push(doLoad(n));
                });
            } else {
                list.push(doLoad(t));
            }
            $.when.apply($, list).done(df.resolve).fail(df.reject);
            return df;
        };

        this.isLoaded = function(t) {
            if (window.isArray(t)) {
                var all = true;
                $.each(t, function(i, n) {
                    if (that._loaded.indexOf(n) < 0) {
                        all = false;
                        return false;
                    }
                });
                return all;
            }
            return that._loaded.indexOf(name) >= 0;
        };
    };

    /* SESSION */

    var Session = function(sd) {
        var that = this;

        this._user = sd && sd.authenticated ? {
            id: sd.user_id,
            name: sd.username,
            type: sd.user_type,
            lang: sd.lang,
            admin: sd.user_type == 'a',
            permissions: sd.permissions
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

    var UI = function(_m) {
        var that = this;

        this.init = function() {
            that.element = $("#" + _m.settings['app-element-id']);

            that.texts = {
                locale: null,
                //_dict : {},
                //_pluginTextsLoaded : [],

                load: function(id) {
                    var df = $.Deferred();
                    if (this.locale)
                        return df.resolve();

                    return this._load("localization/texts_" + (id || 'en') + ".json", df);
                },

                clear: function() {
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

                _load: function(u, df) {
                    var url = _m.resourceUrl(u);
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
                            console.log("Localization file error: " + e);
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
                            console.log("Localization file missing: " + url);
                            //new _gm.ui.view.FullError('Localization file missing: <code>'+url+'</code>', 'Either create the file or use <a href="https://code.google.com/p/_m/wiki/ClientResourceMap">client resource map</a> to load it from different location, or to ignore it').show();
                            return;
                        }
                        df.reject();
                    });
                    return df;
                },

                add: function(locale, t) {
                    if (!locale || !t) return;

                    if (!this.locale) this.locale = locale;
                    else if (locale != this.locale) return;

                    for (var id in t) Em.I18n.translations[id] = t[id];
                },

                get: function(id, p) {
                    if (!id) return "";
                    return Ember.I18n.t(id);
                    /*var t = Em.I18n.translations[id];
                    if (!t) return "!" + this.locale + ":" + id;

                    if (p !== undefined) {
                        if (!window.isArray(p)) p = [p];
                        for (var i = 0, j = p.length; i < j; i++)
                            t = t.replace("{" + i + "}", p[i]);
                    }
                    return t;*/
                },

                has: function(id) {
                    return Em.I18n.t.exists(id);
                }
            };

        };

        this.initializeLang = function() {
            var df = $.Deferred();
            var lang = (_m.session.user && _m.session.user.lang) ? _m.session.user.lang : (_m.settings.language["default"] || 'en');

            if (that.texts.locale && that.texts.locale == lang) return df.resolve();

            var pluginTextsLoaded = that.texts._pluginTextsLoaded;
            if (that.texts.locale) {
                that.element.removeClass("lang-" + that.texts.locale);
                that.texts.clear();
            }

            var list = [];
            list.push(that.texts.load(lang).done(function(locale) {
                $("html").attr("lang", locale);
                that.element.addClass("lang-" + locale);
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

    var Service = function(_m, servicePath, limitedHttpMethods) {
        var that = this;
        this._servicePath = servicePath;
        this._limitedHttpMethods = !! limitedHttpMethods;

        this.url = function(u, full) {
            if (u.startsWith('http')) return u;
            var url = that._servicePath + "r.php/" + u;
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

            return (function(sid) {
                return $.ajax({
                    type: t,
                    url: that.url(url),
                    processData: false,
                    data: data ? JSON.stringify(data) : null,
                    contentType: 'application/json',
                    dataType: 'json',
                    beforeSend: function(xhr) {
                        var session = _m.session;
                        if (session && session.id)
                            xhr.setRequestHeader("mollify-session-id", session.id);
                        if (that._limitedHttpMethods || diffMethod)
                            xhr.setRequestHeader("mollify-http-method", type);
                    }
                }).pipe(function(r) {
                    if (!r) {
                        return $.Deferred().reject({
                            code: 999
                        });
                    }
                    return r.result;
                }, function(xhr) {
                    var session = _m.session;
                    var df = $.Deferred();

                    // if session has expired since starting request, ignore it
                    if (session.id != sid) return df;

                    var error = false;
                    var data = false;

                    if (xhr.responseText && xhr.responseText.startsWith('{')) error = JSON.parse($.trim(xhr.responseText));
                    if (!error) error = {
                        code: 999
                    }; //unknown

                    var failContext = {
                        handled: false
                    }
                    if (error.code == 100 && session.user) {
                        _m.events.dispatch('session/end');
                        failContext.handled = true;
                    }
                    // push default handler to end of callback list
                    setTimeout(function() {
                        df.fail(function(err) {
                            if (!failContext.handled) _m.ui.dialogs.showError(err);
                        });
                    }, 0);
                    return df.rejectWith(failContext, [error]);
                }).promise()
            }(_m.session.id));
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
            var e = {
                type: type,
                payload: payload
            };
            $.each(this._handlers, function(i, h) {
                if (!that._handlerTypes[h] || type == that._handlerTypes[h])
                    h(e);
            });
        };
    };

    /* FILESYSTEM */

    var Filesystem = function(_m) {
        var that = this;

        this.roots = [];
        this.rootsById = {};
        this.allRoots = false;

        this._permissionCache = {};

        this.setup = function(f, allRoots) {
            if (f && _m.session.user) {
                that.roots = f;
                for (var i = 0, j = f.length; i < j; i++)
                    that.rootsById[f[i].id] = f[i];

                if (allRoots) {
                    that.allRoots = allRoots;
                    for (var k = 0, l = allRoots.length; k < l; k++)
                        if (!that.rootsById[allRoots[k].id])
                            that.rootsById[allRoots[k].id] = allRoots[k];
                }
            }
        };

        this.getDownloadUrl = function(item) {
            if (!item.is_file) return false;
            var url = _m.service.url("filesystem/" + item.id, true);
            if (_m.mobile)
                url = url + ((url.indexOf('?') >= 0) ? "&" : "?") + "m=1";
            return url;
        };

        this.getUploadUrl = function(folder) {
            if (!folder || folder.is_file) return null;
            return _m.service.url("filesystem/" + folder.id + '/files/') + "?format=binary";
        };

        this.itemDetails = function(item, data) {
            return _m.service.post("filesystem/" + item.id + "/details/", {
                data: data
            }).done(function(r) {
                that._permissionCache[item.id] = r.permissions;
                if (item.parent_id && r.parent_permissions) that._permissionCache[item.parent_id] = r.parent_permissions;
            });
        };

        this.folderInfo = function(id, hierarchy, data) {
            return _m.service.post("filesystem/" + (id ? id : "roots") + "/info/" + (hierarchy ? "?h=1" : ""), {
                data: data
            }).done(function(r) {
                that._permissionCache[id] = r.permissions;
            });
        };

        this.findFolder = function(d, data) {
            return _m.service.post("filesystem/find/", {
                folder: d,
                data: data
            });
        };

        this.hasPermission = function(item, name, required) {
            if (!_m.session.user) return false;
            if (_m.session.user.admin) return true;
            return false; //TODOwindow.mollify.utils.hasPermission(_m.filesystem.permissionCache[((typeof(item) === "string") ? item : item.id)], name, required);
        };

        this.items = function(parent, files) {
            if (parent == null) {
                var df = $.Deferred();
                df.resolve({
                    folders: that.roots,
                    files: []
                });
                return df.promise();
            }
            return _m.service.get("filesystem/" + parent.id + "/items/?files=" + (files ? '1' : '0'));
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
                            onSelect: function(f) {
                                $.when(that._copyMany(i, f)).then(df.resolve, df.reject);
                            },
                            canSelect: function(f) {
                                return that.canCopyTo(i, f);
                            }
                        }
                    });
                    return df.promise();
                } else
                    return that._copyMany(i, to);

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
                        onSelect: function(f) {
                            $.when(that._copy(i, f)).then(df2.resolve, df2.reject);
                        },
                        canSelect: function(f) {
                            return that.canCopyTo(i, f);
                        }
                    }
                });
                return df2.promise();
            } else
                return that._copy(i, to);
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
                        isAcceptable: function(n) {
                            return !!n && n.length > 0 && n != item.name;
                        },
                        onInput: function(n) {
                            $.when(that._copyHere(item, n)).then(df.resolve, df.reject);
                        }
                    }
                });
                return df.promise();
            } else {
                return that._copyHere(item, name);
            }
        };

        this.canCopyTo = function(item, to) {
            if (window.isArray(item)) {
                for (var i = 0, j = item.length; i < j; i++)
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
                for (var i = 0, j = item.length; i < j; i++)
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
            return _m.service.post("filesystem/" + i.id + "/copy/", {
                name: name
            }).done(function(r) {
                _m.events.dispatch('filesystem/copy', {
                    items: [i],
                    name: name
                });
            });
        };

        this._copy = function(i, to) {
            return _m.service.post("filesystem/" + i.id + "/copy/", {
                folder: to.id
            }).done(function(r) {
                _m.events.dispatch('filesystem/copy', {
                    items: [i],
                    to: to
                });
            });
        };

        this._copyMany = function(i, to) {
            return _m.service.post("filesystem/items/", {
                action: 'copy',
                items: i,
                to: to
            }).done(function(r) {
                _m.events.dispatch('filesystem/copy', {
                    items: i,
                    to: to
                });
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
                            onSelect: function(f) {
                                $.when(mfs._moveMany(i, f)).then(df.resolve, df.reject);
                            },
                            canSelect: function(f) {
                                return mfs.canMoveTo(i, f);
                            }
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
                        onSelect: function(f) {
                            $.when(mfs._move(i, f)).then(df2.resolve, df2.reject);
                        },
                        canSelect: function(f) {
                            return mfs.canMoveTo(i, f);
                        }
                    }
                });
                return df2.promise();
            } else
                return mfs._move(i, to);
        };

        this._move = function(i, to) {
            return _m.service.post("filesystem/" + i.id + "/move/", {
                id: to.id
            }).done(function(r) {
                _m.events.dispatch('filesystem/move', {
                    items: [i],
                    to: to
                });
            });
        };

        this._moveMany = function(i, to) {
            return _m.service.post("filesystem/items/", {
                action: 'move',
                items: i,
                to: to
            }).done(function(r) {
                _m.events.dispatch('filesystem/move', {
                    items: i,
                    to: to
                });
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
                        isAcceptable: function(n) {
                            return !!n && n.length > 0 && n != item.name;
                        },
                        onInput: function(n) {
                            $.when(mfs._rename(item, n)).then(df.resolve, df.reject);
                        }
                    }
                });
                return df.promise();
            } else {
                return mfs._rename(item, name);
            }
        };

        this._rename = function(item, name) {
            return _m.service.put("filesystem/" + item.id + "/name/", {
                name: name
            }).done(function(r) {
                _m.events.dispatch('filesystem/rename', {
                    items: [item],
                    name: name
                });
            });
        };

        this._handleDenied = function(action, i, data, msgTitleDenied, msgTitleAccept) {
            var df = $.Deferred();
            var handlers = [];
            var findItem = function(id) {
                if (!window.isArray(data.target)) return data.target;

                for (var i = 0, j = data.target.length; i < j; i++) {
                    if (data.target[i].id == id) return data.target[i];
                }
                return null;
            };
            for (var k in data.items) {
                var plugin = _m.plugins.get(k);
                if (!plugin || !plugin.actionValidationHandler) return false;

                var handler = plugin.actionValidationHandler();
                handlers.push(handler);

                var items = data.items[k];
                for (var m = 0, l = items.length; m < l; m++) {
                    var item = items[m];
                    item.item = findItem(item.item);
                }
            }

            var validationMessages = [];
            var nonAcceptable = [];
            var acceptKeys = [];
            var allAcceptable = true;
            for (var ind = 0, j = handlers.length; ind < j; ind++) {
                var msg = handlers[ind].getValidationMessages(action, data.items[k], data);
                for (var mi = 0, mj = msg.length; mi < mj; mi++) {
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
                        mfs._handleDenied("delete", i, e.data, _m.ui.texts.get("actionDeniedDeleteMany"), _m.ui.texts.get("actionAcceptDeleteMany", i.length)).done(function(acceptKeys) {
                            mfs._delMany(i, acceptKeys).done(df.resolve).fail(df.reject);
                        }).fail(function() {
                            df.reject(e);
                        });
                    } else df.reject(e);
                });
                return df.promise();
            }

            if (window.isArray(i)) i = i[0];
            mfs._del(i).done(df.resolve).fail(function(e) {
                // request denied
                if (e.code == 109 && e.data && e.data.items) {
                    this.handled = true;
                    mfs._handleDenied("delete", i, e.data, _m.ui.texts.get("actionDeniedDelete", i.name), _m.ui.texts.get("actionAcceptDelete", i.name)).done(function(acceptKeys) {
                        mfs._del(i, acceptKeys).done(df.resolve).fail(df.reject);
                    }).fail(function() {
                        df.reject(e);
                    });
                } else df.reject(e);
            });
            return df.promise();
        };

        this._del = function(item, acceptKeys) {
            return _m.service.del("filesystem/" + item.id, acceptKeys ? {
                acceptKeys: acceptKeys
            } : null).done(function(r) {
                _m.events.dispatch('filesystem/delete', {
                    items: [item]
                });
            });
        };

        this._delMany = function(i, acceptKeys) {
            return _m.service.post("filesystem/items/", {
                action: 'delete',
                items: i,
                acceptKeys: (acceptKeys ? acceptKeys : null)
            }).done(function(r) {
                _m.events.dispatch('filesystem/delete', {
                    items: i
                });
            });
        };

        this.createFolder = function(folder, name) {
            return _m.service.post("filesystem/" + folder.id + "/folders/", {
                name: name
            }).done(function(r) {
                _m.events.dispatch('filesystem/createfolder', {
                    items: [folder],
                    name: name
                });
            });
        };
    };

    /* UTILS */

    window.mollify.utils = {
        firstLetterUp: function(s) {
            return s.charAt(0).toUpperCase() + s.slice(1);
        },

        breakUrl: function(u) {
            var parts = u.split("?");
            return {
                path: parts[0],
                params: window.mollify.utils.getUrlParams(u),
                paramsString: (parts.length > 1 ? ("?" + parts[1]) : "")
            };
        },

        getUrlParams: function(u) {
            var params = {};
            $.each(u.substring(1).split("&"), function(i, p) {
                var pp = p.split("=");
                if (!pp || pp.length < 2) return;
                params[decodeURIComponent(pp[0])] = decodeURIComponent(pp[1]);
            });
            return params;
        },

        urlWithParam: function(url, param, v) {
            var p = param;
            if (v) p = param + "=" + encodeURIComponent(v);
            return url + (window.strpos(url, "?") ? "&" : "?") + p;
        },

        noncachedUrl: function(url, uniqueKey) {
            return window.mollify.utils.urlWithParam(url, "_=" + uniqueKey);
        },

        formatDateTime: function(time, fmt) {
            var ft = time.toString(fmt);
            return ft;
        },

        parseInternalTime: function(time) {
            if (!time || time == null || typeof(time) !== 'string' || time.length != 14) return null;

            var ts = new Date();
            /*ts.setUTCFullYear(time.substring(0,4));
			ts.setUTCMonth(time.substring(4,6) - 1);
			ts.setUTCDate(time.substring(6,8));
			ts.setUTCHours(time.substring(8,10));
			ts.setUTCMinutes(time.substring(10,12));
			ts.setUTCSeconds(time.substring(12,14));*/
            ts.setYear(time.substring(0, 4));
            ts.setMonth(time.substring(4, 6) - 1);
            ts.setDate(time.substring(6, 8));
            ts.setHours(time.substring(8, 10));
            ts.setMinutes(time.substring(10, 12));
            ts.setSeconds(time.substring(12, 14));
            return ts;
        },

        formatInternalTime: function(time) {
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

        mapByKey: function(list, key, value) {
            var byKey = {};
            if (!list) return byKey;
            for (var i = 0, j = list.length; i < j; i++) {
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

        getKeys: function(m) {
            var list = [];
            if (m)
                for (var k in m) {
                    if (!m.hasOwnProperty(k)) continue;
                    list.push(k);
                }
            return list;
        },

        extractValue: function(list, key) {
            var l = [];
            for (var i = 0, j = list.length; i < j; i++) {
                var r = list[i];
                l.push(r[key]);
            }
            return l;
        },

        filter: function(list, f) {
            var result = [];
            $.each(list, function(i, it) {
                if (f(it)) result.push(it);
            });
            return result;
        },

        arrayize: function(i) {
            var a = [];
            if (!window.isArray(i)) {
                a.push(i);
            } else {
                return i;
            }
            return a;
        }
    };

    /*var setupEmberComponents = function(App) {
        window.registerPopover(App);

        App.Popover = Ember.View.extend({
            layoutName: 'core/popover',
            placement: 'auto bottom',
            triggerSelector: '',
            didInsertElement: function() {
                var self = this;
                $(self.parentSelector).popover({
                    html: true,
                    placement: self.placement,
                    content: function() {
                        var $content = self.$();
                        return $content.html();
                    }
                });
            }
        });

        App.UiPopoverComponent = Ember.Component.extend({
            placement: 'auto bottom',
            actions: {
                close: function() {
                    return this.sendAction();
                }
            },
            didInsertElement: function() {
                var self = this;
                var $content = self.$();
                var html = $content.html();
                $content.remove();

                $(self.triggerSelector).popover({
                    html: true,
                    placement: self.placement,
                    content: html
                });
            }
        });

        App.ModalDialogComponent = Ember.Component.extend({
            actions: {
                close: function() {
                    return this.sendAction();
                }
            },
            didInsertElement: function() {
                this.$().modal('show').find(".modal").show();
            }
        });
    };*/

    /* Common */

    window.isArray = function(o) {
        return Object.prototype.toString.call(o) === '[object Array]';
    }

    if (typeof String.prototype.trim !== 'function') {
        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g, '');
        }
    }

    if (typeof String.prototype.startsWith !== 'function') {
        String.prototype.startsWith = function(s) {
            if (!s || s.length === 0) return false;
            return this.substring(0, s.length) == s;
        }
    }

    if (typeof String.prototype.count !== 'function') {
        String.prototype.count = function(search) {
            var m = this.match(new RegExp(search.toString().replace(/(?=[.\\+*?\[\^\]$(){}\|])/g, "\\"), "g"));
            return m ? m.length : 0;
        }
    }

    window.def = function(o) {
        return (typeof(o) != 'undefined');
    }

    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(obj, start) {
            for (var i = (start || 0), j = this.length; i < j; i++) {
                if (this[i] === obj) {
                    return i;
                }
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
        if (typeof(len) == "undefined") {
            len = 0;
        }
        if (typeof(padstr) == "undefined") {
            padstr = ' ';
        }
        if (typeof(dir) == "undefined") {
            dir = STR_PAD_RIGHT;
        }

        if (len + 1 >= str.length) {
            switch (dir) {
                case STR_PAD_LEFT:
                    str = new Array(len + 1 - str.length).join(padstr) + str;
                    break;
                case STR_PAD_BOTH:
                    var padlen = len - str.length;
                    var right = Math.ceil(padlen / 2);
                    var left = padlen - right;
                    str = new Array(left + 1).join(padstr) + str + new Array(right + 1).join(padstr);
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
        _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

        // public method for encoding
        encode: function(input) {
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
        decode: function(input) {
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
        _utf8_encode: function(string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";

            for (var n = 0; n < string.length; n++) {

                var c = string.charCodeAt(n);

                if (c < 128) {
                    utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }

            }

            return utftext;
        },

        // private method for UTF-8 decoding
        _utf8_decode: function(utftext) {
            var string = "";
            var i = 0;
            var c = 0,
                c1 = 0,
                c2 = 0;

            while (i < utftext.length) {

                c = utftext.charCodeAt(i);

                if (c < 128) {
                    string += String.fromCharCode(c);
                    i++;
                } else if ((c > 191) && (c < 224)) {
                    c2 = utftext.charCodeAt(i + 1);
                    string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                } else {
                    c2 = utftext.charCodeAt(i + 1);
                    var c3 = utftext.charCodeAt(i + 2);
                    string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }

            }

            return string;
        }
    }
}(window.jQuery);
