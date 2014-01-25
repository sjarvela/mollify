<?php
	/**
	 * AuthenticatorLDAP.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class Mollify_Authenticator_LDAP extends Mollify_Authenticator {
		private $env;
		
		public function __construct($env) {
			$this->env = $env;
		}
		
		public function authenticate($user, $pw, $auth) {
			$server = $this->env->settings()->setting("ldap_server");
			$connString = $this->env->settings()->setting("ldap_conn_string");
			if (strpos($connString, "[USER]") === FALSE) {
				$connString = $user["name"].$connString;
			} else {
				$connString = str_replace("[USER]", $user["name"], $connString);
			}
			Logging::logDebug("Authenticating with LDAP (server ".$server."): ".$connString);
			
			$conn = @ldap_connect($server);
			if (!$conn)
				throw new ServiceException("INVALID_CONFIGURATION", "Could not connect to LDAP server");
			
			$bind = @ldap_bind($conn, $connString, $pw);
			if (!$bind) {
				Logging::logDebug("LDAP error: ".ldap_error($conn));
				return FALSE;
			}
			ldap_close($conn);
			return TRUE;
		}
	}
?>