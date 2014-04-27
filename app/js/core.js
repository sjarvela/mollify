/* Core */

var core = angular.module('mollify.core', []);

core.factory('Service', ['settings',
    function(settings) {
    	console.log(settings);
        return {
        	service: 'foo'
        };
    }
]);

core.factory('Session', ['Service',
    function(Service) {
    	console.log("Session");
    	console.log(Service);

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
