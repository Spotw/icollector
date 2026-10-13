CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mo_ta TEXT NOT NULL,
  loai_thong_tin TEXT NOT NULL,
  noi_dung TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
