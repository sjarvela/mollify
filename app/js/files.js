! function(mollify) {
    'use strict';

    mollify.modules.files = {
        setup: function(h, ng) {
            h.registerView('files', {
                parent: "main",
                url: "^/files",
                template: "files.html",
                controller: "FilesCtrl"
            });

            var files = ng.module('mollify.main.files', []);
            files.controller('FilesCtrl', ['$scope',
                function($scope) {
                    console.log("files");
                }
            ]);
        }
    };
}(window.mollify);
