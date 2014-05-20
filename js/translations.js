angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
/* jshint -W100 */
    gettextCatalog.setStrings('en', {"login_Login":"Login","login_Password":"Password","session_logout":"Logout"});
/* jshint +W100 */
}]);