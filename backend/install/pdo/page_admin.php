<?php

	/**
	 * page_admin.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	include("install/installation_page.php");
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">

<html>
	<?php pageHeader("Mollify Installation", "init"); ?>
	
	<body id="page-admin">
		<?php pageBody("Installation", "2/2 Administrator User"); ?>

		<div class="content">
			<h2>
				Mollify requires an administrator user:
			</h2>
			<p>
				<form id="admin-user">
					<div class='user-data' id='admin-username'>
						<div class='title'>User name:</div>
						<input id='username' class='value' type='text' name='user' value=''>
						<div class="validation-hint" />
					</div>
					<div class='user-data' id='admin-password'>
						<div class='title'>Password:</div>
						<input id='password' class='value' type='password' name='password' value=''>
						<div class="validation-hint" />
					</div>
				</form>
			</p>
			<div class="clear"/>
			<p class="info">
				Enter username and password, and click "Install" to finish installation.
			</p>
			<p>
				<a id="button-install" href="#" class="btn green">Install</a>
			</p>
		</div>
		<?php pageFooter(); ?>
	</body>
	
	<script type="text/javascript">
		function validate() {
			$(".user-data").removeClass("invalid");
			$(".validation-hint").html("");
		
			var result = true;
			if ($("#username").val().length == 0) {
				$("#admin-username").addClass("invalid");
				$("#admin-username > .validation-hint").html("Username cannot be empty");
				result = false;
			}
			if ($("#password").val().length == 0) {
				$("#admin-password").addClass("invalid");
				$("#admin-password > .validation-hint").html("Password cannot be empty");
				result = false;
			}
			return result;
		}
		
		function init() {
			$("#button-install").click(function() {
				if (!validate()) return;
				
				setData("name", $("#username").val());
				setData("password", $("#password").val());
				action("install");
			});
		}
	</script>
</html>