CREATE TABLE IF NOT EXISTS uptimeflare (
    key VARCHAR(255) PRIMARY KEY,
    value BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    monitors TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    color TEXT NOT NULL DEFAULT 'blue',
    created_at INTEGER NOT NULL,
    cancelled_at INTEGER,
    CHECK (end_time IS NULL OR end_time >= start_time)
);
CREATE INDEX IF NOT EXISTS maintenance_events_schedule ON maintenance_events (cancelled_at, end_time, start_time);
