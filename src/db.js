const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/apexflow';

const db = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function run(sql, params = []) {
  const query = sql.trim();
  const isInsert = /^INSERT\b/i.test(query);
  const finalQuery = isInsert && !/\bRETURNING\b/i.test(query) ? `${query} RETURNING id` : query;

  const result = await db.query(finalQuery, params);

  if (isInsert) {
    return {
      id: result.rows[0] ? result.rows[0].id : null,
      changes: result.rowCount || 0
    };
  }

  return {
    id: null,
    changes: result.rowCount || 0
  };
}

async function get(sql, params = []) {
  const result = await db.query(sql, params);
  return result.rows[0] || null;
}

async function all(sql, params = []) {
  const result = await db.query(sql, params);
  return result.rows;
}

async function initDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient'
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS citas (
      id SERIAL PRIMARY KEY,
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

  await db.query(`
    CREATE TABLE IF NOT EXISTS historial (
      id SERIAL PRIMARY KEY,
      paciente TEXT NOT NULL,
      paciente_id INTEGER,
      odontologo TEXT NOT NULL,
      odontologo_id INTEGER NOT NULL,
      diagnostico TEXT NOT NULL,
      observaciones TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  const defaultUsers = [
    ['Administrador ApexFlow', 'admin@apexflow.com', 'admin123', 'admin'],
    ['Administrador de Operaciones', 'admin2@apexflow.com', 'admin456', 'admin'],
    ['María López', 'paciente@apexflow.com', 'paciente123', 'patient'],
    ['Carlos Ruiz', 'paciente2@apexflow.com', 'paciente456', 'patient'],
    ['Lucía García', 'paciente3@apexflow.com', 'paciente789', 'patient'],
    ['Dra. Ana Gómez', 'dentista@apexflow.com', 'dentista123', 'dentist'],
    ['Dr. Javier Torres', 'dentista2@apexflow.com', 'dentista456', 'dentist'],
    ['Dra. Sofía Ramírez', 'dentista3@apexflow.com', 'dentista789', 'dentist']
  ];

  for (const [name, email, password, role] of defaultUsers) {
    await db.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [name, email, password, role]
    );
  }

  const citaCount = await get('SELECT COUNT(*)::int AS total FROM citas');
  if (citaCount.total === 0) {
    await run(
      `INSERT INTO citas (paciente_id, paciente_nombre, odontologo, especialidad, fecha, hora, motivo, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [2, 'María López', 'Dra. Ana Gómez', 'Endodoncia', '2026-09-12', '09:30', 'Revisión general', 'Confirmada']
    );
  }
}

module.exports = { db, initDatabase, run, get, all };
