$(function () {
	
    module('basic')

      test('login', function () {
		  window.fakeService.sessionInfo({"result":{"authenticated":false}});
		  stop();
		  startApp().done(function() {
		  	start();
		      ok($("#mollify-login-name"), 'username');
		      ok($("#mollify-login-password"), 'password');
		      
		      $("#mollify-login-name").val("user");
		      $("#mollify-login-password").val("pw");
		      
		      window.fakeService.authenticate({"result":{"authenticated":true,"session_id":"152ed577d28645","user_id":"1","username":"admin","user_type":"a","lang":null,"folders":[{"id":"52affca350207","name":"test","group":"","parent_id":null,"root_id":"52affca350207","path":""}],"roots":[{"id":"52affca350207","name":"test","group":"","parent_id":null,"root_id":"52affca350207","path":""}],"permissions":{}}});
		      
		      $("#mollify-login-button").click();
		      equal(JSON.stringify(window.lastAjaxRequest().data), "");
	      });
      })
})