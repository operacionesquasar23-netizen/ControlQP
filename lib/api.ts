// lib/api.ts
//
// Cliente para comunicarse con el backend de Google Apps Script.
// La URL viene de una variable de entorno porque cambia cada vez que
// se hace una nueva implementación del script (o si usas un script
// distinto en otro ambiente, ej. pruebas vs producción).
//
// En Vercel: Settings > Environment Variables > NEXT_PUBLIC_APPS_SCRIPT_URL
// En local: archivo .env.local con la misma variable.

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface ValidacionEjecutivo {
  valido: boolean;
  nombre?: string;
  codigo?: string;
}

/**
 * Formatea una fecha en formato "YYYY-MM-DD" (la que devuelve el
 * backend, ya normalizada) a "DD/MM/YYYY" para mostrar en pantalla.
 * Si el valor no tiene el formato esperado, lo devuelve tal cual
 * en vez de romper la UI.
 */
export function formatearFecha(fechaIso: string): string {
  if (!fechaIso) return '';
  const partes = fechaIso.slice(0, 10).split('-');
  if (partes.length !== 3) return fechaIso;
  const [año, mes, dia] = partes;
  return `${dia}/${mes}/${año}`;
}

async function postAction<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (!APPS_SCRIPT_URL) {
    throw new Error('Falta configurar NEXT_PUBLIC_APPS_SCRIPT_URL en las variables de entorno.');
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    // Content-Type text/plain evita un preflight OPTIONS que Apps Script
    // no siempre maneja bien. El body sigue siendo JSON válido.
    body: JSON.stringify({ action, payload }),
  });

  const json: ApiResponse<T> = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }
  return json.data as T;
}

async function getAction<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  if (!APPS_SCRIPT_URL) {
    throw new Error('Falta configurar NEXT_PUBLIC_APPS_SCRIPT_URL en las variables de entorno.');
  }

  const query = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${query}`);
  const json: ApiResponse<T> = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }
  return json.data as T;
}

// ---- Tipos del dominio (Paso 1: Campaña) ----

export interface Lugar {
  nombre_lugar: string;
  zona: 'Lima' | 'Provincia';
}

export interface Producto {
  nombre_producto: string;
  unidad: string;
  categoria: string;
}

export interface NuevaCampañaPayload {
  codigo_campaña: string;
  cliente: string;
  marca: string;
  codigo_ejecutivo: string;
  fecha_inicio: string;
  fecha_fin: string;
  lugares: Lugar[];
  productos: Producto[];
  forzarDuplicado?: boolean;
}

export interface CrearCampañaResultado {
  creado: boolean;
  advertenciaDuplicado: boolean;
}

export interface CampañaResumen {
  codigo_campaña: string;
  cliente: string;
  marca: string;
  ejecutivo: string;
  codigo_ejecutivo: string;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_creacion: string;
  estado: string;
}

// ---- Tipos del dominio (Paso 2: Ficha de Ingreso) ----

export interface CampañaProducto {
  codigo_campaña: string;
  nombre_producto: string;
  unidad: string;
  categoria: string;
}

export interface CampañaCompleta {
  cabecera: CampañaResumen;
  lugares: Lugar[];
  productos: CampañaProducto[];
}

export interface LineaFichaIngreso {
  nombre_producto: string;
  cantidad_esperada: number;
}

export interface NuevaFichaIngresoPayload {
  codigo_campaña: string;
  ejecutivo: string;
  lineas: LineaFichaIngreso[];
}

export interface CrearFichaIngresoResultado {
  id_ficha: string;
}

export interface ValidacionAlmacen {
  valido: boolean;
  nombre?: string;
  codigo?: string;
}

export interface FichaIngresoPendiente {
  id_ficha: string;
  codigo_campaña: string;
  cliente: string;
  marca: string;
  ejecutivo: string;
  fecha_creacion: string;
  estado: string;
  total_productos: number;
}

export interface LineaFichaIngresoDetalle {
  nombre_producto: string;
  unidad?: string;
  categoria?: string;
  cantidad_esperada: number;
}

export interface FichaIngresoDetalle {
  id_ficha: string;
  codigo_campaña: string;
  cliente: string;
  marca: string;
  ejecutivo: string;
  fecha_creacion: string;
  estado: string;
  lineas: LineaFichaIngresoDetalle[];
}

export interface LineaRecepcionAlmacen {
  nombre_producto: string;
  cantidad_esperada: number;
  cantidad_recibida: number;
}

export interface FotoRecepcionAlmacen {
  nombre_archivo: string;
  tipo_mime: string;
  contenido_base64: string;
  principal: boolean;
}

export interface ConfirmarRecepcionPayload {
  id_ficha: string;
  codigo_almacen: string;
  numero_guia: string;
  lineas: LineaRecepcionAlmacen[];
  fotos: FotoRecepcionAlmacen[];
}

export interface ConfirmarRecepcionResultado {
  id_recepcion: string;
}

export interface AgregarElementosPayload {
  codigo_campaña: string;
  codigo_ejecutivo: string;
  lugares?: Lugar[];
  productos?: Producto[];
}

export interface AgregarElementosResultado {
  lugaresAgregados: number;
  productosAgregados: number;
}

// ---- Funciones expuestas ----

export function crearCampaña(payload: NuevaCampañaPayload) {
  return postAction<CrearCampañaResultado>('crearCampaña', payload as unknown as Record<string, unknown>);
}

export function obtenerCategorias() {
  return getAction<string[]>('categorias');
}

export function listarCampañas(codigoEjecutivo: string) {
  return getAction<CampañaResumen[]>('campanas', { codigo_ejecutivo: codigoEjecutivo });
}

export function validarEjecutivo(codigoEjecutivo: string) {
  return getAction<ValidacionEjecutivo>('validarEjecutivo', { codigo_ejecutivo: codigoEjecutivo });
}

export function validarAlmacen(codigoAlmacen: string) {
  return getAction<ValidacionAlmacen>('validarAlmacen', { codigo_almacen: codigoAlmacen });
}

export function obtenerCampaña(codigoCampaña: string, codigoEjecutivo: string) {
  return getAction<CampañaCompleta>('campaña', { codigo_campaña: codigoCampaña, codigo_ejecutivo: codigoEjecutivo });
}

export function crearFichaIngreso(payload: NuevaFichaIngresoPayload) {
  return postAction<CrearFichaIngresoResultado>('crearFichaIngreso', payload as unknown as Record<string, unknown>);
}

export function listarFichasIngresoPendientes(codigoAlmacen: string) {
  return getAction<FichaIngresoPendiente[]>('fichasIngresoPendientes', { codigo_almacen: codigoAlmacen });
}

export function obtenerFichaIngreso(idFicha: string, codigoAlmacen: string) {
  return getAction<FichaIngresoDetalle>('fichaIngreso', { id_ficha: idFicha, codigo_almacen: codigoAlmacen });
}

export function confirmarRecepcionAlmacen(payload: ConfirmarRecepcionPayload) {
  return postAction<ConfirmarRecepcionResultado>(
    'confirmarRecepcionAlmacen',
    payload as unknown as Record<string, unknown>
  );
}

export function agregarElementosACampaña(payload: AgregarElementosPayload) {
  return postAction<AgregarElementosResultado>('agregarElementosACampaña', payload as unknown as Record<string, unknown>);
}

// ---- AGREGAR al final de lib/api.ts ----

// Tipos SOLPED
export interface LineaSolped {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_solicitada: number;
}

export interface NuevaSolpedPayload {
  codigo_campaña: string;
  codigo_ejecutivo: string;
  fecha_despacho: string;
  lineas: LineaSolped[];
}

export interface NuevaVersionSolpedPayload {
  id_solped_anterior: string;
  codigo_ejecutivo: string;
  fecha_despacho: string;
  motivo_cambio: string;
  lineas: LineaSolped[];
}

export interface SolpedCabecera {
  id_solped: string;
  codigo_campaña: string;
  version: number;
  id_solped_anterior: string;
  estado: string;
  fecha_despacho: string;
  fecha_creacion: string;
  codigo_ejecutivo: string;
  motivo_cambio: string;
}

export interface SolpedCompleta {
  cabecera: SolpedCabecera;
  detalle: LineaSolped[];
}

// Funciones SOLPED
export function obtenerSolpedsDeCampaña(codigoCampaña: string, codigoEjecutivo: string) {
  return getAction<SolpedCompleta[]>('solpedsCampaña', {
    codigo_campaña: codigoCampaña,
    codigo_ejecutivo: codigoEjecutivo,
  });
}

export function obtenerStockDisponible(codigoCampaña: string, codigoEjecutivo: string) {
  return getAction<Record<string, number>>('stockDisponible', {
    codigo_campaña: codigoCampaña,
    codigo_ejecutivo: codigoEjecutivo,
  });
}

export function crearSolpedInicial(payload: NuevaSolpedPayload) {
  return postAction<{ id_solped: string; version: number }>(
    'crearSolpedInicial',
    payload as unknown as Record<string, unknown>
  );
}

export function crearNuevaVersionSolped(payload: NuevaVersionSolpedPayload) {
  return postAction<{ id_solped: string; version: number }>(
    'crearNuevaVersionSolped',
    payload as unknown as Record<string, unknown>
  );
}

// Tipos Recepción
export interface FichaPendienteCabecera {
  id_ficha: string;
  codigo_campaña: string;
  fecha_envio: string;
  ejecutivo: string;
  estado: string;
  cliente: string;
  marca: string;
}

export interface FichaDetalleLine {
  nombre_producto: string;
  cantidad_esperada: number;
}

export interface FichaPendiente {
  cabecera: FichaPendienteCabecera;
  detalle: FichaDetalleLine[];
}

export interface ValidacionAlmacen {
  valido: boolean;
  nombre?: string;
  codigo?: string;
}

export interface LineaRecepcionPayload {
  nombre_producto: string;
  cantidad_esperada: number;
  cantidad_recibida: number;
}

export interface ConfirmarRecepcionPayload {
  id_ficha: string;
  codigo_almacen: string;
  num_guia_remision: string;
  urls_fotos: string[];
  observaciones?: string;
  lineas: LineaRecepcionPayload[];
}

// Funciones Recepción
export function validarAlmacen(codigoAlmacen: string) {
  return getAction<ValidacionAlmacen>('validarAlmacen', { codigo_almacen: codigoAlmacen });
}

export function listarFichasPendientes() {
  return getAction<FichaPendiente[]>('fichasPendientes');
}

export function obtenerFichaParaRecepcion(idFicha: string) {
  return getAction<FichaPendiente>('fichaRecepcion', { id_ficha: idFicha });
}

export function subirFotoRecepcion(
  idFicha: string,
  codigoCampaña: string,
  base64Data: string,
  mimeType: string,
  nombreArchivo: string
) {
  return postAction<string>('subirFotoRecepcion', {
    id_ficha: idFicha,
    codigo_campaña: codigoCampaña,
    base64Data,
    mimeType,
    nombreArchivo,
  });
}

export function confirmarRecepcion(payload: ConfirmarRecepcionPayload) {
  return postAction<{ id_recepcion: string }>(
    'confirmarRecepcion',
    payload as unknown as Record<string, unknown>
  );
}
