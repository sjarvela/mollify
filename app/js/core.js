/* Core */

var core = angular.module('mollify.core', []);

core.factory('Session', [
    function() {
        var session = {
            isLogged: false,
            user: null
        };
        return session;
    }
]);

/* Login */
core.controller('LoginCtrl', [
    function() {
        console.log("login");
    }
])
