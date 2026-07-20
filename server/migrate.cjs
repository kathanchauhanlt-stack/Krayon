const Database = require('better-sqlite3');
const db = Database('server/ainime.db');

// Add layout column to pages
try {
  db.exec("ALTER TABLE pages ADD COLUMN layout TEXT NOT NULL DEFAULT 'grid-2x2'");
  console.log('✅ layout column added to pages');
} catch(e) {
  console.log('pages.layout already exists:', e.message);
}

// Create comic_specs table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS comic_specs (
      id TEXT PRIMARY KEY,
      comic_id TEXT REFERENCES comics(id) ON DELETE CASCADE,
      spec_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log('✅ comic_specs table ready');
} catch(e) {
  console.log('comic_specs error:', e.message);
}

console.log('Migration complete.');
db.close();
