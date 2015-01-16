UPDATE parameter SET value = '2_6' WHERE name = 'version';

CREATE TABLE `{TABLE_PREFIX}metadata` (
  `item_id` char(255) NOT NULL,
  `key` char(128) NOT NULL,
  `value` varchar(255) NULL,
  PRIMARY KEY (`item_id`, `key`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Mollify metadata';

INSERT INTO `{TABLE_PREFIX}metadata` (item_id, key, value) SELECT item_id, 'description' as key, description as value FROM `{TABLE_PREFIX}item_description`;

DROP TABLE `{TABLE_PREFIX}item_description`;