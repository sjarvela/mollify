$(function () {
	var roots = [
		{"id":"r1","root_id":"r1","parent_id":"","name":"root_1","path":"","is_file":false},
		{"id":"r2","root_id":"r2","parent_id":"","name":"root_2","path":"","is_file":false}
	];
	var root1_files = [
		{"id":"r1f1","root_id":"r1","parent_id":"r1","name":"file1.txt","path":"file1.txt","is_file":true,"size":"2969919","extension":"txt"},
		{"id":"r1f2","root_id":"r1","parent_id":"r1","name":"file2.pdf","path":"file2.pdf","is_file":true,"size":"12969919","extension":"pdf"}
	];
	
    module('basic')

      test('login', function () {		  
		  stop();
		  
		  reload().done(function() {
			  start();
			  
			  equal(window._ajaxRequests.length, 1);
			  equal(window._ajaxRequests[0].url, "backend/r.php/session/info/");
			  
		      ok($("#mollify-login-name").length, 'username');
		      ok($("#mollify-login-password").length, 'password');
		      
		      $("#mollify-login-name").val("user");
		      $("#mollify-login-password").val("pw");
		      
		      window.service.whenAuthenticate(window.testData.sessionInfo_admin(roots));		      
		      
		      window.service.whenFolderInfo("r1", {
		      	folder: roots[0],
		      	folders:[],
		      	files: root1_files,
		      	permissions:{},
		      	data:{},
		      	hierarchy:[ roots[0] ]
		      });
		      
		      $("#mollify-login-button").trigger("click");
		      equal(window._ajaxRequests.length, 3);
		      
		      equal(window._ajaxRequests[1].url, "backend/r.php/session/authenticate/");
		      equal(window._ajaxRequests[1].data, "{\"username\":\"user\",\"password\":\"cHc=\",\"remember\":false}");
		      
		      equal(window._ajaxRequests[2].url, "backend/r.php/filesystem/r1/info/?h=1");
			  ok($("#mollify-mainview-main").length, 'mainview');
	      });
      })
      
      test('mainview', function () {
		  window.service.whenSessionInfo(window.testData.sessionInfo_admin(roots));
	      window.service.whenFolderInfo("r1", {
	      	folder: roots[0],
	      	folders:[],
	      	files: root1_files,
	      	permissions:{},
	      	data:{},
	      	hierarchy:[ roots[0] ]
	      });

		  stop();
		  
		  reload().done(function() {
		  	start();
		      equal(window._ajaxRequests.length, 2);
		      
		      equal(window._ajaxRequests[0].url, "backend/r.php/session/info/");
		      equal(window._ajaxRequests[1].url, "backend/r.php/filesystem/r1/info/?h=1");
			  ok($("#mollify-mainview-main").length, 'mainview');
	      });
      })
})