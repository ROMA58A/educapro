let apiBaseUrl = '';

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

async function cargarPerfil() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    document.getElementById('perfilNombre').textContent = data.name || 'Sin nombre';
    document.getElementById('perfilEmail').textContent = data.email || 'Sin correo';
    const rol = data.rol;
    document.getElementById('perfilRol').textContent = rol === '1' ? 'Profesor' : 'Alumno';

    if (rol === '0') {
      cargarMaterias();
      cargarCalificaciones();
    }

    document.title = `Sistema ${rol === '1' ? 'Profesor' : 'Alumno'}`;
  } catch (err) {
    console.error('Error perfil:', err);
  }
}

async function cargarMaterias() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/subjects`);
    const data = await response.json();

    if (!response.ok) {
      alert(`Error al cargar las materias: ${data.message || 'Error desconocido'}`);
      return;
    }

    const container = document.getElementById('materiasContainer');
    container.innerHTML = '';

    data.subjects.forEach((materia) => {
      const card = document.createElement('div');
      card.className = 'col-md-4 mb-4';

      card.innerHTML = `
        <div class="card shadow">
          <div class="card-body">
            <h5 class="card-title">${materia.name}</h5>
            <p class="card-text">${materia.description}</p>
            <div class="d-flex justify-content-between">
              <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#materiaModal"
                onclick='verDetalles(${JSON.stringify(materia)})'>
                Ver más
              </button>
              <button class="btn btn-success" onclick="inscribirseMateria(${materia.id})">
                Inscribirse
              </button>
            </div>
            <div class="mt-3" id="mensaje-${materia.id}"></div>
          </div>
        </div>`;

      container.appendChild(card);
    });
  } catch (err) {
    console.error('Error al cargar materias:', err);
    alert('Ocurrió un error al intentar cargar las materias.');
  }
}

async function inscribirseMateria(subjectId) {
  try {
    const usuarioActualId = localStorage.getItem('userId');
    const response = await fetch(`${apiBaseUrl}/api/inscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: subjectId, user_id: usuarioActualId })
    });

    const mensajeDiv = document.getElementById(`mensaje-${subjectId}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Detalle error:', errorData);

      if (errorData.errors && errorData.errors.includes("Ya estás inscrito a esta materia")) {
        mensajeDiv.innerHTML = `<div class="alert alert-info">Ya se inscribió 👍</div>`;
      } else {
        mensajeDiv.innerHTML = `<div class="alert alert-danger">Error al inscribirse: ${errorData.message || JSON.stringify(errorData)}</div>`;
      }
      return;
    }

    mensajeDiv.innerHTML = `<div class="alert alert-success">Inscripción exitosa 👍</div>`;
  } catch (error) {
    console.error('Error al inscribirse:', error);
    const mensajeDiv = document.getElementById(`mensaje-${subjectId}`);
    mensajeDiv.innerHTML = `<div class="alert alert-danger">Ocurrió un error al intentar inscribirse.</div>`;
  }
}

async function cargarCalificaciones() {
  try {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) return;

    const container = document.getElementById('calificacionesContainer');
    container.innerHTML = '<div>Actualizando calificaciones...</div>';

    const response = await fetch(`${apiBaseUrl}/api/grades/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      container.innerHTML = '<div>No hay calificaciones disponibles</div>';
      return;
    }

    container.innerHTML = '';

    const calificacionesAgrupadas = data.data.reduce((acc, calificacion) => {
      if (!acc[calificacion.subject_name]) acc[calificacion.subject_name] = [];
      acc[calificacion.subject_name].push(calificacion);
      return acc;
    }, {});

    for (const materia in calificacionesAgrupadas) {
      const calificacionesDeMateria = calificacionesAgrupadas[materia];
      calificacionesDeMateria.sort((a, b) => new Date(b.date) - new Date(a.date));
      const ultimaCalificacion = calificacionesDeMateria[0];

      const card = document.createElement('div');
      card.className = 'col-md-4 mb-4';
      card.innerHTML = `
        <div class="card shadow">
          <div class="card-body">
            <h5 class="card-title">${materia}</h5>
            <p class="card-text">Revisa tus calificaciones</p>
            <button class="btn btn-info" data-bs-toggle="modal" data-bs-target="#calificacionesModal" onclick="mostrarDetalles('${materia}')">Ver detalles</button>
          </div>
        </div>`;
      container.appendChild(card);
    }

    const modalContent = `
      <div class="modal fade" id="calificacionesModal" tabindex="-1" aria-labelledby="calificacionesModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="calificacionesModalLabel">Detalles de las calificaciones</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="modalBody"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalContent);
  } catch (err) {
    console.error('Error calificaciones:', err);
    const container = document.getElementById('calificacionesContainer');
    container.innerHTML = '<div>Error al cargar las calificaciones. Inténtalo nuevamente.</div>';
  }
}

function mostrarDetalles(materia) {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  if (!token || !userId) return;

  fetch(`${apiBaseUrl}/api/grades/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(response => response.json())
    .then(data => {
      const calificacionesDeMateria = data.data.filter(calificacion => calificacion.subject_name === materia);
      const modalBody = document.getElementById('modalBody');
      modalBody.innerHTML = `
        <ul class="list-group list-group-flush">
          ${calificacionesDeMateria.map((calificacion, index) => {
            const profesor = calificacion.teacher || "Profesor no disponible";
            return `
              <li class="list-group-item">
                <strong>Calificación:</strong> ${calificacion.grade}
                <div class="collapse" id="detalle-${index}">
                  <p><strong>Comentarios:</strong> ${calificacion.comments || "No hay comentarios"}</p>
                  <p><strong>Profesor:</strong> ${profesor}</p>
                </div>
              </li>`;
          }).join('')}
        </ul>`;
    })
    .catch(err => console.error('Error al cargar los detalles:', err));
}

function verDetalles(materia) {
  document.getElementById('modalNombre').textContent = materia.name;
  document.getElementById('modalDescripcion').textContent = materia.description;
  document.getElementById('modalProfesor').textContent = materia.teacher?.name || 'No asignado';
  document.getElementById('modalCorreoProfesor').textContent = materia.teacher?.email || 'No disponible';
}

function editarPerfil() {
  alert('Función no implementada aún');
}

// Inicializar
window.onload = async () => {
  await cargarConfiguracion();
  cargarPerfil();
  cargarMaterias();
  setInterval(cargarMaterias, 30000);
};
