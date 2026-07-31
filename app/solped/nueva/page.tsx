// app/solped/nueva/page.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  listarCampañas,
  obtenerCampaña,
  validarEjecutivo,
  obtenerStockDisponible,
  crearSolpedInicial,
  type CampañaResumen,
  type CampañaProducto,
} from '@/lib/api';
import AccesoEjecutivo from '@/components/AccesoEjecutivo';
import BuscadorCampaña from '@/components/BuscadorCampaña';

interface LineaFormulario {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_solicitada: string;
}

export default function NuevaSolpedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Cargando…</p></div>}>
      <NuevaSolpedContenido />
    </Suspense>
  );
}

function NuevaSolpedContenido() {
  const searchParams   = useSearchParams();
  const codigoDesdeQuery  = searchParams.get('codigo_ejecutivo');
  const campañaDesdeQuery = searchParams.get('codigo_campaña');
  const [verificandoQuery, setVerificandoQuery] = useState(!!codigoDesdeQuery);
  const [sesion, setSesion] = useState<{ codigo: string; nombre: string } | null>(null);

  useEffect(() => {
    if (!codigoDesdeQuery) return;
    validarEjecutivo(codigoDesdeQuery)
      .then((r) => { if (r.valido && r.nombre && r.codigo) setSesion({ codigo: r.codigo, nombre: r.nombre }); })
      .finally(() => setVerificandoQuery(false));
  }, [codigoDesdeQuery]);

  if (verificandoQuery) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Verificando acceso…</p></div>;
  if (sesion) return <FormularioSolped codigoEjecutivo={sesion.codigo} nombreEjecutivo={sesion.nombre} campañaInicial={campañaDesdeQuery || ''} />;
  return (
    <AccesoEjecutivo titulo="Nueva SOLPED" descripcion="Ingresa tu código de acceso.">
      {({ codigoEjecutivo, nombreEjecutivo }) => <FormularioSolped codigoEjecutivo={codigoEjecutivo} nombreEjecutivo={nombreEjecutivo} campañaInicial={campañaDesdeQuery || ''} />}
    </AccesoEjecutivo>
  );
}

function FormularioSolped({ codigoEjecutivo, nombreEjecutivo, campañaInicial }: { codigoEjecutivo: string; nombreEjecutivo: string; campañaInicial: string }) {
  const inputExcelRef = useRef<HTMLInputElement>(null);

  const [campañas, setCampañas]               = useState<CampañaResumen[]>([]);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState(campañaInicial);
  const [fechaDespacho, setFechaDespacho]     = useState('');
  const [lugares, setLugares]                 = useState<string[]>([]);
  const [productos, setProductos]             = useState<CampañaProducto[]>([]);
  const [stock, setStock]                     = useState<Record<string, number>>({});
  const [lineas, setLineas]                   = useState<LineaFormulario[]>([]);
  const [cargandoCampañas, setCargandoCampañas] = useState(true);
  const [cargandoCampaña, setCargandoCampaña] = useState(false);
  const [enviando, setEnviando]               = useState(false);
  const [errores, setErrores]                 = useState<string[]>([]);
  const [solpedCreada, setSolpedCreada]       = useState<{ id: string; version: number } | null>(null);
  const [errorExcel, setErrorExcel]           = useState<string | null>(null);
  const [excelCargado, setExcelCargado]       = useState(false);

  useEffect(() => {
    listarCampañas(codigoEjecutivo)
      .then((c) => setCampañas(c.filter((x) => x.estado === 'activa')))
      .finally(() => setCargandoCampañas(false));
  }, [codigoEjecutivo]);

  useEffect(() => {
    if (!codigoSeleccionado) { setLugares([]); setProductos([]); setStock({}); setLineas([]); setExcelCargado(false); return; }
    setCargandoCampaña(true);
    Promise.all([
      obtenerCampaña(codigoSeleccionado, codigoEjecutivo),
      obtenerStockDisponible(codigoSeleccionado, codigoEjecutivo),
    ])
      .then(([campaña, stockData]) => {
        setLugares(Array.from(new Set(campaña.lugares.map((l) => l.nombre_lugar))));
        setProductos(campaña.productos);
        setStock(stockData as Record<string, number>);
        setLineas([]);
        setExcelCargado(false);
      })
      .catch((err) => setErrores([err instanceof Error ? err.message : 'Error cargando campaña.']))
      .finally(() => setCargandoCampaña(false));
  }, [codigoSeleccionado, codigoEjecutivo]);

  // ── Parseo del Excel ──────────────────────────────────────────────────────
  function manejarExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setErrorExcel(null);
    setExcelCargado(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setTimeout(() => {
        try {
          const data = ev.target?.result;
          const wb   = XLSX.read(data, { type: 'array', cellDates: true });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          // Fila 0: ["FECHA DE DESPACHO:", valor, "", "Tienda", "Prod1", "Prod2", ...]
          const fechaRaw        = rows[0]?.[1];
          const nombresProductos: string[] = [];
          for (let c = 4; c < (rows[0]?.length || 0); c++) {
            const nombre = String(rows[0]?.[c] ?? '').trim();
            if (nombre) nombresProductos.push(nombre);
          }

          if (!fechaRaw) throw new Error('No se encontró la fecha de despacho en el Excel.');
          if (nombresProductos.length === 0) throw new Error('No se encontraron productos en el Excel.');

          // Convertir fecha
          function serialAFecha(v: any): string {
            if (!v) return '';
            if (v instanceof Date) {
              const mm = String(v.getMonth() + 1).padStart(2, '0');
              const dd = String(v.getDate()).padStart(2, '0');
              return `${v.getFullYear()}-${mm}-${dd}`;
            }
            if (typeof v === 'number') {
              const date = XLSX.SSF.parse_date_code(v);
              return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
            }
            const str = String(v).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
            const partes = str.split('/');
            if (partes.length === 3) return `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
            return '';
          }

          const fechaParsed = serialAFecha(fechaRaw);
          if (!fechaParsed) throw new Error('Formato de fecha no reconocido.');

          // Filas de tiendas: columna 3 = nombre tienda, cols 4+ = cantidades
          const lineasExcel: LineaFormulario[] = [];
          for (let r = 1; r < rows.length; r++) {
            const nombreTienda = String(rows[r]?.[3] ?? '').trim();
            if (!nombreTienda) continue;
            for (let c = 0; c < nombresProductos.length; c++) {
              const cantRaw  = rows[r]?.[4 + c];
              const cantidad = Number(cantRaw);
              if (!cantRaw || isNaN(cantidad) || cantidad <= 0) continue;
              lineasExcel.push({
                nombre_lugar      : nombreTienda,
                nombre_producto   : nombresProductos[c],
                cantidad_solicitada: String(cantidad),
              });
            }
          }

          if (lineasExcel.length === 0) throw new Error('No se encontraron líneas con cantidad mayor a 0 en el Excel.');

          // Verificar que los productos del Excel existen en la campaña
          const productosDisponibles = productos.map((p) => p.nombre_producto);
          const productosNoEncontrados = nombresProductos.filter((p) => !productosDisponibles.includes(p));
          if (productosNoEncontrados.length > 0) {
            throw new Error(`Productos no encontrados en la campaña: ${productosNoEncontrados.join(', ')}`);
          }

          setFechaDespacho(fechaParsed);
          setLineas(lineasExcel);
          setExcelCargado(true);
          setErrores([]);

        } catch (err) {
          setErrorExcel(err instanceof Error ? err.message : 'Error leyendo el Excel.');
          setExcelCargado(false);
        }
      }, 0);
    };
    reader.readAsArrayBuffer(archivo);
    if (inputExcelRef.current) inputExcelRef.current.value = '';
  }

  function agregarLinea() { setLineas((prev) => [...prev, { nombre_lugar: '', nombre_producto: '', cantidad_solicitada: '' }]); }
  function actualizarLinea(index: number, cambios: Partial<LineaFormulario>) { setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l))); }
  function eliminarLinea(index: number) { setLineas((prev) => prev.filter((_, i) => i !== index)); }

  function totalSolicitadoPorProducto(nombreProducto: string): number {
    return lineas.reduce((sum, l) => l.nombre_producto === nombreProducto ? sum + (Number(l.cantidad_solicitada) || 0) : sum, 0);
  }

  function superaStock(linea: LineaFormulario): boolean {
    if (!linea.nombre_producto || !linea.cantidad_solicitada) return false;
    const total     = totalSolicitadoPorProducto(linea.nombre_producto);
    const disponible = stock[linea.nombre_producto] || 0;
    return total > disponible;
  }

  function validar(): string[] {
    const errs: string[] = [];
    if (!codigoSeleccionado) errs.push('Debes seleccionar una campaña.');
    if (!fechaDespacho) errs.push('La fecha de despacho es obligatoria.');
    const lineasValidas = lineas.filter((l) => l.nombre_lugar && l.nombre_producto);
    if (lineasValidas.length === 0) errs.push('Debes agregar al menos una línea.');
    lineasValidas.forEach((l, i) => {
      const cantidad = Number(l.cantidad_solicitada);
      if (!l.cantidad_solicitada || isNaN(cantidad) || cantidad <= 0)
        errs.push(`Línea ${i + 1}: la cantidad debe ser mayor a 0.`);
    });
    // Validar stock por producto
    const totalesPorProducto: Record<string, number> = {};
    lineasValidas.forEach((l) => { totalesPorProducto[l.nombre_producto] = (totalesPorProducto[l.nombre_producto] || 0) + (Number(l.cantidad_solicitada) || 0); });
    Object.keys(totalesPorProducto).forEach((producto) => {
      const disponible = stock[producto] || 0;
      if (totalesPorProducto[producto] > disponible)
        errs.push(`"${producto}": solicitado ${totalesPorProducto[producto]}, disponible ${disponible}.`);
    });
    return errs;
  }

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validar();
    setErrores(errs);
    if (errs.length > 0) return;
    setEnviando(true);
    try {
      const resultado = await crearSolpedInicial({
        codigo_campaña  : codigoSeleccionado,
        codigo_ejecutivo: codigoEjecutivo,
        fecha_despacho  : fechaDespacho,
        lineas: lineas.filter((l) => l.nombre_lugar && l.nombre_producto).map((l) => ({
          nombre_lugar       : l.nombre_lugar,
          nombre_producto    : l.nombre_producto,
          cantidad_solicitada: Number(l.cantidad_solicitada),
        })),
      });
      setSolpedCreada({ id: resultado.id_solped, version: resultado.version });
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error al crear la SOLPED.']);
    } finally {
      setEnviando(false);
    }
  }

  if (solpedCreada) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">🧾</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">SOLPED creada</h1>
        <p className="text-sm text-gray-500 mb-2"><strong>{solpedCreada.id}</strong> — versión {solpedCreada.version}</p>
        <p className="text-sm text-gray-500 mb-6">Campaña <strong>{codigoSeleccionado}</strong> · Despacho el <strong>{fechaDespacho}</strong></p>
        <div className="flex flex-col gap-2">
          <Link href={`/solped/${codigoSeleccionado}?codigo_ejecutivo=${encodeURIComponent(codigoEjecutivo)}`} className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">Ver SOLPEDs de esta campaña</Link>
          <button onClick={() => { setSolpedCreada(null); setLineas([]); setFechaDespacho(''); setErrores([]); setExcelCargado(false); }} className="text-xs text-gray-400 hover:text-blue-700 mt-1">Crear otra SOLPED</button>
        </div>
      </div>
    </div>
  );

  // Resumen de totales por producto para el panel de stock
  const totalesPorProducto: Record<string, number> = {};
  lineas.forEach((l) => { if (l.nombre_producto) totalesPorProducto[l.nombre_producto] = (totalesPorProducto[l.nombre_producto] || 0) + (Number(l.cantidad_solicitada) || 0); });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/80 hover:text-white text-sm">← Inicio</Link>
            <span className="text-white/40">|</span>
            <Link href={`/campanas?codigo_ejecutivo=${encodeURIComponent(codigoEjecutivo)}`} className="text-white/80 hover:text-white text-sm">Campañas</Link>
          </div>
          <span className="text-white/80 text-sm">{nombreEjecutivo}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Nueva SOLPED</h1>
            <p className="text-sm text-gray-500">Solicitud de despacho de elementos a almacén.</p>
          </div>
          {/* Botón cargar Excel */}
          {codigoSeleccionado && !cargandoCampaña && (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => inputExcelRef.current?.click()}
                className="flex items-center gap-2 text-xs font-semibold text-green-700 hover:text-green-800 border border-green-200 hover:border-green-300 bg-green-50 hover:bg-green-100 rounded-lg px-3 py-2 transition-colors"
              >
                📂 Cargar desde Excel
              </button>
              {excelCargado && <p className="text-xs text-green-600">✓ Datos cargados — revisa y confirma</p>}
              {errorExcel && <p className="text-xs text-red-600 max-w-48 text-right">{errorExcel}</p>}
            </div>
          )}
          <input ref={inputExcelRef} type="file" accept=".xlsx,.xls" onChange={manejarExcel} className="hidden" />
        </div>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">{errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}</ul>
          </div>
        )}

        <form onSubmit={manejarSubmit}>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-4">Datos generales</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Campaña</label>
                <BuscadorCampaña campañas={campañas} cargando={cargandoCampañas} value={codigoSeleccionado} onChange={setCodigoSeleccionado} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Fecha de despacho</label>
                <input type="date" value={fechaDespacho} onChange={(e) => setFechaDespacho(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </section>

          {/* Panel de stock */}
          {codigoSeleccionado && !cargandoCampaña && Object.keys(stock).length > 0 && (
            <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-blue-700 mb-2">Stock disponible para esta campaña</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(stock).map((producto) => {
                  const disponible = stock[producto] || 0;
                  const solicitado = totalesPorProducto[producto] || 0;
                  const restante   = disponible - solicitado;
                  const fuera      = solicitado > disponible;
                  return (
                    <span key={producto} className={`text-xs px-2.5 py-1 rounded-full font-medium ${fuera ? 'bg-red-100 text-red-700' : 'bg-white text-gray-700 border border-blue-100'}`}>
                      {producto}: {Math.max(0, restante)} disp.
                      {fuera && ` (excede por ${solicitado - disponible})`}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {codigoSeleccionado && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Líneas de despacho</p>
                  {lineas.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{lineas.filter(l => l.nombre_lugar && l.nombre_producto).length} líneas</p>}
                </div>
                <button type="button" onClick={agregarLinea} disabled={cargandoCampaña || lugares.length === 0} className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40">+ Agregar línea</button>
              </div>

              {cargandoCampaña && <p className="text-sm text-gray-400">Cargando campaña…</p>}
              {!cargandoCampaña && lugares.length === 0 && <p className="text-sm text-gray-400">Esta campaña no tiene lugares registrados.</p>}
              {lineas.length === 0 && !cargandoCampaña && lugares.length > 0 && (
                <p className="text-sm text-gray-400">Click en "+ Agregar línea" o carga un Excel para comenzar.</p>
              )}

              {lineas.length > 0 && (
                <>
                  <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 mb-1 px-1">
                    <span className="text-xs text-gray-400">Lugar</span>
                    <span className="text-xs text-gray-400">Producto</span>
                    <span className="text-xs text-gray-400">Cantidad</span>
                    <span />
                  </div>
                  <div className="space-y-2">
                    {lineas.map((linea, i) => {
                      const fueraDeStock = superaStock(linea);
                      return (
                        <div key={i} className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
                          <select value={linea.nombre_lugar} onChange={(e) => actualizarLinea(i, { nombre_lugar: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Lugar…</option>
                            {lugares.map((l) => <option key={l} value={l}>{l}</option>)}
                          </select>
                          <select value={linea.nombre_producto} onChange={(e) => actualizarLinea(i, { nombre_producto: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Producto…</option>
                            {productos.map((p) => <option key={p.nombre_producto} value={p.nombre_producto}>{p.nombre_producto}</option>)}
                          </select>
                          <input
                            type="number" min="1" placeholder="0"
                            value={linea.cantidad_solicitada}
                            onChange={(e) => actualizarLinea(i, { cantidad_solicitada: e.target.value })}
                            className={`w-full h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fueraDeStock ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                          />
                          <button type="button" onClick={() => eliminarLinea(i)} className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">✕</button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Resumen por lugar */}
              {lineas.filter((l) => l.nombre_lugar && l.nombre_producto).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-2">Resumen por lugar</p>
                  <div className="space-y-1">
                    {Array.from(new Set(lineas.map((l) => l.nombre_lugar).filter(Boolean))).map((lugar) => {
                      const lineasLugar = lineas.filter((l) => l.nombre_lugar === lugar && l.nombre_producto);
                      return (
                        <div key={lugar} className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">{lugar}</p>
                          {lineasLugar.map((l, i) => (
                            <p key={i} className={`text-xs ${superaStock(l) ? 'text-red-600' : 'text-gray-500'}`}>
                              {l.nombre_producto}: {l.cantidad_solicitada || 0}
                              {superaStock(l) && ' ⚠️'}
                            </p>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={enviando || !codigoSeleccionado}
              className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              {enviando ? 'Creando…' : 'Crear SOLPED'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
