<?php

	/**
	 * Registration.plugin.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	
	class Registration extends PluginBase {
		const EVENT_TYPE_REGISTRATION = 'registration';
		
		public function setup() {			
			$this->addService("registration", "RegistrationServices");
			$this->env->features()->addFeature("registration");
			RegistrationEvent::register($this->env->events());
			$this->env->permissions()->registerPermission("manage_user_registrations");
		}
		
		public function hasAdminView() {
			return TRUE;
		}
				
		public function version() {
			return "1_2";
		}

		public function versionHistory() {
			return array("1_0", "1_1", "1_2");
		}
		
		public function getSessionInfo() {
			return array("require_approval" => $this->getSetting("require_approval", TRUE));
		}
				
		public function __toString() {
			return "RegistrationPlugin";
		}
	}
	
	 class RegistrationEvent extends Event {
		const REGISTER = "register";
		const CONFIRM = "confirm";
		const USER_CREATED = "user_created";
					
		static function register($eventHandler) {
			$eventHandler->registerEventType(Registration::EVENT_TYPE_REGISTRATION, self::REGISTER, "User registered");
			$eventHandler->registerEventType(Registration::EVENT_TYPE_REGISTRATION, self::CONFIRM, "User registration confirmed");
			$eventHandler->registerEventType(Registration::EVENT_TYPE_REGISTRATION, self::USER_CREATED, "Registered user created");
		}
		
		static function registered($name, $email, $id, $key) {
			return new RegistrationEvent(self::REGISTER, NULL, $name, $email, $id, $key);
		}

		static function confirmed($name, $email, $id) {
			return new RegistrationEvent(self::CONFIRM, NULL, $name, $email, $id);
		}

		static function userCreated($id, $name) {
			return new RegistrationEvent(self::USER_CREATED, $id, $name);
		}

		private $registrationId;		
		private $registrationKey;
		
		function __construct($type, $userId, $username, $email = FALSE, $registrationId = FALSE, $registrationKey = FALSE) {
			parent::__construct(time(), Registration::EVENT_TYPE_REGISTRATION, $type);
			$this->user = array("user_id" => $userId, "username" => $username);
			$this->email = $email;
			if ($email) $this->user["email"] = $email;
			
			$this->registrationId = $registrationId;
			$this->registrationKey = $registrationKey;
		}
		
		public function setUser($user) {}
		
		public function details() {
			$d = "";
			if ($this->email) $d.="email=".$this->email.';';
			if ($this->subType() == self::REGISTER) $d.="registration_id=".$this->registrationId.';'."registration_key=".$this->registrationKey.';';
			if ($this->subType() == self::CONFIRM) $d.="registration_id=".$this->registrationId.';';
			return $d;
		}
					
		public function values($formatter) {
			$values = parent::values($formatter);
			if ($this->subType() == self::REGISTER) {
				$values["registration_id"] = $this->registrationId;
				$values["registration_key"] = $this->registrationKey;
				$values["registration_approve_link"] = $formatter->getClientUrl("?v=registration/approve&id=".$this->registrationId);
			} else if ($this->subType() == self::CONFIRM) {
				$values["registration_id"] = $this->registrationId;	
				$values["registration_approve_link"] = $formatter->getClientUrl("?v=registration/approve&id=".$this->registrationId);
			}
			return $values;
		}
	}
?>