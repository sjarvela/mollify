! function(mollify) {
    'use strict';

    /* Main */
    mollify.modules.push({
        id: 'mollify.main',

        setup: function(h, mod, gettext) {
            h.registerView('main', {
                id: 'main',
                abstract: true,
                controller: "MainCtrl",
                template: "main.html"
            });

            mod.controller('MainCtrl', ['$scope', '$rootScope', '$state', '$stateParams', 'views', 'actions',
                function($scope, $rootScope, $state, $stateParams, views, actions) {
                    $scope.views = views.get('main');
                    $scope.activeView = views.all[$state.current.name];

                    $scope.sessionActions = actions.getType('session');

                    $rootScope.$on('$stateChangeSuccess', function(e, to) {
                        $scope.activeView = views.all[to.name];
                    });
                }
            ]);

            var ChangePasswordController = function($scope, $modalInstance, user) {
                $scope.user = user;

                $scope.ok = function() {
                    $modalInstance.close();
                };

                $scope.cancel = function() {
                    $modalInstance.dismiss('cancel');
                };
            };

            gettext('user_changePassword');
            h.registerAction({
                id: 'user/change_pw',
                type: 'session',
                titleKey: 'user_changePassword',
                handler: ["$modal",
                    function(ctx, $modal) {
                        var modalInstance = $modal.open({
                            templateUrl: 'main/change_password.html',
                            controller: ChangePasswordController,
                            user: ctx,
                            resolve: {
                                user: function() {
                                    return ctx;
                                }
                            }
                        });
                        modalInstance.result.then(function() {
                            alert("ok");
                        }, function() {});
                    }
                ]
            });

            mod.directive('popupmenuContainer', function($timeout) {
                var offset = {
                    left: 0,
                    top: -20
                }
                return function(scope, element, attributes) {
                    var $content = $('#main-popupmenu');    //TODO find by class under current element

                    scope.showPopupmenu = function($event, parent, actions) {
                        var display;
                        if (scope.popupmenu && scope.popupmenu.parent === parent) {
                            scope.popupmenu = null;
                            display = 'none';
                        } else {
                            scope.popupmenu = {
                                parent: parent,
                                items: actions
                            };
                            display = 'block';
                            $content.find(".dropdown-menu").show();
                        }

                        $content.css({
                            left: $event.clientX + offset.left + 'px',
                            top: $event.clientY + offset.top + 'px',
                            display: display
                        });
                    }
                }
            });
        }
    });
}(window.mollify);
