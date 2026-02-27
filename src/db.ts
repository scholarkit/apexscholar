import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'research.db');
console.log('[DB] Connecting to:', dbPath);
export let db = new Database(dbPath);

export const closeDatabase = () => {
  db.close();
};

export const reopenDatabase = () => {
  db = new Database(dbPath);
};

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    content TEXT NOT NULL,
    entry_type TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    path TEXT NOT NULL,
    date_added TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS insights (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);
console.log('[DB] Database schema initialized');

export interface Entry {
  id: string;
  date: string;
  content: string;
  entry_type: string;
  startDate?: string;
  endDate?: string;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  path: string;
  date_added: string;
}

export interface Insight {
  id: string;
  content: string;
  created_at: string;
}

export const getEntries = (): Entry[] => {
  return db.prepare('SELECT * FROM entries ORDER BY date DESC').all() as Entry[];
};

export const getEntry = (id: string): Entry | undefined => {
  return db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as Entry | undefined;
};

export const createEntry = (entry: Entry): void => {
  db.prepare('INSERT INTO entries (id, date, content, entry_type) VALUES (@id, @date, @content, @entry_type)').run(entry);
};

export const updateEntry = (entry: Entry): void => {
  db.prepare('UPDATE entries SET date = @date, content = @content, entry_type = @entry_type WHERE id = @id').run(entry);
};

export const deleteEntry = (id: string): void => {
  db.prepare('DELETE FROM entries WHERE id = ?').run(id);
};

export const getResources = (): Resource[] => {
  return db.prepare('SELECT * FROM resources ORDER BY date_added DESC').all() as Resource[];
};

export const createResource = (resource: Resource): void => {
  db.prepare('INSERT INTO resources (id, name, type, path, date_added) VALUES (@id, @name, @type, @path, @date_added)').run(resource);
};

export const deleteResource = (id: string): void => {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as Resource | undefined;
  if (resource) {
    try {
      fs.unlinkSync(path.resolve(process.cwd(), resource.path));
    } catch (e) {
      console.error('Failed to delete file', e);
    }
    db.prepare('DELETE FROM resources WHERE id = ?').run(id);
  }
};

export const getLatestInsight = (): Insight | undefined => {
  console.log('[DB] getLatestInsight called');
  const result = db.prepare('SELECT * FROM insights ORDER BY created_at DESC LIMIT 1').get() as Insight | undefined;
  console.log('[DB] getLatestInsight - Found:', result ? 'Yes' : 'No');
  return result;
};

export const getInsights = (): Insight[] => {
  return db.prepare('SELECT * FROM insights ORDER BY created_at DESC').all() as Insight[];
};

export const createInsight = (content: string): void => {
  console.log('[DB] createInsight called, content length:', content.length);
  const id = Math.random().toString(36).substring(2, 11);
  const created_at = new Date().toISOString();
  try {
    const result = db.prepare('INSERT INTO insights (id, content, created_at) VALUES (?, ?, ?)').run(id, content, created_at);
    console.log('[DB] createInsight - Success, rows affected:', result.changes);
  } catch (err) {
    console.error('[DB] createInsight - Error:', err);
    throw err;
  }
};
