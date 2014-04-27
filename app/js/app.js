! function($) {
    'use strict';

    var mollifyDefaults = {
        "language": {
            "default": "en",
            "options": ["en"]
        },
        "view-url": false,
        "app-element-id": "mollify",
        "service-path": "../backend/",
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

    window.mollify = {
        init: function(opt) {
            var settings = $.extend({}, opt, mollifyDefaults);

            var app = angular.module('mollify', [
                'ui.bootstrap',
                'ui.router',
                'mollify.core'
            ]).
            config(['$stateProvider', '$urlRouterProvider',
                function($stateProvider, $urlRouterProvider) {
                    // For any unmatched url, redirect to /state1
                    $urlRouterProvider.otherwise("/main");
                    //
                    // Now set up the states
                    $stateProvider
                        .state('login', {
                            url: "/login",
                            controller: "LoginCtrl",
                            templateUrl: "templates/login.html",
                            data: {
                                foo: 'bar'
                            }
                        })
                        .state('main', {
                            url: "/main",
                            templateUrl: "templates/main.html"
                        });
                }
            ]).config(function($provide) {
                $provide.factory('settings', function() {
                    return settings;
                });
            });

            app.run(function($rootScope, session) {
                console.log("run");
                console.log(session);

                // state interceptor
                $rootScope.$on('$stateChangeStart',
                    function(event, toState, toParams, fromState, fromParams) {
                        console.log("STATECHANGE:" + JSON.stringify(fromState) + " -> " + JSON.stringify(toState));
                        //TODO check authenticated
                        //event.preventDefault();

                        // transitionTo() promise will be rejected with 
                        // a 'transition prevented' error
                    });
            });
            var $root = $("#mollify").html("<div ui-view></div>");
            angular.bootstrap($root, ['mollify']);
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
}(window.jQuery);
