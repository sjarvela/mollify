<?php

	/**
	 * page_instructions_configuration_create.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	 
	include("installation_page.php");
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">

<html>
	<?php pageHeader("Mollify Installation", "init"); ?>

	<body id="install-instructions-create">
		<?php pageBody("Installation", "Welcome to Mollify Installer"); ?>

		<?php if ($installer->action() == 'retry') { ?>
			<div class="error">
				<div class="title">
				Configuration file cannot be found.
				</div>
				
				<div class="details">
					Make sure that the file "<code>configuration.php</code>"
					<ul>
						<li>is located in the Mollify backend folder</li>
						<li>is accessible to PHP</li>
					</ul>
				</div>
			</div>
		<?php }?>
		
		<div class="content">
			<p>
				To begin with the installation process, first create empty configuration file called "<code>configuration.php</code>" in the Mollify backend directory. Installer will guide you through the needed steps.
			</p>
			<p>
				Alternatively, you can create full configuration based on <a href="http://code.google.com/p/mollify/wiki/Installation">Installation instructions</a>.
			</p>
			<p>
				<a id="button-retry" href="#" class="btn">Continue</a>
			</p>
		</div>
		
		<?php pageFooter(); ?>
	</body>
	
	<script type="text/javascript">
		function init() {
			$("#button-retry").click(function() {
				action("retry");
			});
		}
	</script>
</html>