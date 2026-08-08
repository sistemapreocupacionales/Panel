/* =========================================================
 *  CONFIGURACIÓN
 *  Pegá acá la URL que te da Apps Script (Implementar > Nueva
 *  implementación > Aplicación web). Termina en /exec
 * ========================================================= */
const API_URL = 'https://script.google.com/macros/s/AKfycbyLvjUH8YRkh_g9OI8Y0ht28kIVRmeq0qMbF84SoxAubodAfYwfSOtbgMM9u0f5Phwd/exec';

// Debe coincidir con SERVICIOS, LAB_CAMPOS y DDJJ_PREGUNTAS de Code.gs
const SERVICIOS_FALLBACK = [
  'Declaración Jurada', 'Rayos X', 'Laboratorio', 'Electrocardiograma',
  'Otro estudio', 'Otro estudio 2', 'Otro estudio 3', 'Otro estudio 4'
];
const SERVICIO_DDJJ = 'Declaración Jurada';
const LAB_CAMPOS_FALLBACK = [
  { id: 'hto', label: 'Hematocrito' },
  { id: 'hb', label: 'Hemoglobina' },
  { id: 'gb', label: 'Glóbulos blancos' },
  { id: 'gr', label: 'Glóbulos rojos' },
  { id: 'plaq', label: 'Plaquetas' },
  { id: 'glucemia', label: 'Glucemia' },
  { id: 'urea', label: 'Urea' },
  { id: 'creatinina', label: 'Creatinina' },
  { id: 'colesterol', label: 'Colesterol total' },
  { id: 'trigliceridos', label: 'Triglicéridos' },
  { id: 'got', label: 'GOT (TGO)' },
  { id: 'gpt', label: 'GPT (TGP)' },
  { id: 'orina', label: 'Orina completa' },
  { id: 'grupoFactor', label: 'Grupo sanguíneo y factor RH' },
  { id: 'vdrl', label: 'VDRL' }
];
const DDJJ_PREGUNTAS_FALLBACK = [
  { id: 'hipertension', label: '¿Tiene o tuvo hipertensión arterial?' },
  { id: 'diabetes', label: '¿Tiene o tuvo diabetes?' },
  { id: 'cardiopatia', label: '¿Tiene o tuvo alguna enfermedad cardíaca?' },
  { id: 'respiratoria', label: '¿Tiene o tuvo alguna enfermedad respiratoria (asma, EPOC, etc.)?' },
  { id: 'epilepsia', label: '¿Tiene o tuvo epilepsia o convulsiones?' },
  { id: 'columna', label: '¿Tiene o tuvo problemas de columna o hernias?' },
  { id: 'alergias', label: '¿Tiene alergias conocidas (a medicamentos, alimentos, etc.)?' },
  { id: 'cirugias', label: '¿Tuvo cirugías previas?' },
  { id: 'medicacion', label: '¿Toma medicación de forma habitual?' },
  { id: 'psiquiatrico', label: '¿Recibe o recibió tratamiento psiquiátrico o psicológico?' },
  { id: 'visual', label: '¿Tiene problemas de visión no corregidos con anteojos/lentes?' },
  { id: 'auditivo', label: '¿Tiene problemas de audición?' },
  { id: 'accidentes', label: '¿Sufrió accidentes de trabajo o enfermedades profesionales previas?' },
  { id: 'otras', label: 'Otras enfermedades, condiciones o antecedentes relevantes' }
];
const ROL_ADMIN = 'Administracion';

/* --------------------- Estado global --------------------- */
let sesion = null; // { token, usuario, nombreCompleto, especialidad, esAdmin }
let SERVICIOS = SERVICIOS_FALLBACK;
let LAB_CAMPOS = LAB_CAMPOS_FALLBACK;
let DDJJ_PREGUNTAS = DDJJ_PREGUNTAS_FALLBACK;
let estudiosActuales = [];
let pacientesCache = [];
let nuevasImagenes = []; // File[] pendientes de subir para el estudio actual
let nuevaFirmaProfesional = null; // File|null pendiente de subir
let nuevaFirmaPaciente = null; // File|null pendiente de subir (Declaración Jurada)

/* --------------------- Referencias DOM --------------------- */
const $vistaLogin = document.getElementById('vista-login');
const $app = document.getElementById('app');
const $formLogin = document.getElementById('form-login');
const $loginUsuario = document.getElementById('login-usuario');
const $loginPassword = document.getElementById('login-password');
const $estadoLogin = document.getElementById('estado-login');
const $btnLogout = document.getElementById('btn-logout');
const $userNombre = document.getElementById('user-nombre');
const $userEspecialidad = document.getElementById('user-especialidad');
const $tabUsuarios = document.getElementById('tab-usuarios');

const $dni = document.getElementById('dni');
const $btnBuscar = document.getElementById('btn-buscar');
const $estadoBusqueda = document.getElementById('estado-busqueda');
const $datosNombre = document.getElementById('datos-nombre');
const $nombre = document.getElementById('nombre');
const $apellido = document.getElementById('apellido');
const $datosEmpresa = document.getElementById('datos-empresa');
const $empresa = document.getElementById('empresa');
const $listaEmpresas = document.getElementById('lista-empresas');
const $estadoFicha = document.getElementById('estado-ficha');
const $checklist = document.getElementById('checklist');

const $datosPersonales = document.getElementById('datos-personales');
const $fechaNacimiento = document.getElementById('fecha-nacimiento');
const $edad = document.getElementById('edad');
const $telefono = document.getElementById('telefono');
const $direccion = document.getElementById('direccion');
const $localidad = document.getElementById('localidad');
const $provincia = document.getElementById('provincia');
const $nacionalidad = document.getElementById('nacionalidad');
const $btnGuardarPersonales = document.getElementById('btn-guardar-personales');
const $btnEliminarPaciente = document.getElementById('btn-eliminar-paciente');
const $estadoPersonales = document.getElementById('estado-personales');

const $cardEliminarTanda = document.getElementById('card-eliminar-tanda');
const $tandaDesde = document.getElementById('tanda-desde');
const $tandaHasta = document.getElementById('tanda-hasta');
const $btnEliminarTanda = document.getElementById('btn-eliminar-tanda');
const $estadoTanda = document.getElementById('estado-tanda');

const $cardServicio = document.getElementById('card-servicio');
const $servicio = document.getElementById('servicio');
const $avisoPermiso = document.getElementById('aviso-permiso');
const $profesional = document.getElementById('profesional');
const $bloqueLab = document.getElementById('bloque-laboratorio');
const $gridLab = document.getElementById('grid-laboratorio');
const $bloqueDdjj = document.getElementById('bloque-ddjj');
const $listaDdjj = document.getElementById('lista-ddjj');
const $firmaPaciente = document.getElementById('firma-paciente');
const $previewFirmaPaciente = document.getElementById('preview-firma-paciente');
const $observaciones = document.getElementById('observaciones');
const $imagenes = document.getElementById('imagenes');
const $previewNuevas = document.getElementById('preview-nuevas');
const $galeriaWrap = document.getElementById('galeria-existente-wrap');
const $galeriaExistente = document.getElementById('galeria-existente');
const $firmaProfesional = document.getElementById('firma-profesional');
const $previewFirmaProfesional = document.getElementById('preview-firma-profesional');
const $btnGuardar = document.getElementById('btn-guardar');
const $estadoGuardar = document.getElementById('estado-guardar');

const $cardPdf = document.getElementById('card-pdf');
const $btnPdf = document.getElementById('btn-pdf');
const $btnCerrar = document.getElementById('btn-cerrar');
const $estadoPdf = document.getElementById('estado-pdf');

const $filtroPacientes = document.getElementById('filtro-pacientes');
const $tablaPacientes = document.getElementById('tabla-pacientes');
const $gruposEmpresa = document.getElementById('grupos-empresa');

const $nuUsuario = document.getElementById('nu-usuario');
const $nuPassword = document.getElementById('nu-password');
const $nuNombre = document.getElementById('nu-nombre');
const $nuEspecialidad = document.getElementById('nu-especialidad');
const $btnCrearUsuario = document.getElementById('btn-crear-usuario');
const $estadoUsuario = document.getElementById('estado-usuario');
const $tablaUsuarios = document.getElementById('tabla-usuarios');

/* =========================================================
 *  FECHAS / EDAD
 * ========================================================= */

// Convierte cualquier valor de fecha (ISO con hora, yyyy-MM-dd, Date)
// al formato pedido dd-MM-yyyy. Devuelve '-' si no hay fecha válida.
function formatearFecha(valor) {
  if (!valor) return '-';
  const f = new Date(valor);
  if (isNaN(f.getTime())) return '-';
  const dd = String(f.getDate()).padStart(2, '0');
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  const yyyy = f.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Calcula la edad en años a partir de un input type="date" (yyyy-MM-dd).
function calcularEdad(fechaNacimientoStr) {
  if (!fechaNacimientoStr) return null;
  const partes = fechaNacimientoStr.split('-');
  if (partes.length !== 3) return null;
  const fn = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  if (isNaN(fn.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fn.getFullYear();
  const mes = hoy.getMonth() - fn.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fn.getDate())) edad--;
  return edad >= 0 ? edad : null;
}

function actualizarEdadEnPantalla() {
  const edad = calcularEdad($fechaNacimiento.value);
  $edad.value = edad !== null ? edad + ' años' : '';
}

$fechaNacimiento.addEventListener('change', actualizarEdadEnPantalla);

/* =========================================================
 *  SESIÓN / LOGIN
 * ========================================================= */

function cargarSesionGuardada() {
  try {
    const guardada = JSON.parse(localStorage.getItem('sesionEstudios') || 'null');
    if (guardada && guardada.token) {
      sesion = guardada;
      SERVICIOS = guardada.servicios || SERVICIOS_FALLBACK;
      LAB_CAMPOS = guardada.labCampos || LAB_CAMPOS_FALLBACK;
      DDJJ_PREGUNTAS = guardada.ddjjPreguntas || DDJJ_PREGUNTAS_FALLBACK;
      return true;
    }
  } catch (e) { /* nada guardado o corrupto */ }
  return false;
}

function mostrarApp() {
  $vistaLogin.hidden = true;
  $app.hidden = false;
  $userNombre.textContent = sesion.nombreCompleto;
  $userEspecialidad.textContent = sesion.especialidad;
  $tabUsuarios.hidden = !sesion.esAdmin;
  $cardEliminarTanda.hidden = !sesion.esAdmin;

  inicializarSelectServicio();
  inicializarGridLaboratorio();
  inicializarListaDdjj();
  cambiarVista('cargar');
}

function mostrarLogin(mensaje) {
  $app.hidden = true;
  $vistaLogin.hidden = false;
  if (mensaje) mostrarEstado($estadoLogin, mensaje, 'error');
}

$formLogin.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (API_URL.includes('PEGA_AQUI')) {
    mostrarEstado($estadoLogin, 'Falta configurar API_URL en script.js', 'error');
    return;
  }
  const usuario = $loginUsuario.value.trim();
  const password = $loginPassword.value;
  mostrarEstado($estadoLogin, 'Ingresando...', '');
  document.getElementById('btn-login').disabled = true;

  try {
    const data = await apiPost({ action: 'login', usuario, password });
    if (!data.ok) throw new Error(data.error || 'No se pudo iniciar sesión');

    sesion = data;
    SERVICIOS = data.servicios || SERVICIOS_FALLBACK;
    LAB_CAMPOS = data.labCampos || LAB_CAMPOS_FALLBACK;
    DDJJ_PREGUNTAS = data.ddjjPreguntas || DDJJ_PREGUNTAS_FALLBACK;
    localStorage.setItem('sesionEstudios', JSON.stringify(sesion));

    $loginPassword.value = '';
    mostrarEstado($estadoLogin, '', '');
    mostrarApp();
  } catch (err) {
    mostrarEstado($estadoLogin, 'Error: ' + err.message, 'error');
  } finally {
    document.getElementById('btn-login').disabled = false;
  }
});

$btnLogout.addEventListener('click', async () => {
  try { await apiPost({ action: 'logout', token: sesion.token }); } catch (e) { /* no bloquea el logout local */ }
  localStorage.removeItem('sesionEstudios');
  sesion = null;
  mostrarLogin();
});

/* =========================================================
 *  LLAMADAS AL BACKEND
 *  (Content-Type text/plain evita el preflight CORS con Apps Script)
 * ========================================================= */

async function apiPost(payload) {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Error de red: ' + resp.status);
  const data = await resp.json();
  if (data && data.error === 'SESION_INVALIDA') {
    localStorage.removeItem('sesionEstudios');
    sesion = null;
    mostrarLogin('Tu sesión expiró, ingresá de nuevo.');
    throw new Error('Sesión expirada');
  }
  return data;
}

async function apiGet(action, params) {
  const query = new URLSearchParams(Object.assign({ action, token: sesion ? sesion.token : '' }, params || {}));
  const resp = await fetch(API_URL + '?' + query.toString());
  if (!resp.ok) throw new Error('Error de red: ' + resp.status);
  const data = await resp.json();
  if (data && data.error === 'SESION_INVALIDA') {
    localStorage.removeItem('sesionEstudios');
    sesion = null;
    mostrarLogin('Tu sesión expiró, ingresá de nuevo.');
    throw new Error('Sesión expirada');
  }
  return data;
}

/* =========================================================
 *  NAVEGACIÓN ENTRE VISTAS
 * ========================================================= */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => cambiarVista(btn.dataset.vista));
});

function cambiarVista(nombre) {
  document.querySelectorAll('.vista').forEach(v => v.hidden = true);
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('vista-' + nombre).hidden = false;
  document.querySelector('.tab-btn[data-vista="' + nombre + '"]').classList.add('active');

  if (nombre === 'pacientes') cargarVistaPacientes();
  if (nombre === 'empresa') cargarVistaEmpresa();
  if (nombre === 'usuarios' && sesion.esAdmin) cargarVistaUsuarios();
}

/* =========================================================
 *  VISTA: CARGAR / EDITAR ESTUDIO
 * ========================================================= */

function inicializarSelectServicio() {
  $servicio.innerHTML = '';
  SERVICIOS.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    $servicio.appendChild(opt);
  });
}

function inicializarGridLaboratorio() {
  $gridLab.innerHTML = '';
  LAB_CAMPOS.forEach(campo => {
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `<label for="lab-${campo.id}">${campo.label}</label><input id="lab-${campo.id}" data-lab="${campo.id}" type="text">`;
    $gridLab.appendChild(div);
  });
}

function inicializarListaDdjj() {
  $listaDdjj.innerHTML = '';
  DDJJ_PREGUNTAS.forEach(p => {
    const div = document.createElement('div');
    div.className = 'ddjj-item';
    div.innerHTML = `
      <div class="ddjj-pregunta">${p.label}</div>
      <div class="ddjj-opciones">
        <label><input type="radio" name="ddjj-${p.id}" value="Sí" data-ddjj="${p.id}"> Sí</label>
        <label><input type="radio" name="ddjj-${p.id}" value="No" data-ddjj="${p.id}"> No</label>
        <label><input type="radio" name="ddjj-${p.id}" value="No sabe" data-ddjj="${p.id}"> No sabe</label>
      </div>
      <input type="text" placeholder="Aclaración (opcional)" data-ddjj-detalle="${p.id}">
    `;
    $listaDdjj.appendChild(div);
  });
}

$btnBuscar.addEventListener('click', () => buscarPaciente($dni.value.trim()));

async function buscarPaciente(dni) {
  if (!dni) { mostrarEstado($estadoBusqueda, 'Ingresá un DNI para buscar.', 'error'); return; }
  $dni.value = dni;
  $btnBuscar.disabled = true;
  mostrarEstado($estadoBusqueda, 'Buscando...', '');

  try {
    const data = await apiGet('buscarPaciente', { dni });
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    estudiosActuales = data.estudios || [];

    if (data.existe) {
      $nombre.value = data.paciente.nombre;
      $apellido.value = data.paciente.apellido;
      $empresa.value = data.paciente.empresa || '';
      $fechaNacimiento.value = data.paciente.fechaNacimiento || '';
      $telefono.value = data.paciente.telefono || '';
      $direccion.value = data.paciente.direccion || '';
      $localidad.value = data.paciente.localidad || '';
      $provincia.value = data.paciente.provincia || '';
      $nacionalidad.value = data.paciente.nacionalidad || '';
      $edad.value = (data.paciente.edad !== null && data.paciente.edad !== undefined) ? data.paciente.edad + ' años' : '';
      mostrarEstado($estadoBusqueda, 'Paciente encontrado.', 'ok');
      mostrarEstado($estadoFicha, 'Ficha: ' + (data.paciente.estado || 'Abierta'), data.paciente.estado === 'Cerrada' ? 'error' : 'ok');
    } else {
      $nombre.value = ''; $apellido.value = ''; $empresa.value = '';
      $fechaNacimiento.value = ''; $telefono.value = ''; $direccion.value = '';
      $localidad.value = ''; $provincia.value = ''; $nacionalidad.value = ''; $edad.value = '';
      mostrarEstado($estadoBusqueda, 'No existe todavía: completá los datos para crearlo.', '');
      mostrarEstado($estadoFicha, '', '');
    }

    $datosNombre.hidden = false;
    $datosEmpresa.hidden = false;
    $datosPersonales.hidden = false;
    $btnEliminarPaciente.hidden = !(sesion.esAdmin && data.existe);
    mostrarEstado($estadoPersonales, '', '');
    pintarChecklist();
    $checklist.hidden = false;
    $cardServicio.hidden = false;
    $cardPdf.hidden = estudiosActuales.length === 0;

    cargarDatosServicioSeleccionado();
  } catch (err) {
    mostrarEstado($estadoBusqueda, 'Error: ' + err.message, 'error');
  } finally {
    $btnBuscar.disabled = false;
  }
}

function pintarChecklist() {
  $checklist.innerHTML = '';
  const cargados = new Set(estudiosActuales.map(e => e.servicio));
  SERVICIOS.forEach(s => {
    const chip = document.createElement('span');
    chip.className = 'chip' + (cargados.has(s) ? ' done' : '');
    chip.textContent = s;
    $checklist.appendChild(chip);
  });
}

$btnGuardarPersonales.addEventListener('click', async () => {
  const dni = $dni.value.trim();
  const nombre = $nombre.value.trim();
  const apellido = $apellido.value.trim();
  const empresa = $empresa.value.trim();

  if (!dni) { mostrarEstado($estadoPersonales, 'Buscá primero un paciente por DNI.', 'error'); return; }
  if (!nombre || !apellido) {
    mostrarEstado($estadoPersonales, 'Completá nombre y apellido antes de guardar los datos personales.', 'error');
    return;
  }

  $btnGuardarPersonales.disabled = true;
  mostrarEstado($estadoPersonales, 'Guardando...', '');
  try {
    const data = await apiPost({
      action: 'actualizarPaciente', token: sesion.token, dni,
      nombre, apellido, empresa,
      fechaNacimiento: $fechaNacimiento.value,
      telefono: $telefono.value.trim(),
      direccion: $direccion.value.trim(),
      localidad: $localidad.value.trim(),
      provincia: $provincia.value.trim(),
      nacionalidad: $nacionalidad.value.trim()
    });
    if (!data.ok) throw new Error(data.error || 'No se pudo guardar');
    $edad.value = (data.paciente.edad !== null && data.paciente.edad !== undefined) ? data.paciente.edad + ' años' : '';
    $btnEliminarPaciente.hidden = !sesion.esAdmin;
    mostrarEstado($estadoPersonales, 'Datos personales guardados.', 'ok');
  } catch (err) {
    mostrarEstado($estadoPersonales, 'Error: ' + err.message, 'error');
  } finally {
    $btnGuardarPersonales.disabled = false;
  }
});

$btnEliminarPaciente.addEventListener('click', async () => {
  const dni = $dni.value.trim();
  const nombreCompleto = ($nombre.value + ' ' + $apellido.value).trim();
  if (!dni) return;
  if (!confirm('¿Eliminar definitivamente a ' + (nombreCompleto || dni) + '? Se borran sus estudios, imágenes y PDFs. Esta acción no se puede deshacer.')) return;

  $btnEliminarPaciente.disabled = true;
  mostrarEstado($estadoPersonales, 'Eliminando...', '');
  try {
    const dataEliminar = await apiPost({ action: 'eliminarPaciente', token: sesion.token, dni });
    if (!dataEliminar.ok) throw new Error(dataEliminar.error || 'No se pudo eliminar');
    mostrarEstado($estadoPersonales, 'Paciente eliminado.', 'ok');
    limpiarFormularioPaciente();
    if (pacientesCache.length) { const data = await apiGet('listarPacientes'); pacientesCache = data.pacientes || []; renderizarListaPacientes(); }
  } catch (err) {
    mostrarEstado($estadoPersonales, 'Error: ' + err.message, 'error');
  } finally {
    $btnEliminarPaciente.disabled = false;
  }
});

function limpiarFormularioPaciente() {
  $dni.value = '';
  $nombre.value = ''; $apellido.value = ''; $empresa.value = '';
  $fechaNacimiento.value = ''; $telefono.value = ''; $direccion.value = '';
  $localidad.value = ''; $provincia.value = ''; $nacionalidad.value = ''; $edad.value = '';
  $datosNombre.hidden = true; $datosEmpresa.hidden = true; $datosPersonales.hidden = true;
  $checklist.hidden = true; $cardServicio.hidden = true; $cardPdf.hidden = true;
  estudiosActuales = [];
  nuevaFirmaProfesional = null; nuevaFirmaPaciente = null;
  $previewFirmaProfesional.innerHTML = ''; $previewFirmaPaciente.innerHTML = '';
  mostrarEstado($estadoBusqueda, '', '');
  mostrarEstado($estadoFicha, '', '');
}

$servicio.addEventListener('change', cargarDatosServicioSeleccionado);

function cargarDatosServicioSeleccionado() {
  const servicio = $servicio.value;
  const puedeEditar = sesion.esAdmin || sesion.especialidad === servicio || servicio === SERVICIO_DDJJ;

  $avisoPermiso.hidden = puedeEditar;
  if (!puedeEditar) $avisoPermiso.textContent = 'Solo podés visualizar este estudio: no tenés permiso para editar "' + servicio + '".';

  [$profesional, $observaciones, $imagenes, $firmaProfesional].forEach(el => el.disabled = !puedeEditar);
  $btnGuardar.disabled = !puedeEditar;

  $bloqueLab.hidden = servicio !== 'Laboratorio';
  $gridLab.querySelectorAll('input').forEach(inp => { inp.value = ''; inp.disabled = !puedeEditar; });

  $bloqueDdjj.hidden = servicio !== SERVICIO_DDJJ;
  $listaDdjj.querySelectorAll('input[type="radio"]').forEach(r => { r.checked = false; r.disabled = !puedeEditar; });
  $listaDdjj.querySelectorAll('input[type="text"]').forEach(t => { t.value = ''; t.disabled = !puedeEditar; });
  $firmaPaciente.disabled = !puedeEditar;

  const existente = estudiosActuales.find(e => e.servicio === servicio);

  $profesional.value = existente ? (existente.profesional || '') : '';
  $observaciones.value = existente ? (existente.observaciones || '') : '';

  if (existente && existente.laboratorio) {
    Object.keys(existente.laboratorio).forEach(id => {
      const input = document.getElementById('lab-' + id);
      if (input) input.value = existente.laboratorio[id] || '';
    });
  }

  if (existente && existente.ddjj) {
    Object.keys(existente.ddjj).forEach(id => {
      const r = existente.ddjj[id] || {};
      if (r.respuesta) {
        const radio = $listaDdjj.querySelector(`input[data-ddjj="${id}"][value="${r.respuesta}"]`);
        if (radio) radio.checked = true;
      }
      if (r.detalle) {
        const detalle = $listaDdjj.querySelector(`input[data-ddjj-detalle="${id}"]`);
        if (detalle) detalle.value = r.detalle;
      }
    });
  }

  nuevasImagenes = [];
  $imagenes.value = '';
  renderPreviewNuevas();

  if (existente && existente.imagenes && existente.imagenes.length > 0) {
    $galeriaWrap.hidden = false;
    renderGaleriaExistente(existente.imagenes, puedeEditar);
  } else {
    $galeriaWrap.hidden = true;
    $galeriaExistente.innerHTML = '';
  }

  // Firma del paciente (Declaración Jurada)
  nuevaFirmaPaciente = null;
  $firmaPaciente.value = '';
  renderFirmaExistente($previewFirmaPaciente, existente && existente.firmaPaciente ? existente.firmaPaciente.url : null);

  // Firma del profesional (todos los estudios)
  nuevaFirmaProfesional = null;
  $firmaProfesional.value = '';
  renderFirmaExistente($previewFirmaProfesional, existente && existente.firmaProfesional ? existente.firmaProfesional.url : null);
}

// Muestra la firma ya guardada de un estudio (si existe). Si la imagen
// no llega a cargar (por ejemplo, un archivo viejo con permisos sin
// migrar), ofrece un link para abrirla directamente en Drive en vez de
// dejar un ícono roto.
function renderFirmaExistente(contenedor, url) {
  contenedor.innerHTML = '';
  if (!url) return;
  const item = document.createElement('div');
  item.className = 'preview-item';
  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Firma cargada';
  img.loading = 'lazy';
  img.onerror = () => {
    contenedor.innerHTML = '<a href="' + url + '" target="_blank" rel="noopener">No se pudo previsualizar. Ver imagen original</a>';
  };
  item.appendChild(img);
  contenedor.appendChild(item);
}

$firmaPaciente.addEventListener('change', () => {
  nuevaFirmaPaciente = $firmaPaciente.files[0] || null;
  mostrarPreviewFirmaLocal($previewFirmaPaciente, nuevaFirmaPaciente);
});

$firmaProfesional.addEventListener('change', () => {
  nuevaFirmaProfesional = $firmaProfesional.files[0] || null;
  mostrarPreviewFirmaLocal($previewFirmaProfesional, nuevaFirmaProfesional);
});

function mostrarPreviewFirmaLocal(contenedor, file) {
  if (!file) return;
  contenedor.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'preview-item';
  const img = document.createElement('img');
  const lector = new FileReader();
  lector.onload = e => { img.src = e.target.result; };
  lector.readAsDataURL(file);
  item.appendChild(img);
  contenedor.appendChild(item);
}

function renderGaleriaExistente(imagenes, puedeEditar) {
  $galeriaExistente.innerHTML = '';
  imagenes.forEach(img => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `<img src="${img.url}" alt="Imagen del estudio" loading="lazy">` +
      (puedeEditar ? `<button class="quitar" title="Eliminar imagen" data-imgid="${img.id}">✕</button>` : '');
    // Si la imagen quedó con una URL vieja (de antes de la migración),
    // mostramos un link a Drive en vez de un ícono roto.
    const imgEl = item.querySelector('img');
    imgEl.addEventListener('error', () => {
      const aviso = document.createElement('a');
      aviso.href = img.url; aviso.target = '_blank'; aviso.rel = 'noopener';
      aviso.textContent = 'Ver imagen';
      aviso.className = 'hint';
      imgEl.replaceWith(aviso);
    });
    $galeriaExistente.appendChild(item);
  });

  $galeriaExistente.querySelectorAll('.quitar').forEach(btn => {
    btn.addEventListener('click', () => eliminarImagenExistente(btn.dataset.imgid));
  });
}

async function eliminarImagenExistente(imagenId) {
  if (!confirm('¿Eliminar esta imagen? Vas a poder subir otra en su lugar.')) return;
  try {
    const data = await apiPost({ action: 'eliminarImagen', token: sesion.token, imagenId });
    if (!data.ok) throw new Error(data.error || 'No se pudo eliminar');
    estudiosActuales = data.estudios || [];
    cargarDatosServicioSeleccionado();
    mostrarEstado($estadoGuardar, 'Imagen eliminada.', 'ok');
  } catch (err) {
    mostrarEstado($estadoGuardar, 'Error: ' + err.message, 'error');
  }
}

$imagenes.addEventListener('change', () => {
  Array.from($imagenes.files).forEach(f => nuevasImagenes.push(f));
  $imagenes.value = '';
  renderPreviewNuevas();
});

function renderPreviewNuevas() {
  $previewNuevas.innerHTML = '';
  nuevasImagenes.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    const img = document.createElement('img');
    const lector = new FileReader();
    lector.onload = e => { img.src = e.target.result; };
    lector.readAsDataURL(file);
    const btn = document.createElement('button');
    btn.className = 'quitar';
    btn.textContent = '✕';
    btn.title = 'Quitar de la lista (todavía no se subió)';
    btn.addEventListener('click', () => { nuevasImagenes.splice(idx, 1); renderPreviewNuevas(); });
    item.appendChild(img); item.appendChild(btn);
    $previewNuevas.appendChild(item);
  });
}

$btnGuardar.addEventListener('click', async () => {
  const dni = $dni.value.trim();
  const nombre = $nombre.value.trim();
  const apellido = $apellido.value.trim();
  const empresa = $empresa.value.trim();
  const servicio = $servicio.value;
  const profesional = $profesional.value.trim();
  const observaciones = $observaciones.value.trim();

  if (!dni || !nombre || !apellido) {
    mostrarEstado($estadoGuardar, 'Faltan datos del paciente (buscá o completá nombre y apellido).', 'error');
    return;
  }

  let laboratorio = null;
  if (servicio === 'Laboratorio') {
    laboratorio = {};
    $gridLab.querySelectorAll('input').forEach(inp => { laboratorio[inp.dataset.lab] = inp.value.trim(); });
  }

  let ddjj = null;
  if (servicio === SERVICIO_DDJJ) {
    ddjj = {};
    DDJJ_PREGUNTAS.forEach(p => {
      const radio = $listaDdjj.querySelector(`input[data-ddjj="${p.id}"]:checked`);
      const detalle = $listaDdjj.querySelector(`input[data-ddjj-detalle="${p.id}"]`);
      ddjj[p.id] = { respuesta: radio ? radio.value : '', detalle: detalle ? detalle.value.trim() : '' };
    });
  }

  $btnGuardar.disabled = true;
  mostrarEstado($estadoGuardar, 'Guardando...', '');

  try {
    const imagenesBase64 = await Promise.all(nuevasImagenes.map(async f => ({
      dataUrl: await leerComoBase64(f), nombre: f.name
    })));
    const firmaProfesionalBase64 = nuevaFirmaProfesional ? await leerComoBase64(nuevaFirmaProfesional) : null;
    const firmaPacienteBase64 = (servicio === SERVICIO_DDJJ && nuevaFirmaPaciente) ? await leerComoBase64(nuevaFirmaPaciente) : null;

    const data = await apiPost({
      action: 'guardarEstudio', token: sesion.token,
      dni, nombre, apellido, empresa, servicio, profesional, observaciones,
      laboratorio, ddjj, imagenesBase64,
      firmaProfesionalBase64, firmaPacienteBase64,
      fechaNacimiento: $fechaNacimiento.value,
      telefono: $telefono.value.trim(),
      direccion: $direccion.value.trim(),
      localidad: $localidad.value.trim(),
      provincia: $provincia.value.trim(),
      nacionalidad: $nacionalidad.value.trim()
    });
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    estudiosActuales = data.estudios || [];
    if (data.paciente && data.paciente.edad !== null && data.paciente.edad !== undefined) {
      $edad.value = data.paciente.edad + ' años';
    }
    pintarChecklist();
    $cardPdf.hidden = false;
    mostrarEstado($estadoGuardar, 'Estudio de "' + servicio + '" guardado correctamente.', 'ok');
    cargarDatosServicioSeleccionado();
  } catch (err) {
    mostrarEstado($estadoGuardar, 'Error: ' + err.message, 'error');
  } finally {
    $btnGuardar.disabled = false;
  }
});

function leerComoBase64(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}

$btnPdf.addEventListener('click', () => generarPdf($dni.value.trim(), false));
$btnCerrar.addEventListener('click', () => {
  if (confirm('¿Cerrar la ficha de este paciente? Se va a generar el PDF final.')) {
    generarPdf($dni.value.trim(), true);
  }
});

async function generarPdf(dni, cerrar) {
  if (!dni) return;
  [$btnPdf, $btnCerrar].forEach(b => b.disabled = true);
  mostrarEstado($estadoPdf, 'Generando PDF, puede tardar unos segundos...', '');

  try {
    const data = await apiPost({ action: cerrar ? 'cerrarFicha' : 'generarPDF', token: sesion.token, dni });
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    descargarPdfBase64(data.pdfBase64, data.nombreArchivo);
    mostrarEstado($estadoPdf, cerrar ? 'Ficha cerrada y PDF descargado.' : 'PDF generado y descargado.', 'ok');
    if (cerrar) mostrarEstado($estadoFicha, 'Ficha: Cerrada', 'error');
  } catch (err) {
    mostrarEstado($estadoPdf, 'Error: ' + err.message, 'error');
  } finally {
    [$btnPdf, $btnCerrar].forEach(b => b.disabled = false);
  }
}

function descargarPdfBase64(base64, nombreArchivo) {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombreArchivo || 'estudio.pdf';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* =========================================================
 *  VISTA: PACIENTES
 * ========================================================= */

async function cargarVistaPacientes() {
  $tablaPacientes.innerHTML = '<p class="hint">Cargando...</p>';
  try {
    const data = await apiGet('listarPacientes');
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    pacientesCache = data.pacientes || [];
    actualizarListaEmpresas(pacientesCache);
    renderizarListaPacientes();
  } catch (err) {
    $tablaPacientes.innerHTML = '<p class="hint error">Error: ' + err.message + '</p>';
  }
}

$filtroPacientes.addEventListener('input', renderizarListaPacientes);

$btnEliminarTanda.addEventListener('click', async () => {
  const desde = $tandaDesde.value;
  const hasta = $tandaHasta.value;
  if (!desde || !hasta) { mostrarEstado($estadoTanda, 'Completá ambas fechas.', 'error'); return; }
  if (desde > hasta) { mostrarEstado($estadoTanda, 'La fecha "Desde" no puede ser posterior a "Hasta".', 'error'); return; }

  if (!confirm('¿Eliminar definitivamente a TODOS los pacientes cuyo último estudio esté entre ' +
    formatearFecha(desde) + ' y ' + formatearFecha(hasta) + '? Esta acción no se puede deshacer.')) return;

  $btnEliminarTanda.disabled = true;
  mostrarEstado($estadoTanda, 'Eliminando...', '');
  try {
    const data = await apiPost({ action: 'eliminarPacientesPorRango', token: sesion.token, fechaDesde: desde, fechaHasta: hasta });
    if (!data.ok) throw new Error(data.error || 'No se pudo eliminar');
    pacientesCache = data.pacientes || [];
    renderizarListaPacientes();
    mostrarEstado($estadoTanda, (data.eliminados || 0) + ' paciente(s) eliminado(s).', 'ok');
  } catch (err) {
    mostrarEstado($estadoTanda, 'Error: ' + err.message, 'error');
  } finally {
    $btnEliminarTanda.disabled = false;
  }
});

function renderizarListaPacientes() {
  const filtro = $filtroPacientes.value.trim().toLowerCase();
  const filtrados = pacientesCache.filter(p =>
    !filtro ||
    String(p.dni).toLowerCase().includes(filtro) ||
    String(p.nombre).toLowerCase().includes(filtro) ||
    String(p.apellido).toLowerCase().includes(filtro) ||
    String(p.empresa).toLowerCase().includes(filtro)
  );

  if (filtrados.length === 0) {
    $tablaPacientes.innerHTML = '<p class="hint">No hay pacientes para mostrar.</p>';
    return;
  }

  $tablaPacientes.innerHTML = '';
  filtrados.forEach(p => $tablaPacientes.appendChild(filaPaciente(p)));
}

function filaPaciente(p) {
  const div = document.createElement('div');
  div.className = 'fila-paciente';

  const chips = SERVICIOS.map(s => {
    const hecho = p.serviciosCompletados.includes(s);
    return `<span class="chip${hecho ? ' done' : ''}">${s}</span>`;
  }).join('');

  const edadTxt = (p.edad !== null && p.edad !== undefined) ? ' · ' + p.edad + ' años' : '';

  div.innerHTML = `
    <div class="fp-datos">
      <div class="fp-nombre">${p.apellido}, ${p.nombre}${edadTxt} <span class="estado-pill ${p.estado === 'Cerrada' ? 'cerrada' : 'abierta'}">${p.estado}</span></div>
      <div class="fp-sub">DNI ${p.dni} · ${p.empresa} · Últ. estudio: ${formatearFecha(p.ultimaFechaEstudio)}</div>
      <div class="fp-chips">${chips}</div>
    </div>
    <div class="fp-acciones">
      <button class="btn btn-secondary btn-small" data-abrir="${p.dni}">Abrir</button>
      <button class="btn btn-accent btn-small" data-cerrar="${p.dni}">Cerrar + PDF</button>
      ${sesion.esAdmin ? `<button class="btn btn-danger btn-small" data-eliminar="${p.dni}">Eliminar</button>` : ''}
    </div>`;

  div.querySelector('[data-abrir]').addEventListener('click', () => {
    cambiarVista('cargar');
    buscarPaciente(p.dni);
  });
  div.querySelector('[data-cerrar]').addEventListener('click', () => {
    if (confirm('¿Cerrar la ficha de ' + p.nombre + ' ' + p.apellido + ' y generar el PDF?')) {
      generarPdf(p.dni, true);
    }
  });
  const btnEliminar = div.querySelector('[data-eliminar]');
  if (btnEliminar) {
    btnEliminar.addEventListener('click', async () => {
      if (!confirm('¿Eliminar definitivamente a ' + p.nombre + ' ' + p.apellido + '? Se borran sus estudios, imágenes y PDFs.')) return;
      btnEliminar.disabled = true;
      try {
        await eliminarPacienteYRefrescar(p.dni);
      } catch (err) {
        alert('Error: ' + err.message);
        btnEliminar.disabled = false;
      }
    });
  }

  return div;
}

async function eliminarPacienteYRefrescar(dni) {
  const data = await apiPost({ action: 'eliminarPaciente', token: sesion.token, dni });
  if (!data.ok) throw new Error(data.error || 'No se pudo eliminar');
  const vistaActiva = document.querySelector('.tab-btn.active').dataset.vista;
  if (vistaActiva === 'empresa') {
    cargarVistaEmpresa();
  } else {
    pacientesCache = data.pacientes || [];
    renderizarListaPacientes();
  }
}

function actualizarListaEmpresas(pacientes) {
  const empresas = Array.from(new Set(pacientes.map(p => p.empresa).filter(e => e && e !== '(sin empresa)')));
  $listaEmpresas.innerHTML = '';
  empresas.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e;
    $listaEmpresas.appendChild(opt);
  });
}

/* =========================================================
 *  VISTA: POR EMPRESA
 * ========================================================= */

async function cargarVistaEmpresa() {
  $gruposEmpresa.innerHTML = '<p class="hint">Cargando...</p>';
  try {
    const data = await apiGet('listarPorEmpresa');
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    renderizarPorEmpresa(data.grupos || {});
  } catch (err) {
    $gruposEmpresa.innerHTML = '<p class="hint error">Error: ' + err.message + '</p>';
  }
}

function renderizarPorEmpresa(grupos) {
  const empresas = Object.keys(grupos);
  if (empresas.length === 0) {
    $gruposEmpresa.innerHTML = '<p class="hint">Todavía no hay pacientes cargados.</p>';
    return;
  }

  $gruposEmpresa.innerHTML = '';
  empresas.forEach(empresa => {
    const wrapEmpresa = document.createElement('div');
    wrapEmpresa.className = 'grupo-empresa';
    wrapEmpresa.innerHTML = `<h3>${empresa}</h3>`;

    const fechas = Object.keys(grupos[empresa]);
    fechas.forEach(fecha => {
      const wrapFecha = document.createElement('div');
      wrapFecha.className = 'grupo-fecha';
      wrapFecha.innerHTML = `<h4>${fecha}</h4>`;

      grupos[empresa][fecha].forEach(p => wrapFecha.appendChild(filaPaciente(p)));
      wrapEmpresa.appendChild(wrapFecha);
    });

    $gruposEmpresa.appendChild(wrapEmpresa);
  });
}

/* =========================================================
 *  VISTA: USUARIOS (solo Administración)
 * ========================================================= */

async function cargarVistaUsuarios() {
  $tablaUsuarios.innerHTML = '<p class="hint">Cargando...</p>';
  try {
    const data = await apiGet('listarUsuarios');
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    $nuEspecialidad.innerHTML = '';
    data.roles.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = r;
      $nuEspecialidad.appendChild(opt);
    });

    renderizarUsuarios(data.usuarios || []);
  } catch (err) {
    $tablaUsuarios.innerHTML = '<p class="hint error">Error: ' + err.message + '</p>';
  }
}

function renderizarUsuarios(usuarios) {
  if (usuarios.length === 0) { $tablaUsuarios.innerHTML = '<p class="hint">No hay usuarios cargados.</p>'; return; }

  $tablaUsuarios.innerHTML = '';
  usuarios.forEach(u => {
    const div = document.createElement('div');
    div.className = 'fila-paciente';
    const esUsuarioActual = u.usuario.toLowerCase() === sesion.usuario.toLowerCase();
    div.innerHTML = `
      <div class="fp-datos">
        <div class="fp-nombre">${u.nombreCompleto} ${u.activo ? '' : '(deshabilitado)'}</div>
        <div class="fp-sub">usuario: ${u.usuario} · ${u.especialidad}</div>
      </div>
      <div class="fp-acciones">
        <button class="btn btn-secondary btn-small" data-reset="${u.usuario}">Resetear contraseña</button>
        ${esUsuarioActual ? '' : `<button class="btn btn-danger btn-small" data-eliminar-usuario="${u.usuario}">Eliminar</button>`}
      </div>`;
    div.querySelector('[data-reset]').addEventListener('click', async () => {
      const nueva = prompt('Nueva contraseña para "' + u.usuario + '":');
      if (!nueva) return;
      try {
        const data = await apiPost({ action: 'resetPassword', token: sesion.token, usuario: u.usuario, passwordNueva: nueva });
        if (!data.ok) throw new Error(data.error || 'No se pudo resetear');
        alert('Contraseña actualizada.');
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
    const btnEliminarUsuario = div.querySelector('[data-eliminar-usuario]');
    if (btnEliminarUsuario) {
      btnEliminarUsuario.addEventListener('click', async () => {
        if (!confirm('¿Eliminar al usuario "' + u.usuario + '"? No va a poder volver a ingresar.')) return;
        btnEliminarUsuario.disabled = true;
        try {
          const data = await apiPost({ action: 'eliminarUsuario', token: sesion.token, usuario: u.usuario });
          if (!data.ok) throw new Error(data.error || 'No se pudo eliminar');
          renderizarUsuarios(data.usuarios || []);
        } catch (err) {
          alert('Error: ' + err.message);
          btnEliminarUsuario.disabled = false;
        }
      });
    }
    $tablaUsuarios.appendChild(div);
  });
}

$btnCrearUsuario.addEventListener('click', async () => {
  const usuario = $nuUsuario.value.trim();
  const password = $nuPassword.value;
  const nombreCompleto = $nuNombre.value.trim();
  const especialidad = $nuEspecialidad.value;

  if (!usuario || !password || !nombreCompleto || !especialidad) {
    mostrarEstado($estadoUsuario, 'Completá todos los campos.', 'error');
    return;
  }

  $btnCrearUsuario.disabled = true;
  try {
    const data = await apiPost({ action: 'crearUsuario', token: sesion.token, usuario, password, nombreCompleto, especialidad });
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    mostrarEstado($estadoUsuario, 'Usuario creado.', 'ok');
    $nuUsuario.value = ''; $nuPassword.value = ''; $nuNombre.value = '';
    renderizarUsuarios(data.usuarios || []);
  } catch (err) {
    mostrarEstado($estadoUsuario, 'Error: ' + err.message, 'error');
  } finally {
    $btnCrearUsuario.disabled = false;
  }
});

/* =========================================================
 *  HELPER
 * ========================================================= */

function mostrarEstado(el, texto, tipo) {
  el.textContent = texto;
  el.className = 'hint' + (tipo ? ' ' + tipo : '');
}

/* =========================================================
 *  INICIO
 * ========================================================= */

if (cargarSesionGuardada()) {
  mostrarApp();
} else {
  mostrarLogin();
}
