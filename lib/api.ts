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
  ejecutivo: string;
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

export interface AgregarElementosPayload {
  codigo_campaña: string;
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

export function listarCampañas() {
  return getAction<CampañaResumen[]>('campanas');
}

export function obtenerCampaña(codigoCampaña: string) {
  return getAction<CampañaCompleta>('campaña', { codigo_campaña: codigoCampaña });
}

export function crearFichaIngreso(payload: NuevaFichaIngresoPayload) {
  return postAction<CrearFichaIngresoResultado>('crearFichaIngreso', payload as unknown as Record<string, unknown>);
}

export function agregarElementosACampaña(payload: AgregarElementosPayload) {
  return postAction<AgregarElementosResultado>('agregarElementosACampaña', payload as unknown as Record<string, unknown>);
}
