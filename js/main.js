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
                    top: 20
                }
                return function(scope, element, attributes) {
                    var $popup = element.find('.popupmenu-container'); //TODO find by class under current element
                    var containerOffset = element.offset();
                    var hidePopup = function() {
                        scope.popupmenu = null;
                        $popup.css("display", "none");
                    };
                    element.bind("click", function() {
                        hidePopup();
                    });

                    scope.showPopupmenu = function($event, parent, actions) {
                        var display;
                        var $parent = $($event.target).closest(".popupmenu-parent");
                        if (!$parent || $parent.length === 0) {
                            hidePopup();
                        } else {
                            scope.popupmenu = {
                                parent: parent,
                                items: actions
                            };
                            var parentOffset = $parent.offset();

                            $popup.css({
                                top: (parentOffset.top + offset.top) + 'px',
                                left: (parentOffset.left + offset.left) + 'px',
                                display: "block"
                            }).find(".dropdown-menu").show();
                        }
                    }
                }
            });
        }
    });
}(window.mollify);
