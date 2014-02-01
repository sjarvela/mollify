$(function () {
	
    module('basic')

      test('login', function () {
		  window.fakeService.sessionInfo({"result":{"authenticated":false}});
		  stop();
		  startApp().done(function() {
		  	start();
		      ok($("#mollify-login-name").length == 1, 'username');
		      ok($("#mollify-login-password").length == 1, 'password');
		      
		      $("#mollify-login-name").val("user");
		      $("#mollify-login-password").val("pw");
		      
		      window.fakeService.authenticate({"result":{"authenticated":true,"session_id":"152ed577d28645","user_id":"1","username":"admin","user_type":"a","lang":null,"folders":[{"id":"52affca350207","name":"test","group":"","parent_id":null,"root_id":"52affca350207","path":""}],"roots":[{"id":"52affca350207","name":"test","group":"","parent_id":null,"root_id":"52affca350207","path":""}],"permissions":{}}});
		      
		      $("#mollify-login-button").trigger("click");
		      equal(window.lastAjaxRequest().data, "{\"username\":\"user\",\"password\":\"cHc=\",\"remember\":false}");
	      });
      })
})