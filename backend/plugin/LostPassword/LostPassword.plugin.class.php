<?php

	/**
	 * LostPassword.plugin.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	
	class LostPassword extends PluginBase {
		public function setup() {
			$this->addService("lostpassword", "LostPasswordServices");
			$this->env->features()->addFeature("lost_password");
		}
				
		public function __toString() {
			return "LostPasswordPlugin";
		}
	}	
?>