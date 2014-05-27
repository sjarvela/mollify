! function(mollify) {
    'use strict';

    /* Core */
    mollify.modules.push({
        id: 'mollify.core',

        setup: function(h, mod, gettext) {
            mod.factory('formatters', ['gettextCatalog',
                function(gettextCatalog) {
                    return {
                        ByteSize: function(nf) {
                            this.format = function(b) {
                                if (!window.def(b)) return "";

                                var bytes = b;
                                if (typeof(b) === "string") {
                                    bytes = parseInt(bytes, 10);
                                    if (isNaN(bytes)) return "";
                                } else if (typeof(b) !== "number") return "";

                                //TODO params

                                if (bytes < 1024)
                                    return nf.format(bytes) + " " + gettextCatalog.getPlural(bytes, 'fileSize_byte', 'fileSize_bytes');

                                if (bytes < (1024 * 1024)) {
                                    var kilobytes = bytes / 1024;
                                    return nf.format(kilobytes) + " " + gettextCatalog.getPlural(kilobytes, 'fileSize_kilobyte', 'fileSize_kilobytes');
                                }

                                if (bytes < (1024 * 1024 * 1024)) {
                                    var megabytes = bytes / (1024 * 1024);
                                    return nf.format(megabytes) + " " + gettextCatalog.getPlural(megabytes, 'fileSize_megabyte', 'fileSize_megabytes');
                                }

                                var gigabytes = bytes / (1024 * 1024 * 1024);
                                return nf.format(gigabytes) + " " + gettextCatalog.getPlural(gigabytes, 'fileSize_gigabyte', 'fileSize_gigabytes');
                            };
                        },
                        Timestamp: function(fmt) {
                            this.format = function(ts) {
                                if (ts == null) return "";
                                if (typeof(ts) === 'string') ts = mollify.utils.parseInternalTime(ts);
                                return ts.toString(fmt);
                            };
                        },
                        Number: function(precision, unit, ds) {
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
                                return this.filesystem.root(item.root_id).name + (item.path.length > 0 ? ":" + item.path : "");
                            }
                        }
                    };
                }
            ]);

            mod.factory('filesystem', ['$rootScope', 'service', 'session',
                function($rootScope, service, session) {
                    var _roots = [];
                    var _rootsById = [];
                    $rootScope.$on('session/start', function(event, session) {
                        _roots = session.data ? session.data.folders : [];
                        $.each(_roots, function(i, r) {
                            _rootsById[r.id] = r;
                        })
                    });
                    $rootScope.$on('session/end', function(event) {
                        _roots = [];
                        _rootsById = {};
                    });

                    var _canCopySingleTo = function(item, to) {
                        // cannot copy into file
                        if (to.is_file) return false;

                        // cannot copy into itself
                        if (item.id == to.id) return false;

                        // cannot copy into same location
                        if (item.parent_id == to.id) return false;
                        return true;
                    };

                    var _canMoveSingleTo = function(item, to) {
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

                    var _copy = function(i, to) {
                        return mollify.service.post("filesystem/" + i.id + "/copy/", {
                            folder: to.id
                        }).done(function(r) {
                            $rootScope.$broadcast('filesystem/copy', {
                                items: [i],
                                to: to
                            });
                        });
                    };

                    var _copyMany = function(i, to) {
                        return mollify.service.post("filesystem/items/", {
                            action: 'copy',
                            items: i,
                            to: to
                        }).done(function(r) {
                            $rootScope.$broadcast('filesystem/copy', {
                                items: i,
                                to: to
                            });
                        });
                    };

                    return {
                        roots: function() {
                            return _roots;
                        },
                        root: function(id) {
                            return _rootsById[id];
                        },
                        rootsById: function() {
                            return _rootsById;
                        },
                        folderInfo: function(id, hierarchy, data) {
                            return service.post("filesystem/" + (id ? id : "roots") + "/info/" + (hierarchy ? "?h=1" : ""), {
                                data: data || {}
                            }).pipe(function(r) {
                                //mollify.filesystem.permissionCache[id] = r.permissions;

                                var folder = r.folder;
                                var data = r;
                                data.items = r.folders.slice(0).concat(r.files);
                                if (r.hierarchy)
                                    r.hierarchy[0] = _rootsById[r.hierarchy[0].id];
                                return data;
                            });
                        },
                        getDownloadUrl: function(item) {
                            if (!item.is_file) return false;
                            var url = service.url("filesystem/" + item.id, true);
                            //TODO if (mollify.App.mobile)
                            //    url = url + ((url.indexOf('?') >= 0) ? "&" : "?") + "m=1";
                            return url;
                        },
                        canCopyTo: function(item, to) {
                            if (window.isArray(item)) {
                                for (var i = 0, j = item.length; i < j; i++)
                                    if (!_canCopySingleTo(item[i], to)) return false;
                                return true;
                            }

                            return _canCopySingleTo(item, to);
                        },
                        canMoveTo: function(item, to) {
                            if (window.isArray(item)) {
                                for (var i = 0, j = item.length; i < j; i++)
                                    if (!_canMoveSingleTo(item[i], to)) return false;
                                return true;
                            }

                            return _canMoveSingleTo(item, to);
                        },
                        copy: function(i, to) {
                            if (!i) return;

                            if (window.isArray(i) && i.length > 1) {
                                if (!to) {
                                    var df = $.Deferred();
                                    /*mollify.ui.dialogs.folderSelector({
                                        title: mollify.ui.texts.get('copyMultipleFileDialogTitle'),
                                        message: mollify.ui.texts.get('copyMultipleFileMessage', [i.length]),
                                        actionTitle: mollify.ui.texts.get('copyFileDialogAction'),
                                        handler: {
                                            onSelect: function(f) {
                                                $.when(mfs._copyMany(i, f)).then(df.resolve, df.reject);
                                            },
                                            canSelect: function(f) {
                                                return mfs.canCopyTo(i, f);
                                            }
                                        }
                                    });*/
                                    alert("selector");
                                    return df.promise();
                                } else
                                    return _copyMany(i, to);
                            }

                            if (window.isArray(i)) i = i[0];

                            if (!to) {
                                var df2 = $.Deferred();
                                /*mollify.ui.dialogs.folderSelector({
                                    title: mollify.ui.texts.get('copyFileDialogTitle'),
                                    message: mollify.ui.texts.get('copyFileMessage', [i.name]),
                                    actionTitle: mollify.ui.texts.get('copyFileDialogAction'),
                                    handler: {
                                        onSelect: function(f) {
                                            $.when(mfs._copy(i, f)).then(df2.resolve, df2.reject);
                                        },
                                        canSelect: function(f) {
                                            return mfs.canCopyTo(i, f);
                                        }
                                    }
                                });*/
                                alert("selector");
                                return df2.promise();
                            } else
                                return _copy(i, to);
                        }
                    }
                }
            ]);

            mod.factory('service', ['$rootScope', 'settings',
                function($rootScope, settings) {
                    var _sessionId = false;
                    $rootScope.$on('session/start', function(event, session) {
                        _sessionId = session.id;
                    });
                    $rootScope.$on('session/end', function(event) {
                        _sessionId = false;
                    });
                    var limitedHttpMethods = !! settings['limited-http-methods'];
                    var urlFn = function(u, full) {
                        if (u.startsWith('http')) return u;
                        var url = settings["service-path"] + "r.php/" + u;
                        if (!full) return url;
                        return "TODO" + url; //mollify.App.pageUrl + url;
                    };
                    var doRequest = function(type, url, data) {
                        var t = type;
                        var diffMethod = (limitedHttpMethods && (t == 'PUT' || t == 'DELETE'));
                        if (diffMethod) t = 'POST';

                        return (function(sid) {
                            return $.ajax({
                                type: t,
                                url: urlFn(url),
                                processData: false,
                                data: data ? JSON.stringify(data) : null,
                                contentType: 'application/json',
                                dataType: 'json',
                                beforeSend: function(xhr) {
                                    xhr.setRequestHeader("mollify-api-version", "2");
                                    if (sid)
                                        xhr.setRequestHeader("mollify-session-id", sid);
                                    if (limitedHttpMethods || diffMethod)
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
                                var df = $.Deferred();

                                // if session has expired since starting request, ignore it
                                if (_sessionId != sid) return df;

                                var error = false;
                                var data = false;

                                if (xhr.responseText && xhr.responseText.startsWith('{')) error = JSON.parse($.trim(xhr.responseText));
                                if (!error) error = {
                                    code: 999
                                }; //unknown

                                var failContext = {
                                    handled: false
                                }
                                if (error.code == 100 && _sessionId) {
                                    $rootScope.$broadcast('error/unauthorized');
                                    failContext.handled = true;
                                }
                                // push default handler to end of callback list
                                setTimeout(function() {
                                    df.fail(function(err) {
                                        if (!failContext.handled) window.alert(JSON.stringify(err)); //TODO mollify.ui.dialogs.showError(err);
                                    });
                                }, 0);
                                return df.rejectWith(failContext, [error]);
                            }).promise()
                        }(_sessionId));
                    };
                    var service = {
                        url: urlFn,

                        get: function(url) {
                            return doRequest("GET", url, null);
                        },

                        post: function(url, data) {
                            return doRequest("POST", url, data);
                        },

                        put: function(url, data) {
                            return doRequest("PUT", url, data);
                        },

                        del: function(url, data) {
                            return doRequest("DELETE", url, data);
                        }
                    };
                    return service;
                }
            ]);

            mod.factory('session', ['service', '$rootScope',
                function(service, $rootScope) {
                    var _session = false;
                    var _end = function() {
                        $rootScope.features = {};
                        $rootScope.session = null;
                        $rootScope.$broadcast('session/end');
                    };
                    var _set = function(s) {
                        $rootScope.features = s.features;

                        if (!s || !s.authenticated) {
                            _session = {
                                id: false,
                                user: null
                            }
                        } else {
                            _session = {
                                id: s.session_id,
                                user: {
                                    id: s.user_id,
                                    type: s.user_type,
                                    name: s.username,
                                    lang: s.lang
                                },
                                data: s
                            }
                        }
                        $rootScope.session = _session;
                        $rootScope.$broadcast('session/start', _session);
                        $rootScope.$on('error/unauthorized', _end);
                    };
                    //_set();
                    return {
                        get: function() {
                            return _session;
                        },
                        end: function() {
                            var df = $.Deferred();
                            service.get('session/logout').done(function(s) {
                                df.resolve(s);
                                if (s) _end(s);
                            }).fail(df.reject);
                            return df.promise();
                        },
                        init: function() {
                            var df = $.Deferred();
                            service.get('session/info').done(function(s) {
                                df.resolve(s);
                                if (s) _set(s);
                            }).fail(df.reject);
                            return df.promise();
                        },
                        authenticate: function(username, pw, remember) {
                            return service.post('session/authenticate', {
                                username: username,
                                password: window.Base64.encode(pw),
                                remember: !! remember
                            }).done(function(s) {
                                _set(s);
                            });
                        }
                    };
                }
            ]);

            gettext('session_logout');
            h.registerAction({
                id: 'session/logout',
                type: 'session',
                icon: "fa-sign-out",
                titleKey: 'session_logout',
                handler: ["session",
                    function(ctx, session) {
                        session.end();
                    }
                ]
            });

            gettext('file_copy');
            h.registerAction({
                id: 'file/copy',
                icon: "fa-copy",
                type: 'filesystem',
                titleKey: 'file_copy',
                handler: ["filesystem",
                    function(file, filesystem) {
                        filesystem.copy(file);
                    }
                ]
            });
        }
    });

    /* Login */
    mollify.modules.push({
        id: 'mollify.login',

        setup: function(h, mod) {
            h.registerView('login', {
                url: "/login",
                template: "login.html",
                controller: "LoginCtrl"
            });

            mod.controller('LoginCtrl', ['$scope', '$rootScope', '$state', 'session',
                function($scope, $rootScope, $state, session) {
                    $scope.username = "";
                    $scope.password = "";
                    $scope.remember = false;

                    $scope.doLogin = function() {
                        session.authenticate($scope.username, $scope.password, $scope.remember);
                    };

                    $scope.reset = {
                        forgotEmail: "",
                        sendPassword: function() {
                            alert($scope.reset.forgotEmail);
                        }
                    };
                }
            ]);
        }
    });
}(window.mollify);
