const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'apexflow.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir SQLite:', err.message);
    return;
  }
  console.log('Conectado a SQLite:', dbPath);
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient'
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS citas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      paciente_nombre TEXT NOT NULL,
      odontologo TEXT NOT NULL,
      especialidad TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      motivo TEXT,
      estado TEXT NOT NULL DEFAULT 'Confirmada'
    )
  `);

  const count = await get('SELECT COUNT(*) AS total FROM users');
  if (count.total === 0) {
    await run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Administrador ApexFlow', 'admin@apexflow.com', 'admin123', 'admin']
    );
    await run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['María López', 'paciente@apexflow.com', 'paciente123', 'patient']
    );
  }

  const citaCount = await get('SELECT COUNT(*) AS total FROM citas');
  if (citaCount.total === 0) {
    await run(
      'INSERT INTO citas (paciente_id, paciente_nombre, odontologo, especialidad, fecha, hora, motivo, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 'María López', 'Dra. Ana Gómez', 'Endodoncia', '2026-09-12', '09:30', 'Revisión general', 'Confirmada']
    );
  }
}

module.exports = { db, initDatabase, run, get, all };
