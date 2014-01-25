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
		<?php pageBody("Installation", "MySQL Database Configuration"); ?>
		<?php if ($installer->action() === 'continue' and !$installer->hasError()) { ?>
		<div class="error">
			<div class="title">	
				No database configuration found.
			</div>
			<div class="details">
				MySQL database configuration is missing or it is not complete. Make sure that the configuration is done according to the instructions below. At minimum, database user and password must be defined.
			</div>
		</div>
		<?php } ?>
		
		<div class="content">
			<p>
				Installer needs the database connection information defined in the configuration file "<code>configuration.php</code>":
				<ul>
					<li>User</li>
					<li>Password</li>
					<li>Host name (optional, by default "localhost")</li>
					<li>Database name (optional, by default "mollify")</li>
					<li>Port (for remote MySQL servers, optional)</li>
					<li>Socket (for local MySQL servers, optional)</li>
					<li>Table prefix (optional)</li>
					<li>Charset (optional)</li>
				</ul>
				
				For more information, see <a href="http://code.google.com/p/mollify/wiki/Installation">Installation instructions</a>.
			</p>
			<p>	
				An example configuration:
				<div class="example code">
					&lt;?php<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;$CONFIGURATION = array(<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;db&quot; => array(<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;type&quot; => &quot;mysql&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;user&quot; => &quot;<span class="value">[MYSQL_USERNAME]</span>&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;password&quot; => &quot;<span class="value">[MYSQL_PASSWORD]</span>&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;host&quot; => &quot;<span class="value">localhost</span>&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;database&quot; => &quot;<span class="value">mollify</span>&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;table_prefix&quot; => &quot;<span class="value">mollify_</span>&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;charset&quot; => &quot;<span class="value">utf8</span>&quot;<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;);<br/>
					?&gt;
				</div>
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
