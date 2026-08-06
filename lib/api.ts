// lib/api.ts
import { supabase } from './supabase';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function formatearFecha(fechaIso: string): string {
  if (!fechaIso) return '';
  const partes = fechaIso.slice(0, 10).split('-');
  if (partes.length !== 3) return fechaIso;
  const [año, mes, dia] = partes;
  return `${dia}/${mes}/${año}`;
}

// Recorta el prefijo "QP-" y los guiones internos del código de campaña
// para usarlo dentro de IDs correlativos por campaña (ej: "QP-AJE-0001" -> "AJE0001")
function codigoCorto(codigoCampaña: string): string {
  return codigoCampaña.replace(/^QP-/, '').replace(/-/g, '');
}

async function query<T>(table: string, filters?: Record<string, any>, select = '*'): Promise<T[]> {
  let q = supabase.from(table).select(select);
  if (filters) {
    Object.entries(filters).forEach(([key, val]) => { q = q.eq(key, val); });
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as T[];
}

async function insert<T>(table: string, payload: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data as T;
}

async function update(table: string, match: Record<string, any>, changes: Record<string, any>): Promise<void> {
  let q = supabase.from(table).update(changes);
  Object.entries(match).forEach(([key, val]) => { q = q.eq(key, val); });
  const { error } = await q;
  if (error) throw new Error(error.message);
}

async function upsert<T>(table: string, payload: Record<string, any>, onConflict: string): Promise<T> {
  const { data, error } = await supabase.from(table).upsert(payload, { onConflict }).select().single();
  if (error) throw new Error(error.message);
  return data as T;
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────

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

export interface Lugar {
  nombre_lugar: string;
  zona: 'Lima' | 'Provincia';
}

export interface Producto {
  nombre_producto: string;
  unidad: string;
  categoria: string;
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

export interface LineaFichaIngreso {
  nombre_producto: string;
  cantidad_esperada: number;
  factor_conversion?: number;
}

export interface NuevaFichaIngresoPayload {
  codigo_campaña: string;
  ejecutivo: string;
  lineas: LineaFichaIngreso[];
}

export interface CrearFichaIngresoResultado {
  id_ficha: string;
}

export interface FichaDetalleLine {
  nombre_producto: string;
  cantidad_esperada: number;
  factor_conversion?: number;
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

export interface FichaPendiente {
  cabecera: FichaPendienteCabecera;
  detalle: FichaDetalleLine[];
}

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

export interface LineaRecepcionAlmacen {
  nombre_producto: string;
  cantidad_esperada: number;
  cantidad_recibida: number;
  unidad_recibida?: string;
}

export interface ConfirmarRecepcionPayload {
  id_ficha: string;
  codigo_almacen: string;
  num_guia_remision?: string;
  urls_fotos?: string[];
  urls_fotos_por_producto?: { nombre_producto: string; url: string }[];
  observaciones?: string;
  lineas: LineaRecepcionAlmacen[];
}

export interface CantidadRecibidaDevolucion {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_recibida: number;
}

export interface LineaDespachoTienda {
  nombre_producto: string;
  cantidad_solicitada: number;
  cantidad_despachada: number;
}

export interface ConfirmarDespachoTiendaPayload {
  id_solped: string;
  codigo_almacen: string;
  nombre_lugar: string;
  url_foto: string;
  observaciones?: string;
  lineas: LineaDespachoTienda[];
}

export interface TiendaDespacho {
  nombre_lugar: string;
  estado: 'pendiente' | 'despachado';
  id_despacho?: string;
  fecha_despacho?: string;
  lineas: LineaSolped[];
}

export interface ConfirmarDevolucionPayload {
  id_devolucion: string;
  codigo_almacen: string;
  url_foto: string;
  observaciones?: string;
  cantidades_recibidas?: CantidadRecibidaDevolucion[];
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

export interface CrearDevolucionPayload {
  id_despacho: string;
  codigo_ejecutivo: string;
  lineas: LineaDevolucion[];
}

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

export interface LineaIngresoSeguimiento {
  nombre_producto: string;
  cantidad_esperada: number;
  cantidad_esperada_base: number;
  factor_conversion: number;
  cantidad_recibida: number | null;
  unidad_recibida: string;
  url_foto: string;
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

export interface LineaDespachoConfirmado {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_solicitada: number;
  cantidad_despachada: number;
}

export interface DespachoSeguimiento {
  id_despacho: string;
  fecha: string;
  despachado_por: string;
  url_foto: string;
  detalle: LineaDespachoConfirmado[];
}

export interface VersionAnteriorSolped {
  id_solped: string;
  version: number;
  estado: string;
  fecha_creacion: string;
  motivo_cambio: string;
}

export interface SolpedSeguimiento {
  id_solped: string;
  version: number;
  estado: string;
  fecha_despacho: string;
  fecha_creacion: string;
  motivo_cambio: string;
  versiones_anteriores: VersionAnteriorSolped[];
  despachos: DespachoSeguimiento[];
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
  url_foto: string;
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

// ─── FUNCIONES ────────────────────────────────────────────────────────────────

// ── Validaciones ──────────────────────────────────────────────────────────────

export async function validarEjecutivo(codigoIngresado: string): Promise<ValidacionEjecutivo> {
  const codigo = codigoIngresado.trim().toUpperCase();
  const { data } = await supabase.from('ejecutivos').select('*')
    .eq('codigo_acceso', codigo).eq('activo', 'TRUE').neq('rol', 'almacen').single();
  if (!data) return { valido: false };
  return { valido: true, nombre: data.nombre_ejecutivo, codigo };
}

export async function validarAlmacen(codigoIngresado: string): Promise<ValidacionAlmacen> {
  const codigo = codigoIngresado.trim().toUpperCase();
  const { data } = await supabase.from('ejecutivos').select('*')
    .eq('codigo_acceso', codigo).eq('activo', 'TRUE').eq('rol', 'almacen').single();
  if (!data) return { valido: false };
  return { valido: true, nombre: data.nombre_ejecutivo, codigo };
}

// ── Categorías ────────────────────────────────────────────────────────────────

export async function obtenerCategorias(): Promise<string[]> {
  const { data } = await supabase.from('categorias').select('nombre_categoria');
  return (data || []).map((c: any) => c.nombre_categoria);
}

// ── Campañas ──────────────────────────────────────────────────────────────────

export async function listarCampañas(codigoEjecutivo: string): Promise<CampañaResumen[]> {
  const { data, error } = await supabase.from('campanas').select('*')
    .eq('codigo_ejecutivo', codigoEjecutivo);
  if (error) throw new Error(error.message);
  return (data || []).map((c: any) => ({
    codigo_campaña: c.codigo_campana,
    cliente       : c.cliente,
    marca         : c.marca,
    ejecutivo     : c.ejecutivo,
    codigo_ejecutivo: c.codigo_ejecutivo,
    fecha_inicio  : c.fecha_inicio,
    fecha_fin     : c.fecha_fin,
    fecha_creacion: c.fecha_creacion,
    estado        : c.estado,
  }));
}

export async function obtenerCampaña(codigoCampaña: string, codigoEjecutivo: string): Promise<CampañaCompleta> {
  const { data: camp, error } = await supabase.from('campanas').select('*')
    .eq('codigo_campana', codigoCampaña).eq('codigo_ejecutivo', codigoEjecutivo).single();
  if (error || !camp) throw new Error('Campaña no encontrada.');

  const { data: lugares } = await supabase.from('campanas_lugares').select('*').eq('codigo_campana', codigoCampaña);
  const { data: productos } = await supabase.from('campanas_productos').select('*').eq('codigo_campana', codigoCampaña);

  return {
    cabecera: {
      codigo_campaña  : camp.codigo_campana,
      cliente         : camp.cliente,
      marca           : camp.marca,
      ejecutivo       : camp.ejecutivo,
      codigo_ejecutivo: camp.codigo_ejecutivo,
      fecha_inicio    : camp.fecha_inicio,
      fecha_fin       : camp.fecha_fin,
      fecha_creacion  : camp.fecha_creacion,
      estado          : camp.estado,
    },
    lugares : (lugares || []).map((l: any) => ({ nombre_lugar: l.nombre_lugar, zona: l.zona })),
    productos: (productos || []).map((p: any) => ({ codigo_campaña: p.codigo_campana, nombre_producto: p.nombre_producto, unidad: p.unidad, categoria: p.categoria })),
  };
}

export async function crearCampaña(payload: NuevaCampañaPayload): Promise<CrearCampañaResultado> {
  const codigoUp = payload.codigo_campaña.trim().toUpperCase();

  if (!payload.forzarDuplicado) {
    const { data: existe } = await supabase.from('campanas').select('codigo_campana').eq('codigo_campana', codigoUp).single();
    if (existe) return { creado: false, advertenciaDuplicado: true };
  }

  await supabase.from('campanas').upsert({
    codigo_campana  : codigoUp,
    cliente         : payload.cliente,
    marca           : payload.marca,
    ejecutivo       : payload.codigo_ejecutivo,
    codigo_ejecutivo: payload.codigo_ejecutivo,
    fecha_inicio    : payload.fecha_inicio,
    fecha_fin       : payload.fecha_fin,
    estado          : 'activa',
    fecha_creacion  : new Date().toISOString(),
  }, { onConflict: 'codigo_campana' });

  for (const l of payload.lugares) {
    await supabase.from('campanas_lugares').insert({ codigo_campana: codigoUp, nombre_lugar: l.nombre_lugar, zona: l.zona });
  }
  for (const p of payload.productos) {
    await supabase.from('campanas_productos').insert({ codigo_campana: codigoUp, nombre_producto: p.nombre_producto, unidad: p.unidad, categoria: p.categoria });
  }

  return { creado: true, advertenciaDuplicado: false };
}

export async function agregarElementosACampaña(payload: AgregarElementosPayload): Promise<AgregarElementosResultado> {
  let lugaresAgregados = 0;
  let productosAgregados = 0;
  for (const l of payload.lugares || []) {
    await supabase.from('campanas_lugares').insert({ codigo_campana: payload.codigo_campaña, nombre_lugar: l.nombre_lugar, zona: l.zona });
    lugaresAgregados++;
  }
  for (const p of payload.productos || []) {
    await supabase.from('campanas_productos').insert({ codigo_campana: payload.codigo_campaña, nombre_producto: p.nombre_producto, unidad: p.unidad, categoria: p.categoria });
    productosAgregados++;
  }
  return { lugaresAgregados, productosAgregados };
}

// ── Fichas de Ingreso ─────────────────────────────────────────────────────────

export async function crearFichaIngreso(payload: NuevaFichaIngresoPayload): Promise<CrearFichaIngresoResultado> {
  const { count } = await supabase
    .from('fichas_ingreso')
    .select('*', { count: 'exact', head: true })
    .eq('codigo_campana', payload.codigo_campaña);
  const idFicha = `FIC-${codigoCorto(payload.codigo_campaña)}-` + String((count || 0) + 1).padStart(4, '0');

  await supabase.from('fichas_ingreso').insert({
    id_ficha      : idFicha,
    codigo_campana: payload.codigo_campaña,
    fecha_envio   : new Date().toISOString(),
    ejecutivo     : payload.ejecutivo,
    estado        : 'pendiente',
  });

  for (const l of payload.lineas) {
    await supabase.from('fichas_ingreso_detalle').insert({
      id_ficha         : idFicha,
      nombre_producto  : l.nombre_producto,
      cantidad_esperada: l.cantidad_esperada,
      factor_conversion: l.factor_conversion || 1,
    });
  }

  return { id_ficha: idFicha };
}

export async function listarFichasPendientes(): Promise<FichaPendiente[]> {
  const { data: fichas } = await supabase.from('fichas_ingreso').select('*').eq('estado', 'pendiente');
  if (!fichas) return [];

  const resultado: FichaPendiente[] = [];
  for (const f of fichas) {
    const { data: camp } = await supabase.from('campanas').select('cliente,marca').eq('codigo_campana', f.codigo_campana).single();
    const { data: detalle } = await supabase.from('fichas_ingreso_detalle').select('*').eq('id_ficha', f.id_ficha);
    resultado.push({
      cabecera: {
        id_ficha      : f.id_ficha,
        codigo_campaña: f.codigo_campana,
        fecha_envio   : f.fecha_envio,
        ejecutivo     : f.ejecutivo,
        estado        : f.estado,
        cliente       : camp?.cliente || '',
        marca         : camp?.marca || '',
      },
      detalle: (detalle || []).map((d: any) => ({
        nombre_producto  : d.nombre_producto,
        cantidad_esperada: d.cantidad_esperada,
        factor_conversion: d.factor_conversion,
      })),
    });
  }
  return resultado.sort((a, b) => new Date(b.cabecera.fecha_envio).getTime() - new Date(a.cabecera.fecha_envio).getTime());
}

export async function obtenerFichaParaRecepcion(idFicha: string): Promise<FichaPendiente> {
  const { data: f } = await supabase.from('fichas_ingreso').select('*').eq('id_ficha', idFicha).single();
  if (!f) throw new Error('No se encontró la ficha ' + idFicha);
  const { data: camp } = await supabase.from('campanas').select('cliente,marca').eq('codigo_campana', f.codigo_campana).single();
  const { data: detalle } = await supabase.from('fichas_ingreso_detalle').select('*').eq('id_ficha', idFicha);
  return {
    cabecera: {
      id_ficha      : f.id_ficha,
      codigo_campaña: f.codigo_campana,
      fecha_envio   : f.fecha_envio,
      ejecutivo     : f.ejecutivo,
      estado        : f.estado,
      cliente       : camp?.cliente || '',
      marca         : camp?.marca || '',
    },
    detalle: (detalle || []).map((d: any) => ({
      nombre_producto  : d.nombre_producto,
      cantidad_esperada: d.cantidad_esperada,
      factor_conversion: d.factor_conversion || 1,
    })),
  };
}

// ── Recepción ─────────────────────────────────────────────────────────────────

export async function subirFotoRecepcion(idFicha: string, codigoCampaña: string, base64Data: string, mimeType: string, nombreArchivo: string): Promise<string> {
  // Las fotos siguen subiendo al Apps Script — solo la URL se guarda en Supabase
  const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'subirFotoRecepcion', payload: { id_ficha: idFicha, codigo_campaña: codigoCampaña, base64Data, mimeType, nombreArchivo } }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as string;
}

export async function subirFotoDespacho(idSolped: string, codigoCampaña: string, base64Data: string, mimeType: string, nombreArchivo: string): Promise<string> {
  const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'subirFotoDespacho', payload: { id_solped: idSolped, codigo_campaña: codigoCampaña, base64Data, mimeType, nombreArchivo } }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as string;
}

export async function subirFotoDevolucion(idDevolucion: string, codigoCampaña: string, base64Data: string, mimeType: string, nombreArchivo: string): Promise<string> {
  const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'subirFotoDevolucion', payload: { id_devolucion: idDevolucion, codigo_campaña: codigoCampaña, base64Data, mimeType, nombreArchivo } }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as string;
}

export async function confirmarRecepcion(payload: ConfirmarRecepcionPayload): Promise<{ id_recepcion: string }> {
  const { data: ficha } = await supabase.from('fichas_ingreso').select('*').eq('id_ficha', payload.id_ficha).single();
  if (!ficha) throw new Error('No se encontró la ficha ' + payload.id_ficha);
  if (ficha.estado === 'recibida') throw new Error('Esta ficha ya fue confirmada.');

  const { count } = await supabase
    .from('recepciones')
    .select('*', { count: 'exact', head: true })
    .eq('codigo_campana', ficha.codigo_campana);
  const idRecepcion = `REC-${codigoCorto(ficha.codigo_campana)}-` + String((count || 0) + 1).padStart(4, '0');

  await supabase.from('recepciones').insert({
    id_recepcion    : idRecepcion,
    id_ficha        : payload.id_ficha,
    codigo_campana  : ficha.codigo_campana,
    fecha           : new Date().toISOString(),
    recibido_por    : payload.codigo_almacen,
    num_guia_remision: payload.num_guia_remision || '',
    observaciones   : payload.observaciones || '',
  });

  const mapaFotos: Record<string, string> = {};
  (payload.urls_fotos_por_producto || []).forEach((f) => { mapaFotos[f.nombre_producto] = f.url; });

  const { data: detalleFicha } = await supabase.from('fichas_ingreso_detalle').select('*').eq('id_ficha', payload.id_ficha);
  const mapaFactor: Record<string, number> = {};
  (detalleFicha || []).forEach((d: any) => { mapaFactor[d.nombre_producto] = Number(d.factor_conversion) || 1; });

  for (const linea of payload.lineas) {
    await supabase.from('recepciones_detalle').insert({
      id_recepcion    : idRecepcion,
      nombre_producto : linea.nombre_producto,
      cantidad_esperada: linea.cantidad_esperada,
      cantidad_recibida: linea.cantidad_recibida,
      url_foto        : mapaFotos[linea.nombre_producto] || '',
      unidad_recibida : linea.unidad_recibida || 'Unidad',
    });

    // Actualizar stock_actual
    await actualizarStockActual(ficha.codigo_campana, linea.nombre_producto, linea.cantidad_recibida, 0, 0, mapaFotos[linea.nombre_producto] || '');
  }

  await supabase.from('fichas_ingreso').update({ estado: 'recibida' }).eq('id_ficha', payload.id_ficha);

  return { id_recepcion: idRecepcion };
}

// ── Stock ─────────────────────────────────────────────────────────────────────

async function actualizarStockActual(codigoCampana: string, nombreProducto: string, deltaRecibido: number, deltaDespachado: number, deltaDevuelto: number, urlFoto?: string): Promise<void> {
  const { data: existing } = await supabase.from('stock_actual').select('*')
    .eq('codigo_campana', codigoCampana).eq('nombre_producto', nombreProducto).single();

  if (existing) {
    const recibido   = Number(existing.recibido)   + deltaRecibido;
    const despachado = Number(existing.despachado) + deltaDespachado;
    const devuelto   = Number(existing.devuelto)   + deltaDevuelto;
    await supabase.from('stock_actual').update({
      recibido, despachado, devuelto,
      stock               : recibido - despachado + devuelto,
      ultima_actualizacion: new Date().toISOString(),
      url_foto            : urlFoto || existing.url_foto || '',
    }).eq('codigo_campana', codigoCampana).eq('nombre_producto', nombreProducto);
  } else {
    const recibido   = deltaRecibido;
    const despachado = deltaDespachado;
    const devuelto   = deltaDevuelto;
    await supabase.from('stock_actual').insert({
      codigo_campana      : codigoCampana,
      nombre_producto     : nombreProducto,
      recibido, despachado, devuelto,
      stock               : recibido - despachado + devuelto,
      ultima_actualizacion: new Date().toISOString(),
      url_foto            : urlFoto || '',
    });
  }
}

export async function obtenerStockDisponible(codigoCampaña: string, codigoEjecutivo: string): Promise<Record<string, number>> {
  const { data: stockRows } = await supabase.from('stock_actual').select('*').eq('codigo_campana', codigoCampaña);
  const totalIngresado: Record<string, number> = {};
  (stockRows || []).forEach((s: any) => { totalIngresado[s.nombre_producto] = Number(s.stock) || 0; });

  // Restar SOLPEDs vigentes
  const { data: solpeds } = await supabase.from('solped').select('id_solped').eq('codigo_campana', codigoCampaña).eq('estado', 'vigente');
  const idsVigentes = (solpeds || []).map((s: any) => s.id_solped);

  if (idsVigentes.length > 0) {
    const { data: detalles } = await supabase.from('solped_detalle').select('*').in('id_solped', idsVigentes);
    (detalles || []).forEach((d: any) => {
      totalIngresado[d.nombre_producto] = (totalIngresado[d.nombre_producto] || 0) - Number(d.cantidad_solicitada);
    });
  }

  return totalIngresado;
}

// ── SOLPED ────────────────────────────────────────────────────────────────────

export async function crearSolpedInicial(payload: NuevaSolpedPayload): Promise<{ id_solped: string; version: number }> {
  const { count } = await supabase
    .from('solped')
    .select('*', { count: 'exact', head: true })
    .eq('codigo_campana', payload.codigo_campaña);
  const idSolped = `SOL-${codigoCorto(payload.codigo_campaña)}-` + String((count || 0) + 1).padStart(4, '0');

  await supabase.from('solped').insert({
    id_solped       : idSolped,
    codigo_campana  : payload.codigo_campaña,
    version         : 1,
    estado          : 'vigente',
    fecha_despacho  : payload.fecha_despacho,
    fecha_creacion  : new Date().toISOString(),
    codigo_ejecutivo: payload.codigo_ejecutivo,
    motivo_cambio   : 'Creación inicial',
  });

  for (const l of payload.lineas) {
    await supabase.from('solped_detalle').insert({
      id_solped          : idSolped,
      nombre_lugar       : l.nombre_lugar,
      nombre_producto    : l.nombre_producto,
      cantidad_solicitada: l.cantidad_solicitada,
    });
  }

  return { id_solped: idSolped, version: 1 };
}

// Devuelve el set de tiendas que ya tienen al menos un despacho confirmado para esta SOLPED
async function obtenerTiendasDespachadas(idSolped: string): Promise<Set<string>> {
  const { data: despachos } = await supabase.from('despachos').select('id_despacho').eq('id_solped', idSolped);
  const idsDespachos = (despachos || []).map((d: any) => d.id_despacho);
  if (idsDespachos.length === 0) return new Set();
  const { data: detalles } = await supabase.from('despachos_detalle').select('nombre_lugar').in('id_despacho', idsDespachos);
  return new Set((detalles || []).map((d: any) => d.nombre_lugar));
}

export async function crearNuevaVersionSolped(payload: NuevaVersionSolpedPayload): Promise<{ id_solped: string; version: number }> {
  const { data: anterior } = await supabase.from('solped').select('*').eq('id_solped', payload.id_solped_anterior).single();
  if (!anterior) throw new Error('No se encontró la SOLPED anterior.');

  // La nueva versión solo debe cubrir tiendas que aún no fueron despachadas en la anterior
  const tiendasDespachadas = await obtenerTiendasDespachadas(payload.id_solped_anterior);
  const lineasPendientes = payload.lineas.filter((l) => !tiendasDespachadas.has(l.nombre_lugar));
  if (lineasPendientes.length === 0) {
    throw new Error('Todas las tiendas de esta SOLPED ya fueron despachadas; no queda nada pendiente para una nueva versión.');
  }

  const nuevaVersion = Number(anterior.version) + 1;
  const { count } = await supabase
    .from('solped')
    .select('*', { count: 'exact', head: true })
    .eq('codigo_campana', anterior.codigo_campana);
  const idSolped = `SOL-${codigoCorto(anterior.codigo_campana)}-` + String((count || 0) + 1).padStart(4, '0');

  // Marcar anterior como reemplazada
  await supabase.from('solped').update({ estado: 'reemplazada' }).eq('id_solped', payload.id_solped_anterior);

  await supabase.from('solped').insert({
    id_solped          : idSolped,
    codigo_campana     : anterior.codigo_campana,
    version            : nuevaVersion,
    id_solped_anterior : payload.id_solped_anterior,
    estado             : 'vigente',
    fecha_despacho     : payload.fecha_despacho,
    fecha_creacion     : new Date().toISOString(),
    codigo_ejecutivo   : payload.codigo_ejecutivo,
    motivo_cambio      : payload.motivo_cambio,
  });

  for (const l of lineasPendientes) {
    await supabase.from('solped_detalle').insert({
      id_solped          : idSolped,
      nombre_lugar       : l.nombre_lugar,
      nombre_producto    : l.nombre_producto,
      cantidad_solicitada: l.cantidad_solicitada,
    });
  }

  return { id_solped: idSolped, version: nuevaVersion };
}

export async function obtenerSolpedsDeCampaña(codigoCampaña: string, codigoEjecutivo: string): Promise<SolpedCompleta[]> {
  const { data: solpeds } = await supabase.from('solped').select('*').eq('codigo_campana', codigoCampaña).eq('codigo_ejecutivo', codigoEjecutivo);
  if (!solpeds) return [];

  const resultado: SolpedCompleta[] = [];
  for (const s of solpeds) {
    const { data: detalle } = await supabase.from('solped_detalle').select('*').eq('id_solped', s.id_solped);
    resultado.push({
      cabecera: {
        id_solped          : s.id_solped,
        codigo_campaña     : s.codigo_campana,
        version            : s.version,
        id_solped_anterior : s.id_solped_anterior,
        estado             : s.estado,
        fecha_despacho     : s.fecha_despacho,
        fecha_creacion     : s.fecha_creacion,
        codigo_ejecutivo   : s.codigo_ejecutivo,
        motivo_cambio      : s.motivo_cambio,
      },
      detalle: (detalle || []).map((d: any) => ({ nombre_lugar: d.nombre_lugar, nombre_producto: d.nombre_producto, cantidad_solicitada: d.cantidad_solicitada })),
    });
  }
  return resultado;
}

// ── Despacho ──────────────────────────────────────────────────────────────────

export async function listarSolpedsVigentes(): Promise<SolpedVigente[]> {
  const { data: solpeds } = await supabase.from('solped').select('*').in('estado', ['vigente', 'parcialmente_despachada']);
  if (!solpeds) return [];

  const resultado: SolpedVigente[] = [];
  for (const s of solpeds) {
    const { data: camp } = await supabase.from('campanas').select('cliente,marca').eq('codigo_campana', s.codigo_campana).single();
    const { data: detalle } = await supabase.from('solped_detalle').select('*').eq('id_solped', s.id_solped);
    resultado.push({
      cabecera: {
        id_solped       : s.id_solped,
        codigo_campaña  : s.codigo_campana,
        version         : s.version,
        estado          : s.estado,
        fecha_despacho  : s.fecha_despacho,
        fecha_creacion  : s.fecha_creacion,
        codigo_ejecutivo: s.codigo_ejecutivo,
        cliente         : camp?.cliente || '',
        marca           : camp?.marca || '',
      },
      detalle: (detalle || []).map((d: any) => ({ nombre_lugar: d.nombre_lugar, nombre_producto: d.nombre_producto, cantidad_solicitada: d.cantidad_solicitada })),
    });
  }
  return resultado.sort((a, b) => new Date(a.cabecera.fecha_despacho).getTime() - new Date(b.cabecera.fecha_despacho).getTime());
}

export async function obtenerSolpedParaDespacho(idSolped: string): Promise<SolpedVigente> {
  const { data: s } = await supabase.from('solped').select('*').eq('id_solped', idSolped).single();
  if (!s) throw new Error('No se encontró la SOLPED ' + idSolped);
  if (s.estado !== 'vigente' && s.estado !== 'parcialmente_despachada') throw new Error('La SOLPED no está vigente.');
  const { data: camp } = await supabase.from('campanas').select('cliente,marca').eq('codigo_campana', s.codigo_campana).single();
  const { data: detalle } = await supabase.from('solped_detalle').select('*').eq('id_solped', idSolped);
  return {
    cabecera: {
      id_solped       : s.id_solped,
      codigo_campaña  : s.codigo_campana,
      version         : s.version,
      estado          : s.estado,
      fecha_despacho  : s.fecha_despacho,
      fecha_creacion  : s.fecha_creacion,
      codigo_ejecutivo: s.codigo_ejecutivo,
      cliente         : camp?.cliente || '',
      marca           : camp?.marca || '',
    },
    detalle: (detalle || []).map((d: any) => ({ nombre_lugar: d.nombre_lugar, nombre_producto: d.nombre_producto, cantidad_solicitada: d.cantidad_solicitada })),
  };
}

// Agrupa el detalle de la SOLPED por tienda y marca cuáles ya tienen un despacho confirmado
export async function obtenerEstadoTiendasSolped(idSolped: string): Promise<TiendaDespacho[]> {
  const { data: detalle } = await supabase.from('solped_detalle').select('*').eq('id_solped', idSolped);
  const { data: despachos } = await supabase.from('despachos').select('id_despacho,fecha').eq('id_solped', idSolped);
  const idsDespachos = (despachos || []).map((d: any) => d.id_despacho);
  const detallesDespacho = idsDespachos.length > 0
    ? (await supabase.from('despachos_detalle').select('id_despacho,nombre_lugar').in('id_despacho', idsDespachos)).data || []
    : [];

  const porTienda = (detalle || []).reduce((acc: Record<string, LineaSolped[]>, d: any) => {
    if (!acc[d.nombre_lugar]) acc[d.nombre_lugar] = [];
    acc[d.nombre_lugar].push({ nombre_lugar: d.nombre_lugar, nombre_producto: d.nombre_producto, cantidad_solicitada: d.cantidad_solicitada });
    return acc;
  }, {});

  return Object.entries(porTienda).map(([nombre_lugar, lineas]) => {
    const detDespacho = detallesDespacho.find((dd: any) => dd.nombre_lugar === nombre_lugar);
    const despachoCabecera = detDespacho ? (despachos || []).find((d: any) => d.id_despacho === detDespacho.id_despacho) : null;
    return {
      nombre_lugar,
      estado: detDespacho ? 'despachado' : 'pendiente',
      id_despacho: detDespacho?.id_despacho,
      fecha_despacho: despachoCabecera?.fecha,
      lineas,
    };
  });
}

// Recalcula el estado de la SOLPED según cuántas tiendas ya tienen despacho confirmado
async function recalcularEstadoSolped(idSolped: string): Promise<void> {
  const { data: detalle } = await supabase.from('solped_detalle').select('nombre_lugar').eq('id_solped', idSolped);
  const tiendasTotales = new Set((detalle || []).map((d: any) => d.nombre_lugar));
  const tiendasDespachadas = await obtenerTiendasDespachadas(idSolped);

  let nuevoEstado: string;
  if (tiendasDespachadas.size === 0) nuevoEstado = 'vigente';
  else if (tiendasDespachadas.size >= tiendasTotales.size) nuevoEstado = 'despachada';
  else nuevoEstado = 'parcialmente_despachada';

  await supabase.from('solped').update({ estado: nuevoEstado }).eq('id_solped', idSolped);
}

export async function confirmarDespachoTienda(payload: ConfirmarDespachoTiendaPayload): Promise<{ id_despacho: string }> {
  const { data: solped } = await supabase.from('solped').select('*').eq('id_solped', payload.id_solped).single();
  if (!solped) throw new Error('No se encontró la SOLPED ' + payload.id_solped);
  if (solped.estado !== 'vigente' && solped.estado !== 'parcialmente_despachada') throw new Error('La SOLPED no está vigente.');

  // Esta tienda no debe haber sido despachada ya dentro de esta SOLPED
  const tiendasDespachadas = await obtenerTiendasDespachadas(payload.id_solped);
  if (tiendasDespachadas.has(payload.nombre_lugar)) {
    throw new Error(`La tienda "${payload.nombre_lugar}" ya fue despachada para esta SOLPED.`);
  }

  // Bloqueo: no se puede despachar más de lo solicitado por producto
  for (const l of payload.lineas) {
    if (l.cantidad_despachada > l.cantidad_solicitada) {
      throw new Error(`No puedes despachar más de lo solicitado para "${l.nombre_producto}" (solicitado: ${l.cantidad_solicitada}, ingresado: ${l.cantidad_despachada}).`);
    }
    if (l.cantidad_despachada < 0) {
      throw new Error(`La cantidad despachada de "${l.nombre_producto}" no puede ser negativa.`);
    }
  }

  const { count } = await supabase
    .from('despachos')
    .select('*', { count: 'exact', head: true })
    .eq('codigo_campana', solped.codigo_campana);
  const idDespacho = `DES-${codigoCorto(solped.codigo_campana)}-` + String((count || 0) + 1).padStart(4, '0');

  await supabase.from('despachos').insert({
    id_despacho   : idDespacho,
    id_solped     : payload.id_solped,
    codigo_campana: solped.codigo_campana,
    fecha         : new Date().toISOString(),
    despachado_por: payload.codigo_almacen,
    url_foto      : payload.url_foto,
    observaciones : payload.observaciones || '',
  });

  for (const linea of payload.lineas) {
    await supabase.from('despachos_detalle').insert({
      id_despacho         : idDespacho,
      nombre_lugar        : payload.nombre_lugar,
      nombre_producto      : linea.nombre_producto,
      cantidad_solicitada : linea.cantidad_solicitada,
      cantidad_despachada : linea.cantidad_despachada,
    });
    // El stock baja según lo que realmente sale, no según lo solicitado
    if (linea.cantidad_despachada > 0) {
      await actualizarStockActual(solped.codigo_campana, linea.nombre_producto, 0, Number(linea.cantidad_despachada), 0);
    }
  }

  await recalcularEstadoSolped(payload.id_solped);

  return { id_despacho: idDespacho };
}

// ── Devolución ────────────────────────────────────────────────────────────────

export async function listarDespachosDeCampaña(codigoEjecutivo: string): Promise<DespachoParaDevolucion[]> {
  const { data: camps } = await supabase.from('campanas').select('codigo_campana,cliente,marca').eq('codigo_ejecutivo', codigoEjecutivo);
  if (!camps) return [];

  const codigosCampaña = camps.map((c: any) => c.codigo_campana);
  const { data: despachos } = await supabase.from('despachos').select('*').in('codigo_campana', codigosCampaña);
  if (!despachos) return [];

  // Excluir despachos que ya tienen devolución
  const { data: devs } = await supabase.from('devoluciones').select('id_despacho');
  const idsConDevolucion = (devs || []).map((d: any) => d.id_despacho);
  const despachosFiltrados = despachos.filter((d: any) => !idsConDevolucion.includes(d.id_despacho));

  const resultado: DespachoParaDevolucion[] = [];
  for (const d of despachosFiltrados) {
    const camp = camps.find((c: any) => c.codigo_campana === d.codigo_campana);
    const { data: detalle } = await supabase.from('despachos_detalle').select('*').eq('id_despacho', d.id_despacho);
    resultado.push({
      cabecera: {
        id_despacho   : d.id_despacho,
        codigo_campaña: d.codigo_campana,
        fecha         : d.fecha,
        despachado_por: d.despachado_por,
        cliente       : camp?.cliente || '',
        marca         : camp?.marca || '',
      },
      detalle: (detalle || []).map((l: any) => ({ id_despacho: l.id_despacho, nombre_lugar: l.nombre_lugar, nombre_producto: l.nombre_producto, cantidad_despachada: l.cantidad_despachada })),
    });
  }
  return resultado.sort((a, b) => new Date(b.cabecera.fecha).getTime() - new Date(a.cabecera.fecha).getTime());
}

export async function obtenerDespachoParaDevolucion(idDespacho: string, codigoEjecutivo: string): Promise<DespachoParaDevolucion> {
  const { data: d } = await supabase.from('despachos').select('*').eq('id_despacho', idDespacho).single();
  if (!d) throw new Error('No se encontró el despacho ' + idDespacho);
  const { data: camp } = await supabase.from('campanas').select('cliente,marca,codigo_ejecutivo').eq('codigo_campana', d.codigo_campana).single();
  if (!camp || camp.codigo_ejecutivo !== codigoEjecutivo) throw new Error('Este despacho no pertenece al ejecutivo indicado.');
  const { data: detalle } = await supabase.from('despachos_detalle').select('*').eq('id_despacho', idDespacho);
  return {
    cabecera: { id_despacho: d.id_despacho, codigo_campaña: d.codigo_campana, fecha: d.fecha, despachado_por: d.despachado_por, cliente: camp.cliente, marca: camp.marca },
    detalle: (detalle || []).map((l: any) => ({ id_despacho: l.id_despacho, nombre_lugar: l.nombre_lugar, nombre_producto: l.nombre_producto, cantidad_despachada: l.cantidad_despachada })),
  };
}

export async function crearSolicitudDevolucion(payload: CrearDevolucionPayload): Promise<{ id_devolucion: string }> {
  const { data: yaExiste } = await supabase.from('devoluciones').select('id_devolucion').eq('id_despacho', payload.id_despacho).single();
  if (yaExiste) throw new Error('Ya existe una solicitud de devolución para este despacho.');

  const { data: despacho } = await supabase.from('despachos').select('*').eq('id_despacho', payload.id_despacho).single();
  if (!despacho) throw new Error('No se encontró el despacho ' + payload.id_despacho);

  const { count } = await supabase
    .from('devoluciones')
    .select('*', { count: 'exact', head: true })
    .eq('codigo_campana', despacho.codigo_campana);
  const idDevolucion = `DEV-${codigoCorto(despacho.codigo_campana)}-` + String((count || 0) + 1).padStart(4, '0');

  await supabase.from('devoluciones').insert({
    id_devolucion   : idDevolucion,
    id_despacho     : payload.id_despacho,
    codigo_campana  : despacho.codigo_campana,
    codigo_ejecutivo: payload.codigo_ejecutivo,
    fecha_solicitud : new Date().toISOString(),
    estado          : 'pendiente',
  });

  for (const l of payload.lineas) {
    await supabase.from('devoluciones_detalle').insert({
      id_devolucion      : idDevolucion,
      nombre_lugar       : l.nombre_lugar,
      nombre_producto    : l.nombre_producto,
      cantidad_despachada: l.cantidad_despachada,
      cantidad_devuelta  : l.cantidad_devuelta,
    });
  }

  return { id_devolucion: idDevolucion };
}

export async function listarDevolucionesPendientes(): Promise<DevolucionPendiente[]> {
  const { data: devs } = await supabase.from('devoluciones').select('*').eq('estado', 'pendiente');
  if (!devs) return [];

  const resultado: DevolucionPendiente[] = [];
  for (const d of devs) {
    const { data: camp } = await supabase.from('campanas').select('cliente,marca').eq('codigo_campana', d.codigo_campana).single();
    const { data: detalle } = await supabase.from('devoluciones_detalle').select('*').eq('id_devolucion', d.id_devolucion);
    resultado.push({
      cabecera: {
        id_devolucion   : d.id_devolucion,
        id_despacho     : d.id_despacho,
        codigo_campaña  : d.codigo_campana,
        codigo_ejecutivo: d.codigo_ejecutivo,
        fecha_solicitud : d.fecha_solicitud,
        estado          : d.estado,
        cliente         : camp?.cliente || '',
        marca           : camp?.marca || '',
      },
      detalle: (detalle || []).map((l: any) => ({ nombre_lugar: l.nombre_lugar, nombre_producto: l.nombre_producto, cantidad_despachada: l.cantidad_despachada, cantidad_devuelta: l.cantidad_devuelta })),
    });
  }
  return resultado.sort((a, b) => new Date(a.cabecera.fecha_solicitud).getTime() - new Date(b.cabecera.fecha_solicitud).getTime());
}

export async function obtenerDevolucionParaConfirmar(idDevolucion: string): Promise<DevolucionPendiente> {
  const { data: d } = await supabase.from('devoluciones').select('*').eq('id_devolucion', idDevolucion).single();
  if (!d) throw new Error('No se encontró la devolución ' + idDevolucion);
  if (d.estado === 'recibida') throw new Error('Esta devolución ya fue confirmada.');
  const { data: camp } = await supabase.from('campanas').select('cliente,marca').eq('codigo_campana', d.codigo_campana).single();
  const { data: detalle } = await supabase.from('devoluciones_detalle').select('*').eq('id_devolucion', idDevolucion);
  return {
    cabecera: {
      id_devolucion   : d.id_devolucion,
      id_despacho     : d.id_despacho,
      codigo_campaña  : d.codigo_campana,
      codigo_ejecutivo: d.codigo_ejecutivo,
      fecha_solicitud : d.fecha_solicitud,
      estado          : d.estado,
      cliente         : camp?.cliente || '',
      marca           : camp?.marca || '',
    },
    detalle: (detalle || []).map((l: any) => ({ nombre_lugar: l.nombre_lugar, nombre_producto: l.nombre_producto, cantidad_despachada: l.cantidad_despachada, cantidad_devuelta: l.cantidad_devuelta })),
  };
}

export async function confirmarDevolucion(payload: ConfirmarDevolucionPayload): Promise<{ confirmado: boolean }> {
  const { data: d } = await supabase.from('devoluciones').select('*').eq('id_devolucion', payload.id_devolucion).single();
  if (!d) throw new Error('No se encontró la devolución ' + payload.id_devolucion);
  if (d.estado === 'recibida') throw new Error('Esta devolución ya fue confirmada.');

  await supabase.from('devoluciones_recepcion').insert({
    id_devolucion  : payload.id_devolucion,
    fecha_recepcion: new Date().toISOString(),
    recibido_por   : payload.codigo_almacen,
    url_foto       : payload.url_foto,
    observaciones  : payload.observaciones || '',
  });

  // Actualizar cantidades recibidas en detalle
  for (const c of payload.cantidades_recibidas || []) {
    await supabase.from('devoluciones_detalle').update({ cantidad_recibida: c.cantidad_recibida })
      .eq('id_devolucion', payload.id_devolucion)
      .eq('nombre_lugar', c.nombre_lugar)
      .eq('nombre_producto', c.nombre_producto);

    await actualizarStockActual(d.codigo_campana, c.nombre_producto, 0, 0, c.cantidad_recibida);
  }

  await supabase.from('devoluciones').update({ estado: 'recibida' }).eq('id_devolucion', payload.id_devolucion);

  return { confirmado: true };
}

// ── Inventario ────────────────────────────────────────────────────────────────

export async function obtenerInventario(): Promise<CampañaInventario[]> {
  const { data: campañas } = await supabase.from('campanas').select('*');
  if (!campañas) return [];

  const { data: stockRows } = await supabase.from('stock_actual').select('*');
  const { data: prods } = await supabase.from('campanas_productos').select('*');

  return campañas.map((c: any) => {
    const productosStock = (stockRows || []).filter((s: any) => s.codigo_campana === c.codigo_campana);
    return {
      codigo_campaña: c.codigo_campana,
      cliente       : c.cliente,
      marca         : c.marca,
      estado        : c.estado,
      fecha_inicio  : c.fecha_inicio,
      fecha_fin     : c.fecha_fin,
      productos     : productosStock.map((s: any) => {
        const prod = (prods || []).find((p: any) => p.codigo_campana === c.codigo_campana && p.nombre_producto === s.nombre_producto);
        return {
          nombre_producto: s.nombre_producto,
          unidad         : prod?.unidad || '',
          recibido       : Number(s.recibido) || 0,
          despachado     : Number(s.despachado) || 0,
          devuelto       : Number(s.devuelto) || 0,
          stock          : Number(s.stock) || 0,
          url_foto       : s.url_foto || '',
        };
      }),
    };
  });
}

// ── Seguimiento ───────────────────────────────────────────────────────────────

export async function obtenerExpedienteCampaña(codigoCampaña: string, codigoEjecutivo: string): Promise<ExpedienteCampaña> {
  const { data: camp } = await supabase.from('campanas').select('*').eq('codigo_campana', codigoCampaña).eq('codigo_ejecutivo', codigoEjecutivo).single();
  if (!camp) throw new Error('Campaña no encontrada.');

  // Ingresos
  const { data: fichas } = await supabase.from('fichas_ingreso').select('*').eq('codigo_campana', codigoCampaña);
  const ingresos: FichaSeguimiento[] = [];
  for (const f of fichas || []) {
    const { data: det } = await supabase.from('fichas_ingreso_detalle').select('*').eq('id_ficha', f.id_ficha);
    const { data: recep } = await supabase.from('recepciones').select('*').eq('id_ficha', f.id_ficha).single();
    const detRecep = recep ? (await supabase.from('recepciones_detalle').select('*').eq('id_recepcion', recep.id_recepcion)).data || [] : [];

    ingresos.push({
      id_ficha   : f.id_ficha,
      fecha_envio: f.fecha_envio,
      estado     : f.estado,
      detalle    : (det || []).map((d: any) => {
        const factor   = Number(d.factor_conversion) || 1;
        const recibido = detRecep.find((r: any) => r.nombre_producto === d.nombre_producto);
        return {
          nombre_producto       : d.nombre_producto,
          cantidad_esperada     : Number(d.cantidad_esperada),
          cantidad_esperada_base: Number(d.cantidad_esperada) * factor,
          factor_conversion     : factor,
          cantidad_recibida     : recibido ? Number(recibido.cantidad_recibida) : null,
          unidad_recibida       : recibido?.unidad_recibida || '',
          url_foto              : recibido?.url_foto || '',
        };
      }),
    });
  }

  // SOLPEDs
  const { data: solpeds } = await supabase.from('solped').select('*').eq('codigo_campana', codigoCampaña);
  const solicitudesDespacho: SolpedSeguimiento[] = [];
  for (const s of solpeds || []) {
    const { data: det } = await supabase.from('solped_detalle').select('*').eq('id_solped', s.id_solped);
    const { data: despsTienda } = await supabase.from('despachos').select('*').eq('id_solped', s.id_solped);
    const despachos: DespachoSeguimiento[] = [];
    for (const desp of despsTienda || []) {
      const detDesp = (await supabase.from('despachos_detalle').select('*').eq('id_despacho', desp.id_despacho)).data || [];
      despachos.push({
        id_despacho   : desp.id_despacho,
        fecha         : desp.fecha,
        despachado_por: desp.despachado_por,
        url_foto      : desp.url_foto || '',
        detalle       : detDesp.map((d: any) => ({ nombre_lugar: d.nombre_lugar, nombre_producto: d.nombre_producto, cantidad_solicitada: Number(d.cantidad_solicitada), cantidad_despachada: Number(d.cantidad_despachada) })),
      });
    }

    solicitudesDespacho.push({
      id_solped            : s.id_solped,
      version              : s.version,
      estado               : s.estado,
      fecha_despacho       : s.fecha_despacho,
      fecha_creacion       : s.fecha_creacion,
      motivo_cambio        : s.motivo_cambio,
      versiones_anteriores : [],
      despachos,
      detalle              : (det || []).map((d: any) => ({ nombre_lugar: d.nombre_lugar, nombre_producto: d.nombre_producto, cantidad_solicitada: d.cantidad_solicitada })),
    });
  }

  // Devoluciones
  const idsDespachos = (await supabase.from('despachos').select('id_despacho').eq('codigo_campana', codigoCampaña)).data?.map((d: any) => d.id_despacho) || [];
  const { data: devs } = idsDespachos.length > 0 ? await supabase.from('devoluciones').select('*').in('id_despacho', idsDespachos) : { data: [] };
  const solicitudesDevolucion: DevolucionSeguimiento[] = [];
  for (const d of devs || []) {
    const { data: det } = await supabase.from('devoluciones_detalle').select('*').eq('id_devolucion', d.id_devolucion);
    const { data: conf } = await supabase.from('devoluciones_recepcion').select('*').eq('id_devolucion', d.id_devolucion).single();
    solicitudesDevolucion.push({
      id_devolucion  : d.id_devolucion,
      id_despacho    : d.id_despacho,
      fecha_solicitud: d.fecha_solicitud,
      estado         : d.estado,
      confirmacion   : conf ? { fecha: conf.fecha_recepcion, recibido_por: conf.recibido_por, observaciones: conf.observaciones, url_foto: conf.url_foto || '' } : null,
      detalle        : (det || []).map((l: any) => ({ nombre_lugar: l.nombre_lugar, nombre_producto: l.nombre_producto, cantidad_solicitada: Number(l.cantidad_devuelta), confirmado: !!conf })),
    });
  }

  // Stock
  const { data: stockRows } = await supabase.from('stock_actual').select('*').eq('codigo_campana', codigoCampaña);
  const stock: StockSeguimiento[] = (stockRows || []).map((s: any) => ({
    nombre_producto: s.nombre_producto,
    recibido       : Number(s.recibido),
    despachado     : Number(s.despachado),
    devuelto       : Number(s.devuelto),
    stock          : Number(s.stock),
  }));

  return {
    cabecera: {
      codigo_campaña: camp.codigo_campana,
      cliente       : camp.cliente,
      marca         : camp.marca,
      estado        : camp.estado,
      fecha_inicio  : camp.fecha_inicio,
      fecha_fin     : camp.fecha_fin,
    },
    ingresos,
    solicitudesDespacho : solicitudesDespacho.sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()),
    solicitudesDevolucion: solicitudesDevolucion.sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime()),
    stock,
  };
}
