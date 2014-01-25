<?php

	/**
	 * page_database.php
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
	
	<body id="page-database">
		<?php pageBody("Installation", "1/2 Database Information"); ?>

		<div class="content">
			<p>
				Mollify will be installed in following database:
				<ul>
					<li><b>Host name:</b> <code><?php echo $installer->db()->host(); ?></code></li>
					<li><b>Database name:</b> <code><?php echo $installer->db()->database(); ?></code></li>
					<li><b>User:</b> <code><?php echo $installer->db()->user(); ?></code></li>
					<?php if ($installer->db()->tablePrefix() != '') { ?><li><b>Table prefix:</b> <code><?php echo $installer->db()->tablePrefix(); ?></code></li><?php } ?>
				</ul>
				<?php if (!$installer->db()->databaseExists()) { ?>
							<div class="clear" />
							<div class="note">
								<p><b>Note!</b> Database "<code><?php echo $installer->db()->database(); ?></code>" does not exist or user "<code><?php echo $installer->db()->user(); ?></code>" does not have access permissions.</p>
								<p>If you continue installation, installer will try to create it.</p>
								<p>If you wish to create the database and associate user permissions manually instead, click "Refresh Configuration" when ready.</p>
							</div>
				<?php } ?>				
			</p>
			<p>
				If this configuration is correct, click "Continue Installation". Otherwise, modify the configuration file and click "Refresh Configuration".
			</p>
			<p>
				<a id="button-continue" href="#" class="btn green">Continue Installation</a>
				<a id="button-refresh" href="#" class="btn blue">Refresh Configuration</a>
			</p>
		</div>
		<?php pageFooter(); ?>
	</body>
	
	<script type="text/javascript">
		function init() {
			$("#button-refresh").click(function() {
				action("refresh");
			});
			$("#button-continue").click(function() {
				action("continue_db");
			});
		}
	</script>
</html>