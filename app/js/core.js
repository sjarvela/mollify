/* Core */

var core = angular.module('mollify.core', []);

core.factory('service', ['settings',
    function(settings) {
    	var _sessionId = false;
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
        service = {
            setSessionId: function(id) {
                _sessionId = id;
            },

            url: urlFn,

            get: function(url, s, err) {
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

core.factory('session', ['service',
    function(service) {
        console.log("Session");
        console.log(service);

        var session = {
            id: '',
            isLogged: false,
            user: null
        };
        return {
            get: function() {
                return session;
            },
            authenticate: function(username, pw) {
                return service.post('session/authenticate', {
                    username: username,
                    password: window.Base64.encode(pw)
                }).done(function(s) {
                	service.setSessionId(s.id);	//event?
                    console.log("session");
                    console.log(s);
                });
            }
        };
    }
]);

/* Login */
core.controller('LoginCtrl', ['$scope', '$state', 'session',
    function($scope, $state, session) {
        $scope.username = "";
        $scope.password = "";

        $scope.doLogin = function() {
            session.authenticate($scope.username, $scope.password).done(function() {
                //TODO target from params
                $state.go("main");
            });
        }
    }
])
