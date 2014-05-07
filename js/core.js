! function(mollify) {
    'use strict';

    /* Core */
    mollify.modules.push({
        id: 'mollify.core',

        setup: function(h, mod) {
            mod.factory('formatters', ['$translate',
                function($translate) {
                    var df = $.Deferred();
                    $translate(['file-size.one-byte', 'file-size.bytes', 'file-size.one-kb', 'file-size.kb']).then(function(texts) {
                        df.resolve({
                            ByteSize: function(texts, nf) {
                                this.format = function(b) {
                                    if (!window.def(b)) return "";

                                    var bytes = b;
                                    if (typeof(b) === "string") {
                                        bytes = parseInt(bytes, 10);
                                        if (isNaN(bytes)) return "";
                                    } else if (typeof(b) !== "number") return "";

                                    if (bytes < 1024)
                                        return (bytes == 1 ? texts['file-size.one-byte'] : texts['file-size.bytes', nf.format(bytes)]);

                                    if (bytes < (1024 * 1024)) {
                                        var kilobytes = bytes / 1024;
                                        return (kilobytes == 1 ? texts['file-size.one-kb'] : texts['file-size.kb', nf.format(kilobytes)]);
                                    }

                                    if (bytes < (1024 * 1024 * 1024)) {
                                        var megabytes = bytes / (1024 * 1024);
                                        return texts.get('file-size.mb', nf.format(megabytes));
                                    }

                                    var gigabytes = bytes / (1024 * 1024 * 1024);
                                    return texts.get('file-size.gb', nf.format(gigabytes));
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
                            FilesystemItemPath: function(fs) {
                                this.format = function(item) {
                                    if (!item) return "";
                                    return fs.rootsById[item.root_id].name + (item.path.length > 0 ? ":&nbsp;" + item.path : "");
                                }
                            }
                        });
                    });
                    return df;
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
                        $rootScope.session = null;
                        $rootScope.$broadcast('session/end');
                    };
                    var _set = function(s) {
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
                                    name: s.username
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
                        end: _end,
                        init: function() {
                            var df = $.Deferred();
                            service.get('session/info').done(function(s) {
                                df.resolve(s);
                                if (s) _set(s);
                            }).fail(df.reject);
                            return df.promise();
                        },
                        authenticate: function(username, pw) {
                            return service.post('session/authenticate', {
                                username: username,
                                password: window.Base64.encode(pw)
                            }).done(function(s) {
                                _set(s);
                            });
                        }
                    };
                }
            ]);
        }
    });

    /* Login */
    mollify.modules.push({
        id: 'mollify.login',

        setup: function(h, mod) {
            mod.controller('LoginCtrl', ['$scope', '$rootScope', '$state', 'session',
                function($scope, $rootScope, $state, session) {
                    $scope.username = "";
                    $scope.password = "";

                    $scope.doLogin = function() {
                        session.authenticate($scope.username, $scope.password);
                    }
                }
            ]);
        }
    });
}(window.mollify);
