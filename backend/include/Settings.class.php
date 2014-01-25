<?php

	/**
	 * Settings.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class Settings {
		private $settings = array();
		
		private static $VALUES = array(
			"server_hash_salt" => "MOLLIFY_SERVER_SALT",
			"db" => FALSE,
			"plugins" => FALSE,
			"email_login" => FALSE,
			"host_public_address" => NULL,
			"session_name" => NULL,
			"session_time" => 7200,
			"timezone" => NULL,
			"enable_file_upload" => TRUE,
			"enable_folder_actions" => TRUE,
			"enable_file_upload_progress" => FALSE,
			"enable_change_password" => TRUE,
			"enable_descriptions" => FALSE,
			"enable_mail_notification" => FALSE,
			"enable_retrieve_url" => FALSE,
			"allowed_file_upload_types" => array(),
			"forbidden_file_upload_types" => array(),
			"firebug_logging" => FALSE,
			"mail_notification_from" => "Admin",
			"new_folder_permission_mask" => 0755,
			"convert_filenames" => FALSE,
			"support_output_buffer" => FALSE,
			"mail_sender_class" => "mail/MailSender.class.php",
			"url_retriever_class" => "UrlRetriever.class.php",
			"datetime_format" => "d.m.Y H:i:s",
			"mime_types" => array(),
			"authentication_methods" => array("pw"),
			"ldap_server" => NULL,
			"ldap_conn_string" => NULL,
			"upload_temp_dir" => NULL,
			"enable_thumbnails" => TRUE,
			"enable_folder_protection" => FALSE,
			"enable_guest_mode" => FALSE,
			"guest_user_id" => FALSE,
			"debug" => FALSE,
			"debug_log" => NULL,
			"mail_smtp" => NULL,
			"published_folders_root" => NULL,
			"customizations_folder" => NULL,
			"no_udev_random" => FALSE
		);
		
		function __construct($settings) {
			$def = (isset($settings) and $settings != NULL and is_array($settings));
			if (!$def) return;
			
			foreach(self::$VALUES as $s=>$v) {
				if (!array_key_exists($s, $settings)) continue;
				$this->settings[$s] = $settings[$s];
			}
		}

		public function setting($setting) {
			if (!$this->hasSetting($setting)) return self::$VALUES[$setting];
			return $this->settings[$setting];
		}
		
		public function hasSetting($setting) {
			return array_key_exists($setting, $this->settings);
		}
		
		public function getAllSettings() {
			return $this->settings;
		}
		
		function log() {
			if (!Logging::isDebug()) return;
			$logged = array_merge(array(), $this->settings);
			// remove db password
			if (Util::isArrayKey($logged, "db") and is_array($logged["db"])) {
				if (Util::isArrayKey($logged["db"], "pw")) $logged["db"]["pw"] = "";
				if (Util::isArrayKey($logged["db"], "password")) $logged["db"]["password"] = "";
			} 
			Logging::logDebug("SETTINGS: ".Util::array2str($logged));
		}
		
		public function __toString() {
			return "Settings";
		}
	}
?>
