<?php

	/**
	 * page_update.php
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
	<?php pageHeader("Mollify Update", "init"); ?>
	
	<body id="page-mysql-update-needed">
		<?php pageBody("Update", "Database Update"); ?>
		<div class="content">
			<p>
				<?php echo $installer->updateSummary(); ?>
			</p>
			<p>
				Click "Update" to start update.
			</p>
			<p>
				<a id="button-update" href="#" class="btn green">Update</a>
			</p>
		</div>
		<?php pageFooter(); ?>
	</body>
	
	<script type="text/javascript">
		function init() {
			$("#button-update").click(function() {
				action("update");
			});
		}
	</script>
</html>