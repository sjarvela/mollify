! function(mollify) {
    'use strict';

    mollify.modules.push({
        id: 'mollify.main.config',

        setup: function(h, mod) {
            h.registerView('config', {
                title: "main.config.title",
                icon: "fa-cog",
                parent: "main",
                url: "^/config",
                template: "config.html",
                controller: "ConfigCtrl"
            });

            mod.controller('ConfigCtrl', ['$scope', '$state', '$stateParams',
                function($scope, $state, $stateParams) {}
            ]);
        }
    });
}(window.mollify);
