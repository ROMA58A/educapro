
let apiBaseUrl = '';

// Cargar configuración desde config.xml
async function cargarConfiguracion() {
  try {
    const response = await fetch('config.xml');
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    apiBaseUrl = xmlDoc.getElementsByTagName('apiBaseUrl')[0].textContent;
    console.log('API base URL cargada:', apiBaseUrl);
  } catch (err) {
    console.error('Error al cargar configuración:', err);
    alert('No se pudo cargar la configuración del sistema.');
  }
}

// Cargar perfil al iniciar
window.onload = function () {
  cargarConfiguracion().then(() => {
    cargarPerfil();
    cargarMaterias();
  });
};

// Cargar datos del perfil
async function cargarPerfil() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      console.error('Error en la respuesta del servidor:', response.status, await response.text());
      alert('Error al cargar perfil');
      return;
    }

    const data = await response.json();
    document.getElementById('perfilNombre').textContent = data.name || 'Sin nombre';
    document.getElementById('perfilEmail').textContent = data.email || 'Sin correo';
    const rol = data.rol;
    document.getElementById('perfilRol').textContent = rol === '1' ? 'Profesor' : 'Alumno';

    if (rol === '0') {
      cargarMaterias();
    }

    document.title = `Sistema ${rol === '1' ? 'Profesor' : 'Alumno'}`;
  } catch (err) {
    console.error('Error perfil:', err);
  }
}

// Cargar materias del profesor
async function cargarMaterias() {
  try {
    const userId = localStorage.getItem('userId');
    const response = await fetch(`${apiBaseUrl}/api/subjects`);

    if (!response.ok) {
      console.error('Error en la respuesta del servidor:', response.status, await response.text());
      alert('Error al cargar materias');
      return;
    }

    const data = await response.json();

    if (Array.isArray(data.subjects)) {
      const materiasList = document.getElementById('materiasList');
      materiasList.innerHTML = '';

      const materiasFiltradas = data.subjects.filter(m => m.teacher?.id == userId);

      materiasFiltradas.forEach(materia => {
        const card = `
          <div class="col-md-6 col-lg-4">
            <div class="card mb-3 shadow-sm">
              <div class="card-header bg-primary text-white">${materia.name || 'Sin nombre'}</div>
              <div class="card-body">
                <p>${materia.description || 'Sin descripción'}</p>
                <p><strong>Profesor:</strong> ${materia.teacher?.name || 'No asignado'}</p>
                <p><strong>Total de alumnos:</strong> ${Array.isArray(materia.users) ? materia.users.length : 0}</p>
                <button class="btn btn-outline-primary w-100" onclick="verAlumnos(${materia.id})">Ver Alumnos</button>
              </div>
            </div>
          </div>`;
        materiasList.innerHTML += card;
      });
    }
  } catch (err) {
    console.error('Error al cargar materias:', err);
  }
}

// Ver alumnos y sus notas
async function verAlumnos(materiaId) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/subjects/${materiaId}`);
    const data = await response.json();
    const body = document.getElementById('modalAlumnosBody');
    body.innerHTML = '';

    if (Array.isArray(data.data.users)) {
      for (const alumno of data.data.users) {
        const resNotas = await fetch(`${apiBaseUrl}/api/grades/${alumno.id}`);
        const dataNotas = await resNotas.json();
        const notaData = dataNotas.data[0] || {};
        const calificacion = notaData.grade ?? 'Sin calificación';

        body.innerHTML += `
          <div class="border rounded p-3 mb-2 d-flex justify-content-between align-items-center">
            <div>
              <strong>${alumno.name}</strong><br><small>${alumno.email}</small><br>
              <small>Calificación: ${calificacion}</small>
            </div>
            <div>
              <button class="btn btn-success btn-sm me-1" onclick="abrirModalNota(${alumno.id}, ${materiaId}, ${notaData.grade ?? ''})">Subir Nota</button>
              <button class="btn btn-warning btn-sm me-1" onclick="abrirModalActualizarNota(${alumno.id}, ${materiaId}, ${notaData.id ?? null}, ${notaData.grade ?? ''})">Actualizar</button>
            </div>
          </div>`;
      }

      body.innerHTML += generarModalSubirNota();

      new bootstrap.Modal(document.getElementById('modalAlumnos')).show();
    } else {
      body.innerHTML = '<p>No se encontraron alumnos para esta materia.</p>';
    }
  } catch (error) {
    console.error('Error al obtener alumnos:', error);
    document.getElementById('modalAlumnosBody').innerHTML = '<p class="text-danger">Error al cargar los alumnos.</p>';
  }
}

// Modal HTML para subir/actualizar nota
function generarModalSubirNota() {
  return `
    <div class="modal fade" id="modalSubirNota" tabindex="-1" aria-labelledby="modalSubirNotaLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <form id="formSubirNota" onsubmit="guardarNota(event)">
            <div class="modal-header">
              <h5 class="modal-title" id="modalSubirNotaLabel">Subir / Actualizar Nota</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="notaAlumnoId">
              <input type="hidden" id="notaMateriaId">
              <input type="hidden" id="notaId">
              <div class="mb-3">
                <label for="notaValor" class="form-label">Nota</label>
                <input type="number" class="form-control" id="notaValor" min="0" max="100" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">Guardar</button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
}

// Abrir modal para nueva nota
function abrirModalNota(alumnoId, materiaId, nota = '') {
  document.getElementById('notaAlumnoId').value = alumnoId;
  document.getElementById('notaMateriaId').value = materiaId;
  document.getElementById('notaValor').value = nota;
  document.getElementById('notaId').value = ''; // Nueva nota, no hay ID
  new bootstrap.Modal(document.getElementById('modalSubirNota')).show();
}

// Abrir modal para actualizar nota
function abrirModalActualizarNota(alumnoId, materiaId, notaId, nota = '') {
  document.getElementById('notaAlumnoId').value = alumnoId;
  document.getElementById('notaMateriaId').value = materiaId;
  document.getElementById('notaValor').value = nota;
  document.getElementById('notaId').value = notaId;
  new bootstrap.Modal(document.getElementById('modalSubirNota')).show();
}

// Guardar o actualizar nota
async function guardarNota(event) {
  event.preventDefault();

  const alumnoId = parseInt(document.getElementById('notaAlumnoId').value);
  const materiaId = parseInt(document.getElementById('notaMateriaId').value);
  const notaId = document.getElementById('notaId').value;
  const valor = parseFloat(document.getElementById('notaValor').value);

  try {
    const url = notaId
      ? `${apiBaseUrl}/api/grades/${notaId}`
      : `${apiBaseUrl}/api/grades`;

    const method = notaId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: alumnoId,
        subject_id: materiaId,
        grade: valor
      })
    });

    if (response.ok) {
      alert(notaId ? 'Nota actualizada exitosamente' : 'Nota guardada exitosamente');
      bootstrap.Modal.getInstance(document.getElementById('modalSubirNota')).hide();
      verAlumnos(materiaId);
    } else {
      alert('Error al guardar la nota');
    }
  } catch (error) {
    console.error('Error al guardar nota:', error);
    alert('Ocurrió un error al guardar la nota');
  }
}
