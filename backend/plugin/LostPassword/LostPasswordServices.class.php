<?php

	/**
	 * LostPasswordServices.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class LostPasswordServices extends ServicesBase {
		protected function isValidPath($method, $path) {
			return count($path) == 0;
		}
		
		public function isAuthenticationRequired() {
			return FALSE;
		}
		
		public function processPost() {
			$data = $this->request->data;
			if (!isset($data['email']))
				throw $this->invalidRequestException();
			
			$user = $this->getUser($data['email']);
			if (!$user) {
				$this->response()->fail(301, "NO_SUCH_USER");
				return;
			}
			
			$pw = $this->createNewPassword();
			$this->env->configuration()->updateUserAuth($user['id'], $user['name'], $pw, FALSE);
			/*if (!$this->env->configuration()->changePassword($user['id'], $pw)) {
				$this->response()->fail(108, "PASSWORD_RESET_FAILED");
				return;
			}*/
			
			$this->notify($data['email'], $user, $pw);
			$this->response()->success(array());
		}
		
		private function getUser($email) {
			$db = $this->env->db();
			$query = "select `id`, `name` from ".$db->table("user")." where `email`=".$db->string($email,TRUE);
			$result = $db->query($query);
			if ($result->count() != 1) return NULL;
			return $result->firstRow();
		}
		
		private function createNewPassword() {
			$chars = "abcdefghijkmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			srand((double)microtime()*1000000);
			$count = 0;
			$result = '';

			while (TRUE) {
				$result .= substr($chars, rand() % 58, 1);
				if ($count++ > 8) break;
		    }
		    return $result;
		}
		
		private function notify($email, $user, $pw) {
			$texts = $this->env->resources()->loadTexts("PluginLostPasswordMessages", dirname(__FILE__));
			$values = array("email" => $email, "name" => $user["name"], "password" => $pw);
			
			$subject = $this->replaceParams($texts["reset_password_notification_subject"], $values);
			$msg = $this->replaceParams($texts["reset_password_notification_message"], $values);
			$recipient = array(array("name" => NULL, "email" => $email));
			$this->env->mailer()->send($recipient, $subject, $msg);
		}
		
		private function replaceParams($text, $values) {
			foreach($values as $k => $v)
				$text = str_replace('%'.$k.'%', $v, $text);
			return $text;
		}
				
		public function __toString() {
			return "LostPasswordServices";
		}
	}
?>