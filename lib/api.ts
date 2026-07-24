// lib/api.ts

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export function formatearFecha(fechaIso: string): string {
  if (!fechaIso) return '';
  const partes = fechaIso.slice(0, 10).split('-');
  if (partes.length !== 3) return fechaIso;
  const [año, mes, dia] = partes;
  return `${dia}/${mes}/${año}`;
}

async function postAction<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (!APPS_SCRIPT_URL) throw new Error('Falta configurar NEXT_PUBLIC_APPS_SCRIPT_URL.');
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  });
  const json: ApiResponse<T> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as T;
}

async function getAction<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  if (!APPS_SCRIPT_URL) throw new Error('Falta configurar NEXT_PUBLIC_APPS_SCRIPT_URL.');
  const query = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${query}`);
  const json: ApiResponse<T> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as T;
}

// ---- Tipos: Campaña ----

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

// ---- Tipos: Ficha de Ingreso ----

export interface LineaFichaIngreso {
  nombre_producto: string;
  cantidad_esperada: number;
  factor_conversion?: number; // 👈 NUEVO — opcional, 1 = sin conversión
}

export interface NuevaFichaIngresoPayload {
  codigo_campaña: string;
  ejecutivo: string;
  lineas: LineaFichaIngreso[];
}

export interface CrearFichaIngresoResultado {
  id_ficha: string;
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

// ---- Tipos: SOLPED ----

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

// ---- Tipos: Recepción ----

export interface ValidacionEjecutivo {
  valido: boolean;
  nombre?: string;
  codigo?: string;
}

export interface ValidacionAlmacen {
  valido: boolean;
  nombre?: string;
  codigo?: string;
}

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

export interface LineaRecepcionAlmacen {
  nombre_producto: string;
  cantidad_esperada: number;
  cantidad_recibida: number;
  unidad_recibida?: string; // 👈 NUEVO
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
  num_guia_remision?: string;
  numero_guia?: string;
  urls_fotos?: string[];
  urls_fotos_por_producto?: { nombre_producto: string; url: string }[];
  observaciones?: string;
  lineas: LineaRecepcionAlmacen[];
  fotos?: FotoRecepcionAlmacen[];
}

// ---- Funciones: Campaña ----

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

export function agregarElementosACampaña(payload: AgregarElementosPayload) {
  return postAction<AgregarElementosResultado>('agregarElementosACampaña', payload as unknown as Record<string, unknown>);
}

// ---- Funciones: SOLPED ----

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

// ---- Funciones: Recepción ----

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

// ---- Tipos: Despacho ----

export interface SolpedVigente {
  cabecera: {
    id_solped: string;
    codigo_campaña: string;
    version: number;
    estado: string;
    fecha_despacho: string;
    fecha_creacion: string;
    codigo_ejecutivo: string;
    cliente: string;
    marca: string;
  };
  detalle: LineaSolped[];
}

export interface ConfirmarDespachoPayload {
  id_solped: string;
  codigo_almacen: string;
  url_foto: string;
  observaciones?: string;
}

// ---- Funciones: Despacho ----

export function listarSolpedsVigentes() {
  return getAction<SolpedVigente[]>('solpedsVigentes');
}

export function obtenerSolpedParaDespacho(idSolped: string) {
  return getAction<SolpedVigente>('solpedDespacho', { id_solped: idSolped });
}

export function subirFotoDespacho(
  idSolped: string,
  codigoCampaña: string,
  base64Data: string,
  mimeType: string,
  nombreArchivo: string
) {
  return postAction<string>('subirFotoDespacho', {
    id_solped: idSolped,
    codigo_campaña: codigoCampaña,
    base64Data,
    mimeType,
    nombreArchivo,
  });
}

export function confirmarDespacho(payload: ConfirmarDespachoPayload) {
  return postAction<{ id_despacho: string }>(
    'confirmarDespacho',
    payload as unknown as Record<string, unknown>
  );
}

// ---- Tipos: Devolución ----

export interface DespachoParaDevolucion {
  cabecera: {
    id_despacho: string;
    codigo_campaña: string;
    fecha: string;
    despachado_por: string;
    cliente: string;
    marca: string;
  };
  detalle: {
    id_despacho: string;
    nombre_lugar: string;
    nombre_producto: string;
    cantidad_despachada: number;
  }[];
}

export interface LineaDevolucion {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_despachada: number;
  cantidad_devuelta: number;
}

export interface DevolucionPendiente {
  cabecera: {
    id_devolucion: string;
    id_despacho: string;
    codigo_campaña: string;
    codigo_ejecutivo: string;
    fecha_solicitud: string;
    estado: string;
    cliente: string;
    marca: string;
  };
  detalle: LineaDevolucion[];
}

export interface CrearDevolucionPayload {
  id_despacho: string;
  codigo_ejecutivo: string;
  lineas: LineaDevolucion[];
}

export interface ConfirmarDevolucionPayload {
  id_devolucion: string;
  codigo_almacen: string;
  url_foto: string;
  observaciones?: string;
}

// ---- Funciones: Devolución ----

export function listarDespachosDeCampaña(codigoEjecutivo: string) {
  return getAction<DespachoParaDevolucion[]>('despachosDeCampaña', {
    codigo_ejecutivo: codigoEjecutivo,
  });
}

export function obtenerDespachoParaDevolucion(idDespacho: string, codigoEjecutivo: string) {
  return getAction<DespachoParaDevolucion>('despachoParaDevolucion', {
    id_despacho: idDespacho,
    codigo_ejecutivo: codigoEjecutivo,
  });
}

export function listarDevolucionesPendientes() {
  return getAction<DevolucionPendiente[]>('devolucionesPendientes');
}

export function obtenerDevolucionParaConfirmar(idDevolucion: string) {
  return getAction<DevolucionPendiente>('devolucionParaConfirmar', {
    id_devolucion: idDevolucion,
  });
}

export function crearSolicitudDevolucion(payload: CrearDevolucionPayload) {
  return postAction<{ id_devolucion: string }>(
    'crearSolicitudDevolucion',
    payload as unknown as Record<string, unknown>
  );
}

export function subirFotoDevolucion(
  idDevolucion: string,
  codigoCampaña: string,
  base64Data: string,
  mimeType: string,
  nombreArchivo: string
) {
  return postAction<string>('subirFotoDevolucion', {
    id_devolucion: idDevolucion,
    codigo_campaña: codigoCampaña,
    base64Data,
    mimeType,
    nombreArchivo,
  });
}

export function confirmarDevolucion(payload: ConfirmarDevolucionPayload) {
  return postAction<{ confirmado: boolean }>(
    'confirmarDevolucion',
    payload as unknown as Record<string, unknown>
  );
}

// ---- Tipos: Inventario ----

export interface ProductoInventario {
  nombre_producto: string;
  unidad: string;    
  recibido: number;
  despachado: number;
  devuelto: number;
  stock: number;
  url_foto: string;
}

export interface CampañaInventario {
  codigo_campaña: string;
  cliente: string;
  marca: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  productos: ProductoInventario[];
}

// ---- Funciones: Inventario ----

export function obtenerInventario() {
  return getAction<CampañaInventario[]>('inventario');
}

// ---- Tipos: Seguimiento ----

export interface LineaIngresoSeguimiento {
  nombre_producto: string;
  cantidad_esperada: number;
  cantidad_recibida: number | null;
  url_foto: string;
  factor_conversion?: number; // 👈 NUEVO
  unidad_recibida?: string;   // 👈 NUEVO
}

export interface FichaSeguimiento {
  id_ficha: string;
  fecha_envio: string;
  estado: string;
  detalle: LineaIngresoSeguimiento[];
}

export interface LineaSolpedSeguimiento {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_solicitada: number;
}

export interface DespachoSeguimiento {
  id_despacho: string;
  fecha: string;
  despachado_por: string;
  detalle: LineaSolpedSeguimiento[];
}

export interface SolpedSeguimiento {
  id_solped: string;
  version: number;
  estado: string;
  fecha_despacho: string;
  fecha_creacion: string;
  despacho: DespachoSeguimiento | null;
  detalle: LineaSolpedSeguimiento[];
}

export interface LineaDevolucionSeguimiento {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_solicitada: number;
  confirmado: boolean;
}

export interface ConfirmacionDevolucion {
  fecha: string;
  recibido_por: string;
  observaciones: string;
}

export interface DevolucionSeguimiento {
  id_devolucion: string;
  id_despacho: string;
  fecha_solicitud: string;
  estado: string;
  confirmacion: ConfirmacionDevolucion | null;
  detalle: LineaDevolucionSeguimiento[];
}

export interface StockSeguimiento {
  nombre_producto: string;
  recibido: number;
  despachado: number;
  devuelto: number;
  stock: number;
}

export interface ExpedienteCampaña {
  cabecera: {
    codigo_campaña: string;
    cliente: string;
    marca: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string;
  };
  ingresos: FichaSeguimiento[];
  solicitudesDespacho: SolpedSeguimiento[];
  solicitudesDevolucion: DevolucionSeguimiento[];
  stock: StockSeguimiento[];
}

// ---- Funciones: Seguimiento ----

export function obtenerExpedienteCampaña(codigoCampaña: string, codigoEjecutivo: string) {
  return getAction<ExpedienteCampaña>('expedienteCampaña', {
    codigo_campaña  : codigoCampaña,
    codigo_ejecutivo: codigoEjecutivo,
  });
}

// En LineaIngresoSeguimiento agrega url_foto:
export interface LineaIngresoSeguimiento {
  nombre_producto: string;
  cantidad_esperada: number;
  cantidad_recibida: number | null;
  url_foto: string; // 👈 NUEVO
}

// En DespachoSeguimiento agrega url_foto:
export interface DespachoSeguimiento {
  id_despacho: string;
  fecha: string;
  despachado_por: string;
  url_foto: string; // 👈 NUEVO
  detalle: LineaSolpedSeguimiento[];
}

// En ConfirmacionDevolucion agrega url_foto:
export interface ConfirmacionDevolucion {
  fecha: string;
  recibido_por: string;
  observaciones: string;
  url_foto: string; // 👈 NUEVO
}