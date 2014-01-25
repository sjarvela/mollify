<?php

	/**
	 * Copyright (c) 2008- Samuli JŠrvelŠ
	 *
	 * All rights reserved. This program and the accompanying materials
	 * are made available under the terms of the Eclipse Public License v1.0
	 * which accompanies this distribution, and is available at
	 * http://www.eclipse.org/legal/epl-v10.html. If redistributing this code,
	 * this entire header must remain intact.
	 */
	 
	 include("install/installation_page.php");
	 
	 function version($ver) {
	 	return str_replace("_", ".", $ver);
	 }
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">

<html>
	<?php pageHeader("Mollify Update"); ?>
	
	<body id="page-mysql-update_success">
		<?php pageBody("Update", "Update Complete"); ?>
		<div class="content">
			<p>
				Mollify was successfully updated with following updates:
				<ul><?php
					$updates = $installer->data("updates");
					foreach($updates as $update)
						echo "<li>".$update."</li>";
				?></ul>
			</p>	
		</div>
		<?php pageFooter(); ?>
	</body>
</html>