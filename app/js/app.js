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
                    })

                /*$routeProvider.when('/login', {
            templateUrl: 'templates/login.html',
            controller: 'LoginCtrl'
        });
        $routeProvider.otherwise({
            redirectTo: '/login'
        });*/
            }
        ]).config(function($provide) {
            $provide.factory('settings', function() {
                return settings;
            });
        });

        app.run(function($rootScope, Session) {
            console.log("run" + Session);
            console.log(Session);

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
