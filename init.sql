CREATE TABLE IF NOT EXISTS uptimeflare (
    key VARCHAR(255) PRIMARY KEY,
    value BLOB NOT NULL
);

REPLACE INTO uptimeflare (key, value) VALUES ('state', '{"test": 1}');

INSERT INTO uptimeflare (key, value) VALUES ('state', '{"test": 1}') ON CONFLICT(key) DO UPDATE SET value = excluded.value;
