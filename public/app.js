const API_URL = 'http://localhost:3000';
const TOKEN_KEY = 'apexflow_token';

const loginCard = document.getElementById('loginCard');
const workspace = document.getElementById('workspace');
const quickButtons = document.querySelectorAll('.quick-btn');
const loginForm = document.getElementById('loginForm');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const statusBadge = document.querySelector('.status-badge');
const citasTableBody = document.querySelector('#citas-panel tbody');
const adminTableBody = document.querySelector('#admin-panel tbody');

let currentUser = null;

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setAuthHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...setAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Error en la solicitud');
  }

  return payload;
}

function showAlert(type, message) {
  const isSuccess = type === 'success';
  const toast = document.createElement('div');

  toast.style.position = 'fixed';
  toast.style.right = '20px';
  toast.style.bottom = '20px';
  toast.style.zIndex = '99999';
  toast.style.borderRadius = '12px';
  toast.style.padding = '12px 16px';
  toast.style.fontWeight = '700';
  toast.style.color = '#fff';
  toast.style.background = isSuccess ? '#19a974' : '#ef4444';
  toast.style.boxShadow = '0 12px 25px rgba(0,0,0,0.14)';
  toast.textContent = `${isSuccess ? 'Éxito' : 'Error'}: ${message}`;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function renderCitas(citas = []) {
  if (!citasTableBody) return;
  citasTableBody.innerHTML = '';

  if (!citas.length) {
    citasTableBody.innerHTML = '<tr><td colspan="5">No hay citas registradas.</td></tr>';
    return;
  }

  citas.forEach((cita) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cita.odontologo}</td>
      <td>${cita.fecha}</td>
      <td>${cita.hora}</td>
      <td>${cita.especialidad || 'Consulta general'}</td>
      <td>
        <span class="status-pill ${cita.estado === 'Confirmada' ? 'status-confirmed' : 'status-cancelled'}">${cita.estado}</span>
      </td>
    `;
    citasTableBody.appendChild(row);
  });
}

function renderAdminCitas(citas = []) {
  if (!adminTableBody) return;
  adminTableBody.innerHTML = '';

  if (!citas.length) {
    adminTableBody.innerHTML = '<tr><td colspan="6">No hay citas para administrar.</td></tr>';
    return;
  }

  citas.forEach((cita) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cita.pacienteNombre || 'Paciente'}</td>
      <td>${cita.odontologo}</td>
      <td>${cita.fecha}</td>
      <td>${cita.hora}</td>
      <td><span class="status-pill ${cita.estado === 'Confirmada' ? 'status-confirmed' : 'status-cancelled'}">${cita.estado}</span></td>
      <td>
        <button class="table-action edit" data-action="edit" data-id="${cita.id}">Editar</button>
        <button class="table-action cancel" data-action="cancel" data-id="${cita.id}">Cancelar</button>
      </td>
    `;
    adminTableBody.appendChild(row);
  });
}

async function cargarCitas() {
  try {
    const data = await apiRequest('/api/citas');
    renderCitas(data.citas || []);
  } catch (error) {
    console.error(error);
    showAlert('error', error.message);
  }
}

async function cargarAdminCitas() {
  try {
    const data = await apiRequest('/api/admin/citas');
    renderAdminCitas(data.citas || []);
  } catch (error) {
    console.error(error);
    showAlert('error', error.message);
  }
}

async function cargarDisponibilidad() {
  const doctorSelect = document.querySelector('#agenda-panel select');
  const fechaInput = document.querySelector('#agenda-panel input[type="date"]');
  const horarioSelect = document.querySelectorAll('#agenda-panel select')[2];

  if (!doctorSelect || !fechaInput || !horarioSelect) return;

  const odontologo = doctorSelect.value;
  const fecha = fechaInput.value;

  if (!odontologo || !fecha) return;

  try {
    const data = await apiRequest(`/api/disponibilidad?odontologo=${encodeURIComponent(odontologo)}&fecha=${encodeURIComponent(fecha)}`);
    horarioSelect.innerHTML = '';

    if (!data.disponibilidad || data.disponibilidad.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Sin disponibilidad';
      horarioSelect.appendChild(option);
      return;
    }

    data.disponibilidad.forEach((hora) => {
      const option = document.createElement('option');
      option.value = hora;
      option.textContent = hora;
      horarioSelect.appendChild(option);
    });
  } catch (error) {
    console.error(error);
    showAlert('error', error.message);
  }
}

function applyRolePermissions(role) {
  const historialTab = document.querySelector('.tab-btn[data-tab="historial"]');
  const historialPanel = document.getElementById('historial-panel');
  const adminTab = document.querySelector('.tab-btn[data-tab="admin"]');

  if (!historialTab) return;

  if (role === 'patient') {
    historialTab.style.display = 'none';
    if (historialPanel) historialPanel.remove();

    if (adminTab) adminTab.style.display = 'none';

    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && (activeTab.dataset.tab === 'historial' || activeTab.dataset.tab === 'admin')) {
      const agendaTab = document.querySelector('.tab-btn[data-tab="agenda"]');
      if (agendaTab) agendaTab.click();
    }
  } else {
    historialTab.style.display = 'inline-flex';
    if (adminTab) adminTab.style.display = 'inline-flex';
  }
}

async function loginWithCredentials(email, password) {
  try {
    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    localStorage.setItem(TOKEN_KEY, result.token);
    currentUser = result.user;

    if (statusBadge) {
      statusBadge.innerHTML = '<span class="status-dot"></span> Sesión activa';
    }

    loginCard.style.display = 'none';
    workspace.classList.add('active');
    applyRolePermissions(currentUser.role);
    await cargarDisponibilidad();
    await cargarCitas();
    if (currentUser.role === 'admin') {
      await cargarAdminCitas();
    }

    return result;
  } catch (error) {
    showAlert('error', error.message);
    throw error;
  }
}

quickButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const role = button.dataset.role;
    const email = role === 'dentist' ? 'admin@apexflow.com' : 'paciente@apexflow.com';
    const password = role === 'dentist' ? 'admin123' : 'paciente123';

    document.getElementById('email').value = email;
    document.getElementById('password').value = password;

    loginWithCredentials(email, password);
  });
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showAlert('error', 'Debes ingresar email y contraseña.');
    return;
  }

  await loginWithCredentials(email, password);
});

function bindAgendaEvents() {
  const doctorSelect = document.querySelector('#agenda-panel select');
  const fechaInput = document.querySelector('#agenda-panel input[type="date"]');

  if (doctorSelect) {
    doctorSelect.addEventListener('change', cargarDisponibilidad);
  }

  if (fechaInput) {
    fechaInput.addEventListener('change', cargarDisponibilidad);
  }
}

async function reservarCita() {
  const doctorSelect = document.querySelector('#agenda-panel select');
  const fechaInput = document.querySelector('#agenda-panel input[type="date"]');
  const horarioSelect = document.querySelectorAll('#agenda-panel select')[2];
  const motivoInput = document.querySelector('#agenda-panel textarea');

  if (!doctorSelect || !fechaInput || !horarioSelect) {
    showAlert('error', 'Completa la información de la cita.');
    return;
  }

  const payload = {
    odontologo: doctorSelect.value,
    fecha: fechaInput.value,
    hora: horarioSelect.value,
    motivo: motivoInput ? motivoInput.value : 'Consulta general',
    especialidad: doctorSelect.value.includes('Ana') ? 'Endodoncia' : 'Consulta general'
  };

  if (!payload.odontologo || !payload.fecha || !payload.hora) {
    showAlert('error', 'Selecciona odontólogo, fecha y hora disponibles.');
    return;
  }

  try {
    const result = await apiRequest('/api/citas', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showAlert('success', result.message || 'Reserva confirmada correctamente.');
    await cargarDisponibilidad();
    await cargarCitas();
  } catch (error) {
    showAlert('error', error.message);
  }
}

const agendaButton = document.querySelector('#agenda-panel .primary-btn');
if (agendaButton) {
  agendaButton.addEventListener('click', reservarCita);
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    tabButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    tabPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `${button.dataset.tab}-panel`);
    });

    if (button.dataset.tab === 'agenda') {
      cargarDisponibilidad();
    }

    if (button.dataset.tab === 'citas') {
      cargarCitas();
    }

    if (button.dataset.tab === 'admin') {
      cargarAdminCitas();
    }
  });
});

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const id = target.dataset.id;
  const action = target.dataset.action;

  try {
    if (action === 'cancel') {
      const response = await apiRequest(`/api/citas/${id}`, { method: 'DELETE' });
      showAlert('success', response.message);
      await cargarAdminCitas();
      await cargarCitas();
      return;
    }

    if (action === 'edit') {
      const cita = (await apiRequest('/api/admin/citas')).citas.find((item) => String(item.id) === String(id));
      const nextHora = window.prompt('Nueva hora (HH:MM)', cita ? cita.hora : '09:30');
      const nextMotivo = window.prompt('Nuevo motivo de la cita', cita ? cita.motivo : 'Consulta general');

      if (!nextHora || !nextMotivo) return;

      const response = await apiRequest(`/api/citas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ hora: nextHora, motivo: nextMotivo })
      });

      showAlert('success', response.message || 'Cita actualizada');
      await cargarAdminCitas();
      await cargarCitas();
    }
  } catch (error) {
    showAlert('error', error.message);
  }
});

const refreshAdminBtn = document.getElementById('refreshAdminBtn');
if (refreshAdminBtn) {
  refreshAdminBtn.addEventListener('click', cargarAdminCitas);
}

bindAgendaEvents();

if (getToken()) {
  loginCard.style.display = 'none';
  workspace.classList.add('active');
  currentUser = { role: 'patient' };
  applyRolePermissions('patient');
  cargarDisponibilidad();
  cargarCitas();
}
