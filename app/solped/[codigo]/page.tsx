// app/solped/[codigo]/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  obtenerSolpedsDeCampaña,
  obtenerCampaña,
  obtenerStockDisponible,
  crearNuevaVersionSolped,
  validarEjecutivo,
  formatearFecha,
  type SolpedCompleta,
  type CampañaProducto,
  type LineaSolped,
} from '@/lib/api';
import AccesoEjecutivo from '@/components/AccesoEjecutivo';

interface LineaFormulario {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_solicitada: string;
}

export default function HistorialSolpedPage({ params }: { params: { codigo: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando…</p>
      </div>
    }>
      <HistorialSolpedContenido codigo={params.codigo} />
    </Suspense>
  );
}

function HistorialSolpedContenido({ codigo }: { codigo: string }) {
  const searchParams = useSearchParams();
  const codigoDesdeQuery = searchParams.get('codigo_ejecutivo');
  const [verificandoQuery, setVerificandoQuery] = useState(!!codigoDesdeQuery);
  const [sesion, setSesion] = useState<{ codigo: string; nombre: string } | null>(null);

  useEffect(() => {
    if (!codigoDesdeQuery) return;
    validarEjecutivo(codigoDesdeQuery)
      .then((r) => { if (r.valido && r.nombre && r.codigo) setSesion({ codigo: r.codigo, nombre: r.nombre }); })
      .finally(() => setVerificandoQuery(false));
  }, [codigoDesdeQuery]);

  if (verificandoQuery) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Verificando acceso…</p></div>;
  if (sesion) return <HistorialSolped codigo={codigo} codigoEjecutivo={sesion.codigo} nombreEjecutivo={sesion.nombre} />;
  return (
    <AccesoEjecutivo titulo={`SOLPEDs — ${codigo}`} descripcion="Ingresa tu código de acceso.">
      {({ codigoEjecutivo, nombreEjecutivo }) => (
        <HistorialSolped codigo={codigo} codigoEjecutivo={codigoEjecutivo} nombreEjecutivo={nombreEjecutivo} />
      )}
    </AccesoEjecutivo>
  );
}

function HistorialSolped({ codigo, codigoEjecutivo, nombreEjecutivo }: { codigo: string; codigoEjecutivo: string; nombreEjecutivo: string }) {
  const [solpeds, setSolpeds] = useState<SolpedCompleta[]>([]);
  const [lugares, setLugares] = useState<string[]>([]);
  const [productos, setProductos] = useState<CampañaProducto[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mostrarFormNuevaVersion, setMostrarFormNuevaVersion] = useState(false);
  const [motivoCambio, setMotivoCambio] = useState('');
  const [fechaDespacho, setFechaDespacho] = useState('');
  const [lineas, setLineas] = useState<LineaFormulario[]>([]);
  const [erroresForm, setErroresForm] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  function cargarDatos() {
    setCargando(true);
    Promise.all([
      obtenerSolpedsDeCampaña(codigo, codigoEjecutivo),
      obtenerCampaña(codigo, codigoEjecutivo),
      obtenerStockDisponible(codigo, codigoEjecutivo),
    ])
      .then(([sols, campaña, stockData]) => {
        setSolpeds(sols);
        setLugares(Array.from(new Set(campaña.lugares.map((l) => l.nombre_lugar))));
        setProductos(campaña.productos);
        setStock(stockData as Record<string, number>);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando SOLPEDs.'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargarDatos(); }, [codigo, codigoEjecutivo]);

  const vigente  = solpeds.find((s) => s.cabecera.estado === 'vigente');

  // 👇 CORREGIDO — ordenado por versión descendente y con estado real
  const historial = solpeds
    .filter((s) => s.cabecera.estado !== 'vigente')
    .sort((a, b) => Number(b.cabecera.version) - Number(a.cabecera.version));

  function abrirFormNuevaVersion() {
    if (!vigente) return;
    setLineas(vigente.detalle.map((d) => ({ nombre_lugar: d.nombre_lugar, nombre_producto: d.nombre_producto, cantidad_solicitada: String(d.cantidad_solicitada) })));
    setFechaDespacho(vigente.cabecera.fecha_despacho || '');
    setMotivoCambio('');
    setErroresForm([]);
    setMostrarFormNuevaVersion(true);
  }

  function actualizarLinea(index: number, cambios: Partial<LineaFormulario>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  }

  function totalSolicitadoEnFormulario(nombreProducto: string): number {
    return lineas.reduce((sum, l) => l.nombre_producto === nombreProducto ? sum + (Number(l.cantidad_solicitada) || 0) : sum, 0);
  }

  async function manejarGuardarNuevaVersion() {
    const errs: string[] = [];
    if (!motivoCambio.trim()) errs.push('El motivo del cambio es obligatorio.');
    if (!fechaDespacho) errs.push('La fecha de despacho es obligatoria.');
    const lineasValidas = lineas.filter((l) => l.nombre_lugar && l.nombre_producto);
    if (lineasValidas.length === 0) errs.push('Debe haber al menos una línea.');

    const totalesPorProducto: Record<string, number> = {};
    lineasValidas.forEach((l) => { totalesPorProducto[l.nombre_producto] = (totalesPorProducto[l.nombre_producto] || 0) + (Number(l.cantidad_solicitada) || 0); });

    const stockAjustado: Record<string, number> = { ...stock };
    if (vigente) { vigente.detalle.forEach((d) => { stockAjustado[d.nombre_producto] = (stockAjustado[d.nombre_producto] || 0) + Number(d.cantidad_solicitada); }); }

    Object.keys(totalesPorProducto).forEach((producto) => {
      const disponible = stockAjustado[producto] || 0;
      const solicitado = totalesPorProducto[producto];
      if (solicitado > disponible) errs.push(`"${producto}": solicitado ${solicitado}, disponible ${disponible}.`);
    });

    setErroresForm(errs);
    if (errs.length > 0) return;

    setGuardando(true);
    try {
      await crearNuevaVersionSolped({
        id_solped_anterior: vigente!.cabecera.id_solped,
        codigo_ejecutivo: codigoEjecutivo,
        fecha_despacho: fechaDespacho,
        motivo_cambio: motivoCambio.trim(),
        lineas: lineasValidas.map((l) => ({ nombre_lugar: l.nombre_lugar, nombre_producto: l.nombre_producto, cantidad_solicitada: Number(l.cantidad_solicitada) })),
      });
      setMostrarFormNuevaVersion(false);
      cargarDatos();
    } catch (err) {
      setErroresForm([err instanceof Error ? err.message : 'Error al guardar.']);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Cargando SOLPEDs…</p></div>;
  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <Link href="/" className="text-xs text-gray-400 hover:text-blue-700">← Inicio</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/80 hover:text-white text-sm">← Inicio</Link>
            <span className="text-white/40">|</span>
            <Link href={`/campanas/${codigo}?codigo_ejecutivo=${encodeURIComponent(codigoEjecutivo)}`} className="text-white/80 hover:text-white text-sm">{codigo}</Link>
          </div>
          <span className="text-white/80 text-sm">{nombreEjecutivo}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">SOLPEDs — {codigo}</h1>
            <p className="text-sm text-gray-500">Solicitudes de despacho de esta campaña.</p>
          </div>
          {!mostrarFormNuevaVersion && (
            <div className="flex gap-2">
              {vigente ? (
                <button onClick={abrirFormNuevaVersion} className="text-xs font-semibold text-amber-700 hover:text-amber-800 border border-amber-200 rounded-lg px-3 py-2 transition-colors">✏️ Nueva versión</button>
              ) : (
                <Link href={`/solped/nueva?codigo_ejecutivo=${encodeURIComponent(codigoEjecutivo)}&codigo_campaña=${encodeURIComponent(codigo)}`} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">+ Crear SOLPED</Link>
              )}
            </div>
          )}
        </div>

        {/* SOLPED vigente */}
        {vigente && !mostrarFormNuevaVersion && (
          <section className="bg-white rounded-2xl border border-green-200 shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full">Vigente</span>
                <span className="text-sm font-semibold text-gray-900">{vigente.cabecera.id_solped}</span>
                <span className="text-xs text-gray-400">v{vigente.cabecera.version}</span>
              </div>
              <span className="text-xs text-gray-400">Despacho: {formatearFecha(vigente.cabecera.fecha_despacho)}</span>
            </div>
            <TablaDetalle lineas={vigente.detalle} />
          </section>
        )}

        {/* Sin SOLPEDs */}
        {solpeds.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mb-4">
            <p className="text-sm text-gray-400 mb-3">Esta campaña no tiene SOLPEDs aún.</p>
            <Link href={`/solped/nueva?codigo_ejecutivo=${encodeURIComponent(codigoEjecutivo)}&codigo_campaña=${encodeURIComponent(codigo)}`} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">+ Crear primera SOLPED</Link>
          </div>
        )}

        {/* Formulario nueva versión */}
        {mostrarFormNuevaVersion && (
          <section className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-4">Nueva versión — reemplaza {vigente?.cabecera.id_solped} v{vigente?.cabecera.version}</p>

            {erroresForm.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-red-800">
                <ul className="list-disc pl-5 space-y-0.5">{erroresForm.map((e, i) => <li key={i} className="text-sm">{e}</li>)}</ul>
              </div>
            )}

            {Object.keys(stock).length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">Stock disponible</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(stockAjustadoParaVersion(stock, vigente)).map((producto) => {
                    const disp = stockAjustadoParaVersion(stock, vigente)[producto];
                    const sol  = totalSolicitadoEnFormulario(producto);
                    return (
                      <span key={producto} className={'text-xs px-2.5 py-1 rounded-full font-medium ' + (sol > disp ? 'bg-red-100 text-red-700' : 'bg-white text-gray-700 border border-blue-100')}>
                        {producto}: {Math.max(0, disp - sol)} disp.
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Fecha de despacho</label>
                <input type="date" value={fechaDespacho} onChange={(e) => setFechaDespacho(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Motivo del cambio <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Ej: Se agregan 5 unidades extra para tienda X" value={motivoCambio} onChange={(e) => setMotivoCambio(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 mb-1 px-1">
              <span className="text-xs text-gray-400">Lugar</span>
              <span className="text-xs text-gray-400">Producto</span>
              <span className="text-xs text-gray-400">Cantidad</span>
              <span />
            </div>
            <div className="space-y-2 mb-4">
              {lineas.map((linea, i) => (
                <div key={i} className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
                  <select value={linea.nombre_lugar} onChange={(e) => actualizarLinea(i, { nombre_lugar: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Lugar…</option>
                    {lugares.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select value={linea.nombre_producto} onChange={(e) => actualizarLinea(i, { nombre_producto: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Producto…</option>
                    {productos.map((p) => <option key={p.nombre_producto} value={p.nombre_producto}>{p.nombre_producto}</option>)}
                  </select>
                  <input type="number" min="1" value={linea.cantidad_solicitada} onChange={(e) => actualizarLinea(i, { cantidad_solicitada: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))} className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setLineas((prev) => [...prev, { nombre_lugar: '', nombre_producto: '', cantidad_solicitada: '' }])} className="text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 mb-4 transition-colors">+ Agregar línea</button>

            <div className="flex justify-end gap-2">
              <button onClick={() => { setMostrarFormNuevaVersion(false); setErroresForm([]); }} className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50">Cancelar</button>
              <button onClick={manejarGuardarNuevaVersion} disabled={guardando} className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">{guardando ? 'Guardando…' : 'Guardar nueva versión'}</button>
            </div>
          </section>
        )}

        {/* Historial de versiones anteriores */}
        {historial.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 px-1">Versiones anteriores</p>
            <div className="space-y-2">
              {historial.map((s) => {
                const esDespachada  = s.cabecera.estado === 'despachada';
                const esReemplazada = s.cabecera.estado === 'reemplazada';
                return (
                  <div key={s.cabecera.id_solped} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 opacity-70">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* 👇 CORREGIDO — badge según estado real */}
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          esDespachada  ? 'bg-green-50 text-green-700' :
                          esReemplazada ? 'bg-gray-100 text-gray-500' :
                                          'bg-gray-100 text-gray-500'
                        }`}>
                          {esDespachada ? '✅ Despachada' : 'Reemplazada'}
                        </span>
                        <span className="text-sm text-gray-700">{s.cabecera.id_solped}</span>
                        <span className="text-xs text-gray-400">v{s.cabecera.version}</span>
                      </div>
                      <span className="text-xs text-gray-400">Despacho: {formatearFecha(s.cabecera.fecha_despacho)}</span>
                    </div>
                    {s.cabecera.motivo_cambio && s.cabecera.motivo_cambio !== 'Creación inicial' && (
                      <p className="text-xs text-gray-400 mb-2">Motivo: {s.cabecera.motivo_cambio}</p>
                    )}
                    <TablaDetalle lineas={s.detalle} compacto />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TablaDetalle({ lineas, compacto = false }: { lineas: LineaSolped[]; compacto?: boolean }) {
  const lugaresList = Array.from(new Set(lineas.map((l) => l.nombre_lugar)));
  return (
    <div className="space-y-2">
      {lugaresList.map((lugar) => {
        const lineasLugar = lineas.filter((l) => l.nombre_lugar === lugar);
        return (
          <div key={lugar}>
            <p className={`font-medium text-gray-700 mb-1 ${compacto ? 'text-xs' : 'text-sm'}`}>{lugar}</p>
            <div className="space-y-0.5 pl-3">
              {lineasLugar.map((l, i) => (
                <div key={i} className="flex justify-between">
                  <span className={`text-gray-600 ${compacto ? 'text-xs' : 'text-sm'}`}>{l.nombre_producto}</span>
                  <span className={`font-medium text-gray-900 ${compacto ? 'text-xs' : 'text-sm'}`}>{l.cantidad_solicitada}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function stockAjustadoParaVersion(stock: Record<string, number>, vigente: SolpedCompleta | undefined): Record<string, number> {
  const ajustado = { ...stock };
  if (vigente) { vigente.detalle.forEach((d) => { ajustado[d.nombre_producto] = (ajustado[d.nombre_producto] || 0) + Number(d.cantidad_solicitada); }); }
  return ajustado;
}
