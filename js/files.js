! function(mollify) {
    'use strict';

    mollify.modules.push({
        id: 'mollify.main.files',

        setup: function(h, mod) {
            var viewData = {
                type: 1
            };

            h.registerView('files', {
                parent: "main",
                url: "^/files",
                template: "files.html",
                controller: "FilesCtrl",
                subviews: {
                    'sidebar': {
                        template: 'files-sidebar.html'
                    },
                    'filelist@files': {
                        template: function() {
                            if (viewData.type == 1)
                                return 'files-list-table.html';
                            else if (viewData.type == 2)
                                return 'files-list-icon.html';
                        },
                        controller: function() {
                            if (viewData.type == 1)
                                return 'FilesListTableCtrl';
                            else if (viewData.type == 2)
                                return 'FilesListIconCtrl';
                        }
                    }
                }
            });

            mod.controller('FilesCtrl', ['$scope', '$state', '$stateParams',
                function($scope, $state, $stateParams) {
                    var reload = function() {
                        $state.transitionTo($state.current, $stateParams, {
                            reload: true,
                            inherit: false,
                            notify: true
                        });
                    };

                    $scope.data = viewData;
                    $scope.setViewType = function(t) {
                        viewData.type = t;
                        reload();
                    }
                    console.log("files");
                }
            ]);

            mod.controller('FilesListTableCtrl', ['$scope',
                function($scope) {
                    console.log("table ctrl");
                }
            ]);

            mod.controller('FilesListIconCtrl', ['$scope',
                function($scope) {
                    console.log("icon ctrl");
                }
            ]);
        }
    });
}(window.mollify);
