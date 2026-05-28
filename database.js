import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'coral_exam.db');

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath);

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const runCoralSql = async (sql) => {
  try {
    // Attempt to run the SQL query using the official withcoral/coral CLI
    const sanitized = sql.replace(/"/g, '\\"');
    console.log(`[Coral SQL Runtime] Attempting execution via withcoral/coral CLI: ${sanitized}`);
    const { stdout } = await execPromise(`coral sql "${sanitized}" --format json`);
    return JSON.parse(stdout);
  } catch (err) {
    console.warn(`[Coral SQL Runtime] withcoral/coral CLI not available or errored. Falling back to native SQLite3...`);
    return new Promise((resolve, reject) => {
      db.all(sql, [], (sqliteErr, rows) => {
        if (sqliteErr) reject(sqliteErr);
        else resolve(rows);
      });
    });
  }
};

// Helper to promisify SQLite functions
export const query = {
  all: (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  }),
  get: (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),
  run: (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  }),
  exec: (sql) => new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  })
};

// Initialize Schemas
export async function initDb() {
  console.log('Initializing SQLite Database Schemas with Embedding & Multi-subject Support...');

  // Enable Cascading Deletions via SQLite foreign key support
  await query.run('PRAGMA foreign_keys = ON;');

  // Raw Schema
  await query.exec(`
    CREATE TABLE IF NOT EXISTS "pdf.documents" (
      source_id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      source_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      year INTEGER,
      upload_timestamp TEXT NOT NULL,
      checksum TEXT,
      owner_id TEXT NOT NULL
    );
  `);

  await query.exec(`
    CREATE TABLE IF NOT EXISTS "pdf.pages" (
      page_id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      raw_text TEXT NOT NULL,
      FOREIGN KEY(source_id) REFERENCES "pdf.documents"(source_id) ON DELETE CASCADE
    );
  `);

  await query.exec(`
    CREATE TABLE IF NOT EXISTS "pdf.chunks" (
      chunk_id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      page_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      start_char INTEGER NOT NULL,
      end_char INTEGER NOT NULL,
      FOREIGN KEY(source_id) REFERENCES "pdf.documents"(source_id) ON DELETE CASCADE,
      FOREIGN KEY(page_id) REFERENCES "pdf.pages"(page_id) ON DELETE CASCADE
    );
  `);

  // Enriched Intelligence Schema with Embedding storage for Flat Vector search (FAISS flat index)
  await query.exec(`
    CREATE TABLE IF NOT EXISTS "exam.questions" (
      question_id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      topic TEXT NOT NULL,
      subtopic TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      question_type TEXT NOT NULL,
      concepts_json TEXT NOT NULL,
      prerequisites_json TEXT NOT NULL,
      semantic_tags_json TEXT NOT NULL,
      pattern_type TEXT NOT NULL,
      conceptual_depth REAL NOT NULL,
      importance_score REAL NOT NULL,
      confidence REAL NOT NULL,
      embedding_json TEXT,
      FOREIGN KEY(source_id) REFERENCES "pdf.documents"(source_id) ON DELETE CASCADE
    );
  `);

  await query.exec(`
    CREATE TABLE IF NOT EXISTS "exam.textbook_chunks" (
      chunk_id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      chapter TEXT NOT NULL,
      section TEXT NOT NULL,
      main_concept TEXT NOT NULL,
      prerequisites_json TEXT NOT NULL,
      formulas_json TEXT NOT NULL,
      definitions_json TEXT NOT NULL,
      semantic_tags_json TEXT NOT NULL,
      exam_relevance_score REAL NOT NULL,
      conceptual_importance REAL NOT NULL,
      embedding_json TEXT,
      FOREIGN KEY(source_id) REFERENCES "pdf.documents"(source_id) ON DELETE CASCADE
    );
  `);

  await query.exec(`
    CREATE TABLE IF NOT EXISTS "exam.chapter_links" (
      question_id TEXT NOT NULL,
      chunk_id TEXT NOT NULL,
      link_score REAL NOT NULL,
      link_reason TEXT NOT NULL,
      PRIMARY KEY(question_id, chunk_id),
      FOREIGN KEY(question_id) REFERENCES "exam.questions"(question_id) ON DELETE CASCADE,
      FOREIGN KEY(chunk_id) REFERENCES "exam.textbook_chunks"(chunk_id) ON DELETE CASCADE
    );
  `);

  await query.exec(`
    CREATE TABLE IF NOT EXISTS "exam.topic_statistics" (
      topic TEXT PRIMARY KEY,
      frequency INTEGER NOT NULL,
      avg_marks REAL NOT NULL,
      recurrence_score REAL NOT NULL,
      trend_score REAL NOT NULL,
      importance_index REAL NOT NULL,
      chapter_roi_score REAL NOT NULL
    );
  `);

  await query.exec(`
    CREATE TABLE IF NOT EXISTS "exam.pattern_clusters" (
      cluster_id TEXT PRIMARY KEY,
      pattern_name TEXT NOT NULL,
      related_topics_json TEXT NOT NULL,
      frequency INTEGER NOT NULL,
      conceptual_type TEXT NOT NULL
    );
  `);

  await query.exec(`
    CREATE TABLE IF NOT EXISTS "exam.student_performance" (
      user_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      score REAL NOT NULL,
      accuracy REAL NOT NULL,
      weakness_score REAL NOT NULL,
      last_practiced TEXT NOT NULL,
      PRIMARY KEY(user_id, topic)
    );
  `);

  // Creating Indices
  await query.exec(`CREATE INDEX IF NOT EXISTS idx_questions_topic ON "exam.questions" (topic);`);
  await query.exec(`CREATE INDEX IF NOT EXISTS idx_textbook_chunks_chapter ON "exam.textbook_chunks" (chapter);`);
  
  console.log('SQLite Database Schemas Initialized Successfully.');
}

// Seeds complete high-fidelity multi-subject preloaded content
export async function seedSampleData() {
  console.log('Skipping database seeding to start with a clean slate for fresh custom uploads.');
}
