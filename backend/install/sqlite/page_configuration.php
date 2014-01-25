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
		<?php pageBody("Installation", "SQLite Database Configuration"); ?>
		<?php if ($installer->action() === 'continue') { ?>
		<div class="error">
			<div class="details">
				SQLite database file is not set.
			</div>
		</div>
		<?php } ?>
		
		<div class="content">
			<p>
				Installer needs the SQLite database file location set in "<code>configuration.php</code>":
				
				For more information, see <a href="http://code.google.com/p/mollify/wiki/Installation">Installation instructions</a>.
			</p>
			<p>	
				An example configuration:
				<div class="example code">
					&lt;?php<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;$CONFIGURATION = array(<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;db&quot; => array(<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;type&quot; => &quot;sqlite&quot;,<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;file&quot; => &quot;<span class="value">[SQLITE FILE PATH HERE]</span>&quot;<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)<br/>
					&nbsp;&nbsp;&nbsp;&nbsp;);<br/>
					?&gt;
				</div>
			</p>
			<p>
				When the configuration is updated, click "Continue".
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