! function(mollify) {
    'use strict';

    /* Core */
    mollify.modules.push({
        id: 'mollify.core',

        setup: function(h, mod) {
            mod.factory('service', ['$rootScope', 'settings',
                function($rootScope, settings) {
                    var _sessionId = false;
                    $rootScope.$on('session/start', function(event, session) {
                        _sessionId = session.id;
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
                                if (error.code == 100 && mollify.session.user) {
                                    mollify.events.dispatch('session/end');
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
                                }
                            }
                        }
                        $rootScope.session = _session;
                        $rootScope.$broadcast('session/start', _session);
                    };
                    //_set();
                    return {
                        get: function() {
                            return _session;
                        },
                        init: function() {
                            var df = $.Deferred();
                            service.get('session/info').done(function(s) {
                                if (s) _set(s);
                                df.resolve();
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
                        session.authenticate($scope.username, $scope.password).done(function() {
                            if ($rootScope.loginForwardState) {
                                var goto = $rootScope.loginForwardState;
                                $rootScope.loginForwardState = null;
                                $state.go(goto.to.name);
                            } else
                                $state.go("main");
                        });
                    }
                }
            ]);
        }
    });
}(window.mollify);
