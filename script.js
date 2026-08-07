/* =========================================================
 *  CONFIGURACIÓN
 *  Pegá acá la URL que te da Apps Script al hacer "Implementar
 *  > Nueva implementación > Aplicación web". Termina en /exec
 * ========================================================= */
const API_URL = 'https://script.google.com/macros/s/AKfycbyLvjUH8YRkh_g9OI8Y0ht28kIVRmeq0qMbF84SoxAubodAfYwfSOtbgMM9u0f5Phwd/exec';

const SERVICIOS = ['Rayos X', 'Laboratorio', 'Electrocardiograma', 'Otro estudio'];

/* --------------------- Referencias DOM --------------------- */
const $dni = document.getElementById('dni');
const $btnBuscar = document.getElementById('btn-buscar');
const $estadoBusqueda = document.getElementById('estado-busqueda');
const $datosNombre = document.getElementById('datos-nombre');
const $nombre = document.getElementById('nombre');
const $apellido = document.getElementById('apellido');
const $checklist = document.getElementById('checklist');

const $cardServicio = document.getElementById('card-servicio');
const $servicio = document.getElementById('servicio');
const $observaciones = document.getElementById('observaciones');
const $imagen = document.getElementById('imagen');
const $preview = document.getElementById('preview');
const $btnGuardar = document.getElementById('btn-guardar');
const $estadoGuardar = document.getElementById('estado-guardar');

const $cardPdf = document.getElementById('card-pdf');
const $btnPdf = document.getElementById('btn-pdf');
const $estadoPdf = document.getElementById('estado-pdf');

let estudiosCargados = []; // estudios ya guardados para el paciente actual

/* --------------------- Inicialización --------------------- */
SERVICIOS.forEach(s => {
  const opt = document.createElement('option');
  opt.value = s;
  opt.textContent = s;
  $servicio.appendChild(opt);
});

$imagen.addEventListener('change', () => {
  const archivo = $imagen.files[0];
  if (!archivo) { $preview.hidden = true; return; }
  const lector = new FileReader();
  lector.onload = e => {
    $preview.src = e.target.result;
    $preview.hidden = false;
  };
  lector.readAsDataURL(archivo);
});

/* --------------------- Llamadas al backend --------------------- */

// Nota: usamos Content-Type "text/plain" en los POST a propósito.
// Es un truco estándar para evitar el preflight CORS con Apps Script,
// que no permite configurar headers de CORS en su respuesta.
async function llamarBackend(payload) {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Error de red: ' + resp.status);
  return resp.json();
}

async function buscarPacienteBackend(dni) {
  const url = API_URL + '?action=buscarPaciente&dni=' + encodeURIComponent(dni);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Error de red: ' + resp.status);
  return resp.json();
}

/* --------------------- Paso 1: Buscar paciente --------------------- */

$btnBuscar.addEventListener('click', async () => {
  const dni = $dni.value.trim();
  if (!dni) {
    mostrarEstado($estadoBusqueda, 'Ingresá un DNI para buscar.', 'error');
    return;
  }
  if (API_URL.includes('PEGA_AQUI')) {
    mostrarEstado($estadoBusqueda, 'Falta configurar API_URL en script.js con la URL de tu Apps Script.', 'error');
    return;
  }

  $btnBuscar.disabled = true;
  mostrarEstado($estadoBusqueda, 'Buscando...', '');

  try {
    const data = await buscarPacienteBackend(dni);
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    estudiosCargados = data.estudios || [];

    if (data.existe) {
      $nombre.value = data.paciente.nombre;
      $apellido.value = data.paciente.apellido;
      mostrarEstado($estadoBusqueda, 'Paciente encontrado.', 'ok');
    } else {
      $nombre.value = '';
      $apellido.value = '';
      mostrarEstado($estadoBusqueda, 'No existe todavía: completá nombre y apellido para crearlo.', '');
    }

    $datosNombre.hidden = false;
    pintarChecklist();
    $checklist.hidden = false;
    $cardServicio.hidden = false;
    $cardPdf.hidden = estudiosCargados.length === 0;
  } catch (err) {
    mostrarEstado($estadoBusqueda, 'Error: ' + err.message, 'error');
  } finally {
    $btnBuscar.disabled = false;
  }
});

function pintarChecklist() {
  $checklist.innerHTML = '';
  const cargados = new Set(estudiosCargados.map(e => e.servicio));
  SERVICIOS.forEach(s => {
    const chip = document.createElement('span');
    chip.className = 'chip' + (cargados.has(s) ? ' done' : '');
    chip.textContent = s;
    $checklist.appendChild(chip);
  });
}

/* --------------------- Paso 2: Guardar estudio --------------------- */

$btnGuardar.addEventListener('click', async () => {
  const dni = $dni.value.trim();
  const nombre = $nombre.value.trim();
  const apellido = $apellido.value.trim();
  const servicio = $servicio.value;
  const observaciones = $observaciones.value.trim();
  const archivo = $imagen.files[0];

  if (!dni || !nombre || !apellido) {
    mostrarEstado($estadoGuardar, 'Faltan datos del paciente (buscá o completá nombre y apellido).', 'error');
    return;
  }

  $btnGuardar.disabled = true;
  mostrarEstado($estadoGuardar, 'Guardando...', '');

  try {
    let imagenBase64 = '';
    if (archivo) {
      imagenBase64 = await leerComoBase64(archivo);
    }

    const data = await llamarBackend({
      action: 'guardarEstudio',
      dni, nombre, apellido, servicio, observaciones,
      imagenBase64,
      imagenNombre: archivo ? archivo.name : ''
    });

    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    estudiosCargados = data.estudios || [];
    pintarChecklist();
    $cardPdf.hidden = false;

    mostrarEstado($estadoGuardar, 'Estudio de "' + servicio + '" guardado correctamente.', 'ok');
    $observaciones.value = '';
    $imagen.value = '';
    $preview.hidden = true;
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

/* --------------------- Paso 3: Generar PDF --------------------- */

$btnPdf.addEventListener('click', async () => {
  const dni = $dni.value.trim();
  if (!dni) return;

  $btnPdf.disabled = true;
  mostrarEstado($estadoPdf, 'Generando PDF, puede tardar unos segundos...', '');

  try {
    const data = await llamarBackend({ action: 'generarPDF', dni });
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    descargarPdfBase64(data.pdfBase64, data.nombreArchivo);
    mostrarEstado($estadoPdf, 'PDF generado y descargado.', 'ok');
  } catch (err) {
    mostrarEstado($estadoPdf, 'Error: ' + err.message, 'error');
  } finally {
    $btnPdf.disabled = false;
  }
});

function descargarPdfBase64(base64, nombreArchivo) {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo || 'estudio.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* --------------------- Helper de mensajes --------------------- */

function mostrarEstado(el, texto, tipo) {
  el.textContent = texto;
  el.className = 'hint' + (tipo ? ' ' + tipo : '');
}
