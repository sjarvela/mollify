<?php

	/**
	 * page_configuration.php
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
	
	<body id="page-mysql-configuration">
		<?php pageBody("Installation", "PDO Database Configuration"); ?>
		<?php if ($installer->action() === 'continue') { ?>
		<div class="error">
			<div class="title">	
				No database configuration found.
			</div>
			<div class="details">
				PDO database configuration is missing or it is not complete. Make sure that the configuration is done according to the instructions below. At minimum, database user and password must be defined.
			</div>
		</div>
		<?php } ?>
		
		<div class="content">
			<p>
				Installer needs the database connection information defined in the configuration file "<code>configuration.php</code>":
				<ul>
					<li>PDO connection string (see <a href="http://www.php.net/manual/en/pdo.connections.php">http://www.php.net/manual/en/pdo.connections.php</a>)</li>
					<li>User</li>
					<li>Password</li>
					<li>Table prefix (optional)</li>
				</ul>
				
				For more information, see <a href="http://code.google.com/p/mollify/wiki/Installation">Installation instructions</a>.
			</p>
			<p>	
				An example configuration when connecting to MySQL server with PDO:
				<div class="example code">
					&lt;?php<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;$CONFIGURATION = array(<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;db&quot; => array(<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;type&quot; => &quot;pdo&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;str&quot; => &quot;<span class="value">mysql:host=localhost;dbname=mollify</span>&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;user&quot; => &quot;<span class="value">[DB_USERNAME]</span>&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;password&quot; => &quot;<span class="value">[DB_PASSWORD]</span>&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;table_prefix&quot; => &quot;<span class="value">mollify_</span>&quot;<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;);<br/>
					?&gt;
				</div>
				<!--div class="example code">
					&lt;?php<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;$CONFIGURATION_TYPE = &quot;<span class="value">pdo</span>&quot;;<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;$PDO_STRING = &quot;<span class="value">mysql:host=localhost;dbname=mollify</span>&quot;;<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;$DB_USER = &quot;<span class="value">[DB_USERNAME]</span>&quot;;<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;$DB_PASSWORD = &quot;<span class="value">[DB_PASSWORD]</span>&quot;;<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;$DB_TABLE_PREFIX = &quot;<span class="value">mollify_</span>&quot;;<br/>
					?&gt;
				</div-->
			</p>
			<p>
				Edit the configuration and click "Continue".
			</p>
			<p>
				<a id="button-continue" href="#" class="btn">Continue</a>
			</p>			
		</div>
		
		<?php pageFooter(); ?>
	</body>
	
	<script type="text/javascript">
		function init() {
			$("#button-continue").click(function() {
				action("continue");
			});
		}
	</script>
</html>
