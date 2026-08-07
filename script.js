/* =========================================================
 *  CONFIGURACIÓN
 *  Pegá acá la URL que te da Apps Script (Implementar > Nueva
 *  implementación > Aplicación web). Termina en /exec
 * ========================================================= */
const API_URL = 'PEGA_AQUI_LA_URL_DE_TU_APPS_SCRIPT/exec';

// Debe coincidir con SERVICIOS y LAB_CAMPOS de Code.gs
const SERVICIOS_FALLBACK = ['Rayos X', 'Laboratorio', 'Electrocardiograma', 'Otro estudio'];
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
const ROL_ADMIN = 'Administracion';

/* --------------------- Estado global --------------------- */
let sesion = null; // { token, usuario, nombreCompleto, especialidad, esAdmin }
let SERVICIOS = SERVICIOS_FALLBACK;
let LAB_CAMPOS = LAB_CAMPOS_FALLBACK;
let estudiosActuales = [];
let pacientesCache = [];
let nuevasImagenes = []; // File[] pendientes de subir para el estudio actual

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

const $cardServicio = document.getElementById('card-servicio');
const $servicio = document.getElementById('servicio');
const $avisoPermiso = document.getElementById('aviso-permiso');
const $profesional = document.getElementById('profesional');
const $bloqueLab = document.getElementById('bloque-laboratorio');
const $gridLab = document.getElementById('grid-laboratorio');
const $observaciones = document.getElementById('observaciones');
const $imagenes = document.getElementById('imagenes');
const $previewNuevas = document.getElementById('preview-nuevas');
const $galeriaWrap = document.getElementById('galeria-existente-wrap');
const $galeriaExistente = document.getElementById('galeria-existente');
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
 *  SESIÓN / LOGIN
 * ========================================================= */

function cargarSesionGuardada() {
  try {
    const guardada = JSON.parse(localStorage.getItem('sesionEstudios') || 'null');
    if (guardada && guardada.token) {
      sesion = guardada;
      SERVICIOS = guardada.servicios || SERVICIOS_FALLBACK;
      LAB_CAMPOS = guardada.labCampos || LAB_CAMPOS_FALLBACK;
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

  inicializarSelectServicio();
  inicializarGridLaboratorio();
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
      mostrarEstado($estadoBusqueda, 'Paciente encontrado.', 'ok');
      mostrarEstado($estadoFicha, 'Ficha: ' + (data.paciente.estado || 'Abierta'), data.paciente.estado === 'Cerrada' ? 'error' : 'ok');
    } else {
      $nombre.value = ''; $apellido.value = ''; $empresa.value = '';
      mostrarEstado($estadoBusqueda, 'No existe todavía: completá los datos para crearlo.', '');
      mostrarEstado($estadoFicha, '', '');
    }

    $datosNombre.hidden = false;
    $datosEmpresa.hidden = false;
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

$servicio.addEventListener('change', cargarDatosServicioSeleccionado);

function cargarDatosServicioSeleccionado() {
  const servicio = $servicio.value;
  const puedeEditar = sesion.esAdmin || sesion.especialidad === servicio;

  $avisoPermiso.hidden = puedeEditar;
  if (!puedeEditar) $avisoPermiso.textContent = 'Solo podés visualizar este estudio: no tenés permiso para editar "' + servicio + '".';

  [$profesional, $observaciones, $imagenes].forEach(el => el.disabled = !puedeEditar);
  $btnGuardar.disabled = !puedeEditar;

  $bloqueLab.hidden = servicio !== 'Laboratorio';
  $gridLab.querySelectorAll('input').forEach(inp => { inp.value = ''; inp.disabled = !puedeEditar; });

  const existente = estudiosActuales.find(e => e.servicio === servicio);

  $profesional.value = existente ? (existente.profesional || '') : '';
  $observaciones.value = existente ? (existente.observaciones || '') : '';

  if (existente && existente.laboratorio) {
    Object.keys(existente.laboratorio).forEach(id => {
      const input = document.getElementById('lab-' + id);
      if (input) input.value = existente.laboratorio[id] || '';
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
}

function renderGaleriaExistente(imagenes, puedeEditar) {
  $galeriaExistente.innerHTML = '';
  imagenes.forEach(img => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `<img src="${img.url}" alt="Imagen del estudio">` +
      (puedeEditar ? `<button class="quitar" title="Eliminar imagen" data-imgid="${img.id}">✕</button>` : '');
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

  $btnGuardar.disabled = true;
  mostrarEstado($estadoGuardar, 'Guardando...', '');

  try {
    const imagenesBase64 = await Promise.all(nuevasImagenes.map(async f => ({
      dataUrl: await leerComoBase64(f), nombre: f.name
    })));

    const data = await apiPost({
      action: 'guardarEstudio', token: sesion.token,
      dni, nombre, apellido, empresa, servicio, profesional, observaciones,
      laboratorio, imagenesBase64
    });
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    estudiosActuales = data.estudios || [];
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

  div.innerHTML = `
    <div class="fp-datos">
      <div class="fp-nombre">${p.apellido}, ${p.nombre} <span class="estado-pill ${p.estado === 'Cerrada' ? 'cerrada' : 'abierta'}">${p.estado}</span></div>
      <div class="fp-sub">DNI ${p.dni} · ${p.empresa}</div>
      <div class="fp-chips">${chips}</div>
    </div>
    <div class="fp-acciones">
      <button class="btn btn-secondary btn-small" data-abrir="${p.dni}">Abrir</button>
      <button class="btn btn-accent btn-small" data-cerrar="${p.dni}">Cerrar + PDF</button>
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

  return div;
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
    div.innerHTML = `
      <div class="fp-datos">
        <div class="fp-nombre">${u.nombreCompleto} ${u.activo ? '' : '(deshabilitado)'}</div>
        <div class="fp-sub">usuario: ${u.usuario} · ${u.especialidad}</div>
      </div>
      <div class="fp-acciones">
        <button class="btn btn-secondary btn-small" data-reset="${u.usuario}">Resetear contraseña</button>
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
