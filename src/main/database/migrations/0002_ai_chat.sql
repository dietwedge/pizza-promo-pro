CREATE TABLE ai_chat_threads (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000), updated_at INTEGER NOT NULL DEFAULT (unixepoch()*1000));
CREATE TABLE ai_chat_messages (id TEXT PRIMARY KEY NOT NULL, thread_id TEXT NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK(role IN ('user','assistant')), content TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000), updated_at INTEGER NOT NULL DEFAULT (unixepoch()*1000));
CREATE INDEX ai_chat_messages_thread_time_idx ON ai_chat_messages(thread_id,created_at);
PRAGMA user_version = 2;
