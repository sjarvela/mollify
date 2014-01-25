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
		}
		
		public function hasAdminView() {
			return TRUE;
		}
				
		public function version() {
			return "1_1";
		}

		public function versionHistory() {
			return array("1_0", "1_1");
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
		
		static function registered($name, $email) {
			return new RegistrationEvent(NULL, $name, self::REGISTER, "email=".$email);
		}

		static function confirmed($name, $email) {
			return new RegistrationEvent(NULL, $name, self::CONFIRM, "email=".$email);
		}

		static function userCreated($id, $name) {
			return new RegistrationEvent($id, $name, self::USER_CREATED);
		}
		
		function __construct($id, $name, $type, $info = "") {
			parent::__construct(time(), Registration::EVENT_TYPE_REGISTRATION, $type);
			$this->user = array("user_id" => $id, "username" => $name);
			$this->info = $info;
		}
		
		public function setUser($user) {}
			
		public function details() {
			return $this->info;
		}
	}
?>