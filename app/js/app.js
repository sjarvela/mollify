'use strict';

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
]);

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