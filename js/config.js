! function(mollify) {
    'use strict';

    mollify.modules.push({
        id: 'mollify.main.config',

        setup: function(h, mod, gettext) {
            gettext("config_viewTitle");
            h.registerView('config', {
                titleKey: "config_viewTitle",
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
