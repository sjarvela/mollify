UPDATE parameter SET value = '2_6' WHERE name = 'version';

CREATE TABLE metadata (
  item_id char(255) NOT NULL,
  key char(128) NOT NULL,
  value varchar(255) NULL,
  PRIMARY KEY (item_id, key)
);

INSERT INTO metadata (item_id, key, value) SELECT item_id, 'description' as key, description as value FROM item_description;

DROP TABLE item_description;