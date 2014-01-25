<?php

	/**
	 * RegistrationServices.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class RegistrationServices extends ServicesBase {
		protected function isValidPath($method, $path) {
			return count($path) >= 1;
		}
		
		public function isAuthenticationRequired() {
			return FALSE;
		}
		
		public function processGet() {
			if (count($this->path) != 1 or $this->path[0] != 'list') throw $this->invalidRequestException();
			$this->env->authentication()->assertAdmin();
			
			$db = $this->env->db();
			$result = $db->query("select `id`, `name`, `email`, `key`, `time`, `confirmed` from ".$db->table("registration")." order by id asc")->rows();
			$this->response()->success($result);
		}

		public function processDelete() {
			if ($this->path[0] != 'list') throw $this->invalidRequestException();
			$this->env->authentication()->assertAdmin();

			if (count($this->path) == 1) {
				$data = $this->request->data;
				if (!isset($data['ids'])) throw $this->invalidRequestException();
				$ids = $data['ids'];
				if (!$ids or !is_array($ids) or count($ids) == 0) throw $this->invalidRequestException();
				
				$db = $this->env->db();
				$result = $db->update("delete from ".$db->table("registration")." where id in (".$db->arrayString($ids).")");
				$this->response()->success(array());
				return;
			} else if (count($this->path) == 2) {
				$id = $this->path[1];
				$db = $this->env->db();
				$result = $db->update("delete from ".$db->table("registration")." where id=".$db->string($id, TRUE));
				$this->response()->success(array());
				return;
			}
			throw $this->invalidRequestException();
		}
		
		public function processPost() {
			if (count($this->path) == 1 and $this->path[0] === 'create') {
				$this->processRegister();
			} else if (count($this->path) >= 1 and $this->path[0] === 'confirm') {
				if (count($this->path) == 1) $this->processConfirm();
				//else $this->processConfirmById($this->path[1]);
			} else if (count($this->path) == 2 and $this->path[0] === 'approve') {
				$requireApproval = $this->getPluginSetting("require_approval", TRUE);
				if (!$requireApproval) throw $this->invalidRequestException();
				$this->env->authentication()->assertAdmin();				
				$this->processApprove($this->path[1]);
			}
			else throw $this->invalidRequestException();
		}
		
		private function processRegister() {
			$registration = $this->request->data;
			if (!isset($registration['name']) or !isset($registration['password']) or !isset($registration['email'])) throw $this->invalidRequestException();
			$this->assertUniqueNameAndEmail($registration['name'], $registration['email']);

			$db = $this->env->db();
			$name = $registration['name'];
			$password = base64_decode($registration['password']);
			$email = $registration['email'];
			$time = date('YmdHis', time());
			$key = str_replace(".", "", uniqid("", TRUE));
			
			$db->update(sprintf("INSERT INTO ".$db->table("registration")." (`name`, `password`, `email`, `key`, `time`, `confirmed`) VALUES (%s, %s, %s, %s, %s, NULL)", $db->string($name, TRUE), $db->string($password, TRUE), $db->string($email, TRUE), $db->string($key, TRUE), $time));
			$registration["id"] = $db->lastId();
			
			//if (file_exists("plugin/Registration/custom/CustomRegistrationHandler.php")) include("custom/CustomRegistrationHandler.php");
			//if (function_exists("onRegisterCustomData")) onRegisterCustomData($registration);
			
			$this->notifyRegister($name, $email, $key, $password);
			$this->env->events()->onEvent(RegistrationEvent::registered($name, $email));
			$this->response()->success(array());
		}

		private function assertUniqueNameAndEmail($name, $email) {
			$db = $this->env->db();
			$query = "select count(id) from ".$db->table("registration")." where name=".$db->string($name,TRUE)." or email=".$db->string($email,TRUE);
			$count = $db->query($query)->value(0);
			if ($count > 0) throw new ServiceException("REQUEST_FAILED", "User already registered with same name or email");
			
			$query = "select count(id) from ".$db->table("user")." where name=".$db->string($name,TRUE)." or email=".$db->string($email,TRUE);
			$count = $db->query($query)->value(0);
			if ($count > 0) throw new ServiceException("REQUEST_FAILED", "User already exists with same name or email");
		}

		private function processConfirm() {
			$confirmation = $this->request->data;
			if (!isset($confirmation['email']) or !isset($confirmation['key'])) throw $this->invalidRequestException();
			$this->assertEmailNotRegistered($confirmation['email']);
			
			$db = $this->env->db();
			$query = "select `id`, `name`, `password`, `email` from ".$db->table("registration")." where `email`=".$db->string($confirmation['email'],TRUE)." and `confirmed` IS NULL and `key`=".$db->string($confirmation['key'],TRUE);
			$result = $db->query($query);
			
			if ($result->count() != 1) throw new ServiceException("REQUEST_FAILED", "No registration found with email and key");
			$this->confirm($result->firstRow());
		}
		
		private function assertEmailNotRegistered($email) {
			$db = $this->env->db();
			
			$query = "select count(id) from ".$db->table("user")." where email=".$db->string($email,TRUE);
			$count = $db->query($query)->value(0);
			if ($count > 0) throw new ServiceException("REQUEST_FAILED", "User already registered");
		}
		
		/*private function processConfirmById($id) {
			$this->env->authentication()->assertAdmin();
			
			$db = $this->env->db();
			$query = "select `id`, `name`, `password`, `email` from ".$db->table("registration")." where `id`=".$db->string($id,TRUE);
			$result = $db->query($query);
			
			if ($result->count() != 1) throw new ServiceException("Registration not found");
			$this->confirm($result->firstRow());
		}*/

		private function processApprove($id) {
			$this->env->authentication()->assertAdmin();
			
			$db = $this->env->db();
			$query = "select `id`, `name`, `password`, `email` from ".$db->table("registration")." where `id`=".$db->string($id,TRUE);
			$result = $db->query($query);
			
			if ($result->count() != 1) throw new ServiceException("Registration not found");
			$r = $result->firstRow();
			$this->createUser($r);
			
			$requireApproval = $this->getPluginSetting("require_approval", TRUE);
			if ($requireApproval) $this->notifyApproved($r);
			
			$this->response()->success(array());
		}
		
		private function confirm($registration) {
			$requireApproval = $this->getPluginSetting("require_approval", TRUE);
			if ($requireApproval) {
				$db = $this->env->db();
				$time = date('YmdHis', time());
				$db->update("UPDATE ".$db->table("registration")." SET `confirmed`=".$time." where `id`=".$db->string($registration['id'],TRUE));
				$this->env->events()->onEvent(RegistrationEvent::confirmed($registration['name'], $registration['email']));
			} else {
				$this->env->events()->onEvent(RegistrationEvent::confirmed($registration['name'], $registration['email']));
				$this->createUser($registration);
			}

			$this->response()->success(array("require_approval" => $requireApproval));
		}
		
		private function createUser($registration) {
			$db = $this->env->db();
			$plugin = $this->env->plugins()->getPlugin("Registration");
			$permission = $plugin->getSetting("permission", Authentication::PERMISSION_VALUE_READONLY);
			
			$lang = $this->getPluginSetting("language", NULL);
			$id = $this->env->configuration()->addUser($registration['name'], $lang, $registration['email'], $permission, NULL);
			$this->env->configuration()->storeUserAuth($id, $registration['name'], NULL, $registration['password']);
			$db->update("DELETE from ".$db->table("registration")." where `id`=".$db->string($registration['id'],TRUE));
			
			$this->addUserProperties($id, $registration['name'], $plugin);
			
			//if (file_exists("plugin/Registration/custom/CustomRegistrationHandler.php")) include("custom/CustomRegistrationHandler.php");
			//if (function_exists("onConfirmCustomData")) onConfirmCustomData($registration, $id);
			
			$this->env->events()->onEvent(RegistrationEvent::userCreated($id, $registration['name']));
		}
		
		private function addUserProperties($id, $name, $plugin) {
			$groups = $plugin->getSetting("groups", array());
			if (count($groups) > 0) {
				$existing = array();
				foreach ($this->env->configuration()->getAllUserGroups() as $group) {
					if (in_array($group['id'], $groups)) $existing[] = $group['id'];
				}
				
				if (count($existing) > 0)
					$this->env->configuration()->addUsersGroups($id, $existing);
			}
			
			$folders = $plugin->getSetting("folders", array());
			if (count($folders) > 0) {
				$existing = array();
				foreach ($this->env->configuration()->getFolders() as $folder)
					if (in_array($folder['id'], $folders)) $existing[] = $folder['id'];

				if (count($existing) > 0)
					$this->env->configuration()->addUserFolders($id, $existing);
			}
			
			$userFolder = $plugin->getSetting("user_folder", NULL);
			if ($userFolder == NULL) return;
			
			// automatic user folder
			if (!isset($userFolder["path"])) {
				Logging::logError("Registration: missing configuration for user folder");
				return;
			}
			$basePath = $userFolder["path"];
			$folderName = $name;
			if (isset($userFolder["folder_name"])) $folderName = $userFolder["folder_name"];
			$folderPath = rtrim($basePath, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$name;
			
			$fs = $this->env->filesystem()->filesystem(array("path" => $folderPath, "name" => $folderName), FALSE);
			if ($fs->exists()) {
				Logging::logError("Registration: user folder [".$folderPath."] already exists, not added");
				return;
			}
			if (!$fs->create()) {
				Logging::logError("Registration: user folder [".$folderPath."] could not be created, not added");
				return;
			}
			
			$folderId = $this->env->configuration()->addFolder($name, $folderPath);
			$this->env->configuration()->addUserFolder($id, $folderId, $folderName);
			
			$fs = $this->env->filesystem()->filesystem(array("id" => $folderId, "path" => $folderPath, "name" => $folderName), FALSE);
			$this->env->configuration()->addItemPermission($fs->root()->id(), Authentication::PERMISSION_VALUE_READWRITE, $id);
			
			if (isset($userFolder["add_to_users"]) and count($userFolder["add_to_users"]) > 0) {
				$users = $userFolder["add_to_users"];
				$existing = array();
				foreach ($this->env->configuration()->getAllUsers() as $user) {
					if (in_array($user['id'], $users)) $existing[] = $user['id'];
				}
				
				if (count($existing) > 0)
					$this->env->configuration()->addFolderUsers($folderId, $existing);
			}
		}
		
		private function notifyRegister($name, $email, $key, $password) {
			$texts = $this->env->resources()->loadTexts("PluginRegistrationMessages", dirname(__FILE__));
			$link = $this->env->getClientUrl("?v=registration/confirm&email=".urlencode($email)."&key=".$key);
			$values = array("name" => $name, "email" => $email, "link" => $link, "password" => $password);
			
			$subject = Util::replaceParams($texts["registration_notification_subject"], $values);
			$msg = Util::replaceParams($texts["registration_notification_message"], $values);
			$recipient = array(array("name" => $name, "email" => $email));
			
			$this->env->mailer()->send($recipient, $subject, $msg);
		}

		private function notifyApproved($registration) {
			$texts = $this->env->resources()->loadTexts("PluginRegistrationMessages", dirname(__FILE__));
			if (!isset($texts["registration_notification_approved_subject"]) or !isset($texts["registration_notification_approved_message"])) {
				Logging::logDebug("No approved messages found, notification mail not sent");
				return;
			}
			
			$loginLink = $this->env->getClientUrl("");
			$values = array("name" => $registration["name"], "email" => $registration["email"], "link" => $loginLink);
			
			$subject = Util::replaceParams($texts["registration_notification_approved_subject"], $values);
			$msg = Util::replaceParams($texts["registration_notification_approved_message"], $values);
			$recipient = array(array("name" => $registration["name"], "email" => $registration["email"]));
			
			$this->env->mailer()->send($recipient, $subject, $msg);
		}
		
		private function getPluginSetting($k, $dv) {
			$plugin = $this->env->plugins()->getPlugin("Registration");
			return $plugin->getSetting($k, $dv);
		}
				
		public function __toString() {
			return "RegistrationServices";
		}
	}
?>