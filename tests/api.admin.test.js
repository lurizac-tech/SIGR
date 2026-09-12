const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');

async function withServer(fn) {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await fn(baseUrl);
  } finally {
    server.close();
  }
}

async function login(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload.token;
}

test('POST /api/citas crea una cita y la devuelve', async () => {
  await withServer(async (baseUrl) => {
    const token = await login(baseUrl, 'paciente@apexflow.com', 'paciente123');

    const response = await fetch(`${baseUrl}/api/citas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        odontologo: 'Dra. Ana Gómez',
        fecha: '2026-09-15',
        hora: '11:00',
        motivo: 'Consulta de seguimiento',
        especialidad: 'Endodoncia'
      })
    });

    const payload = await response.json();
    assert.equal(response.status, 201, JSON.stringify(payload));
    assert.equal(payload.message, 'Reserva confirmada correctamente.');
    assert.ok(payload.cita && payload.cita.id);
  });
});

test('PATCH /api/citas/:id actualiza la cita', async () => {
  await withServer(async (baseUrl) => {
    const token = await login(baseUrl, 'paciente@apexflow.com', 'paciente123');

    const createResponse = await fetch(`${baseUrl}/api/citas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        odontologo: 'Dr. Luis Ramírez',
        fecha: '2026-09-18',
        hora: '12:45',
        motivo: 'Primera valoración',
        especialidad: 'Implantología'
      })
    });

    const created = await createResponse.json();
    assert.equal(createResponse.status, 201, JSON.stringify(created));

    const id = created.cita.id;
    const response = await fetch(`${baseUrl}/api/citas/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        motivo: 'Valoración actualizada',
        hora: '13:30'
      })
    });

    const payload = await response.json();
    assert.equal(response.status, 200, JSON.stringify(payload));
    assert.equal(payload.cita.motivo, 'Valoración actualizada');
    assert.equal(payload.cita.hora, '13:30');
  });
});

test('DELETE /api/citas/:id cancela la reserva', async () => {
  await withServer(async (baseUrl) => {
    const token = await login(baseUrl, 'paciente@apexflow.com', 'paciente123');

    const createResponse = await fetch(`${baseUrl}/api/citas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        odontologo: 'Dra. Sofía Morales',
        fecha: '2026-09-20',
        hora: '11:00',
        motivo: 'Ortodoncia',
        especialidad: 'Ortodoncia'
      })
    });

    const created = await createResponse.json();
    assert.equal(createResponse.status, 201, JSON.stringify(created));

    const id = created.cita.id;
    const response = await fetch(`${baseUrl}/api/citas/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const payload = await response.json();
    assert.equal(response.status, 200, JSON.stringify(payload));
    assert.equal(payload.message, 'Cita cancelada correctamente.');
  });
});
