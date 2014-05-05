! function($, angular) {
    'use strict';

    var mollifyDefaults = {
        "language": {
            "default": "en",
            "options": ["en"]
        },
        "view-url": false,
        "app-element-id": "mollify",
        "service-path": "backend/",
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

    var MollifyApp = function(ng, settings) {
        var that = this;
        var views = {
            login: {
                id: 'login',
                url: "/login",
                controller: "LoginCtrl",
                template: "login.html"
            },
            main: {
                id: 'main',
                abstract: true,
                controller: "MainCtrl",
                template: "main.html"
            }
        };

        var deps = ['ui.bootstrap', 'ui.router', 'pascalprecht.translate'];
        $.each(mollify.modules, function(i, m) {
            var mod = ng.module(m.id, m.dependencies || []);
            m.setup({
                registerView: function(id, v) {
                    v.id = id;
                    views[id] = v;
                }
            }, mod);
            deps.push(m.id);
        });
        var getViews = function(parent) {
            var result = [];
            $.each(views, function(i, v) {
                if (v.parent == parent) result.push(v);
            });
            return result;
        };

        var app = ng.module('mollify', deps);

        app.config(function($provide) {
            $provide.factory('settings', function() {
                return settings;
            });
        }).config(['$translateProvider',
            function($translateProvider) {
                $translateProvider.useMissingTranslationHandler('missingLocalizationHandler');
                $translateProvider.preferredLanguage(settings.language.
                    default);
                $translateProvider.useStaticFilesLoader({
                    prefix: './localization/texts_',
                    suffix: '.json'
                });
            }
        ]);

        app.factory('missingLocalizationHandler', function() {
            return function(translationID) {
                console.log("Missing localization: " + translationID);
            };
        });

        app.controller('MainCtrl', ['$scope', '$rootScope', '$state', '$stateParams',
            function($scope, $rootScope, $state, $stateParams) {
                console.log("main");
                $scope.views = getViews('main');
                $scope.activeView = views[$state.current.name];
                $rootScope.$on('$stateChangeSuccess', function(e, to) {
                    $scope.activeView = views[to.name];
                });
                //console.log($state);
            }
        ]);

        // views
        app.
        config(['$stateProvider', '$urlRouterProvider',
            function($stateProvider, $urlRouterProvider) {
                // For any unmatched url, redirect to /files
                $urlRouterProvider.otherwise("/files");

                var templateUrlFn = function(tpl) {
                    return function(stateParams) {
                        var tplName = angular.isFunction(tpl) ? tpl(stateParams) : tpl;
                        return 'templates/' + tplName; //TODO path from params
                    };
                };

                $.each(mollify.utils.getKeys(views), function(i, vk) {
                    var v = views[vk];
                    var vp = {};
                    var subviews = false;
                    if (v.url) vp.url = v.url;
                    if (v.parent) vp.parent = v.parent;
                    if (v.resolve) vp.resolve = v.resolve;

                    if (v.subviews) {
                        subviews = {};
                        $.each(mollify.utils.getKeys(v.subviews), function(i, svk) {
                            var sv = v.subviews[svk];
                            var svp = {
                                templateUrl: templateUrlFn(sv.template)
                            };
                            if (sv.controller) {
                                if (angular.isFunction(sv.controller)) svp.controllerProvider = sv.controller;
                                else svp.controller = sv.controller;
                            }
                            if (svp.resolve) svp.resolve = sv.resolve;

                            subviews[svk] = svp;
                        });
                        subviews[''] = {
                            controller: v.controller,
                            templateUrl: templateUrlFn(v.template)
                        };
                        vp.views = subviews;
                    } else {
                        if (v.controller) {
                            if (angular.isFunction(v.controller)) vp.controllerProvider = v.controller;
                            else vp.controller = v.controller;
                        }
                        vp.templateUrl = templateUrlFn(v.template);
                    }

                    console.log("VIEW:" + vk);
                    console.log(vp);
                    $stateProvider
                        .state(vk, vp);

                    if (v.redirect) {
                        var fn = false;
                        if (typeof(v.redirect) == 'function') fn = v.redirect;
                        else if (window.isArray(v.redirect) && v.redirect.length > 0)
                            fn = v.redirect[v.redirect.length - 1];
                        if (fn)
                            $urlRouterProvider.rule(function($injector, $location) {
                                var deps = [];
                                var args = [$location];
                                if (window.isArray(v.redirect) && v.redirect.length > 1)
                                    for (var i = 0; i <= v.redirect.length - 2; i++) args.push($injector.get(v.redirect[i]));
                                fn.apply(null, args);
                            });
                    }
                });
            }
        ])

        app.run(function($rootScope, $state, service, session, filesystem) {
            that._onStart($rootScope, $state, session);
        });

        this.run = function() {
            // start
            var $root = $("#mollify").html("<div ui-view></div>");
            ng.bootstrap($root, ['mollify']);
        };

        this._onStart = function($rootScope, $state, session) {
            var initialized = false;
            var pendingStateChange = false;
            console.log("Mollify started");

            var resumeStateChange = function() {
                var stateChange = pendingStateChange;
                if (!stateChange) stateChange = {
                    to: {
                        name: 'files'
                    }
                };
                pendingStateChange = false;
                $state.go(stateChange.to.name);
            }

            /*var onBeforeStateChange = function(e, toState, toParams, fromState, fromParams) {
                if (!views[toState.name] || !views[toState.name].onBefore) return;

                var res = views[toState.name].onBefore(toParams, fromState);
                if (res === false) {
                    e.preventDefault();
                    //TODO then what?
                } else if (typeof(res) == 'object') {
                    if (res.name) {
                        e.preventDefault();
                        $state.go(res.name, res.params);
                        return;
                    }
                }
            };*/

            // state interceptor
            $rootScope.$on('$stateChangeStart',
                function(event, toState, toParams, fromState, fromParams) {
                    console.log("STATECHANGE:" + JSON.stringify(fromState) + " -> " + JSON.stringify(toState) + " " + JSON.stringify(toParams));

                    if (!initialized) {
                        pendingStateChange = {
                            to: toState,
                            params: toParams
                        };
                        console.log("STATECHANGE CANCELLED: not initialized");
                        event.preventDefault();
                        return;
                    }

                    var s = session.get();
                    var isAuthenticated = (s && s.user);
                    var requiresAuthenticated = (toState && toState.name != 'login');

                    if (requiresAuthenticated && !isAuthenticated) {
                        console.log("STATECHANGE REJECTED: not authenticated");
                        event.preventDefault();
                        pendingStateChange = {
                            to: toState,
                            params: toParams
                        };
                        $state.go("login");
                        return;
                    }
                    //onBeforeStateChange(event, toState, toParams, fromState, fromParams);
                });

            $rootScope.$on('session/start', function() {
                resumeStateChange();
            });

            session.init().done(function() {
                initialized = true;
            });
        };
    };

    window.mollify = {
        init: function(opt) {
            var _m = new MollifyApp(angular, $.extend({}, opt, mollifyDefaults));
            _m.run();
        },
        modules: [],
        filelist: {
            columns: []
        },

        utils: {
            breakUrl: function(u) {
                var parts = u.split("?");
                return {
                    path: parts[0],
                    params: mollify.helpers.getUrlParams(u),
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

            noncachedUrl: function(url) {
                return mollify.utils.urlWithParam(url, "_=" + mollify._time);
            },

            formatDateTime: function(time, fmt) {
                var ft = time.toString(fmt);
                return ft;
            },

            parseInternalTime: function(time) {
                if (!time || time == null || typeof(time) !== 'string' || time.length != 14) return null;

                var ts = new Date();
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
                return mollify.utils.formatDateTime(time, 'yyyyMMddHHmmss');
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
        }
    }

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
}(window.jQuery, window.angular);
