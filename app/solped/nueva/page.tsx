// app/solped/nueva/page.tsx
//
// Paso 3: Crear SOLPED.
// El ejecutivo elige una campaña, selecciona los lugares de esa
// campaña, y para cada lugar indica qué productos y cantidades
// necesita despachar. El sistema valida contra el stock disponible
// (fichas de ingreso ya registradas menos lo ya comprometido en
// otras SOLPEDs vigentes de la misma campaña) antes de guardar.

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

interface LineaFormulario {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_solicitada: string;
}

export default function NuevaSolpedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando…</p>
      </div>
    }>
      <NuevaSolpedContenido />
    </Suspense>
  );
}

function NuevaSolpedContenido() {
  const searchParams = useSearchParams();
  const codigoDesdeQuery = searchParams.get('codigo_ejecutivo');
  const campañaDesdeQuery = searchParams.get('codigo_campaña');

  const [verificandoQuery, setVerificandoQuery] = useState(!!codigoDesdeQuery);
  const [sesion, setSesion] = useState<{ codigo: string; nombre: string } | null>(null);

  useEffect(() => {
    if (!codigoDesdeQuery) return;
    validarEjecutivo(codigoDesdeQuery)
      .then((r) => {
        if (r.valido && r.nombre && r.codigo) {
          setSesion({ codigo: r.codigo, nombre: r.nombre });
        }
      })
      .finally(() => setVerificandoQuery(false));
  }, [codigoDesdeQuery]);

  if (verificandoQuery) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Verificando acceso…</p>
      </div>
    );
  }

  if (sesion) {
    return (
      <FormularioSolped
        codigoEjecutivo={sesion.codigo}
        nombreEjecutivo={sesion.nombre}
        campañaInicial={campañaDesdeQuery || ''}
      />
    );
  }

  return (
    <AccesoEjecutivo titulo="Nueva SOLPED" descripcion="Ingresa tu código de acceso.">
      {({ codigoEjecutivo, nombreEjecutivo }) => (
        <FormularioSolped
          codigoEjecutivo={codigoEjecutivo}
          nombreEjecutivo={nombreEjecutivo}
          campañaInicial={campañaDesdeQuery || ''}
        />
      )}
    </AccesoEjecutivo>
  );
}

function FormularioSolped({
  codigoEjecutivo,
  nombreEjecutivo,
  campañaInicial,
}: {
  codigoEjecutivo: string;
  nombreEjecutivo: string;
  campañaInicial: string;
}) {
  const router = useRouter();

  const [campañas, setCampañas] = useState<CampañaResumen[]>([]);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState(campañaInicial);
  const [fechaDespacho, setFechaDespacho] = useState('');

  const [lugares, setLugares] = useState<string[]>([]);
  const [productos, setProductos] = useState<CampañaProducto[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});

  const [lineas, setLineas] = useState<LineaFormulario[]>([]);
  const [cargandoCampaña, setCargandoCampaña] = useState(false);
  const [cargandoCampañas, setCargandoCampañas] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [solpedCreada, setSolpedCreada] = useState<{ id: string; version: number } | null>(null);

  useEffect(() => {
    listarCampañas(codigoEjecutivo)
      .then((c) => setCampañas(c.filter((x) => x.estado === 'activa')))
      .finally(() => setCargandoCampañas(false));
  }, [codigoEjecutivo]);

  useEffect(() => {
    if (!codigoSeleccionado) {
      setLugares([]);
      setProductos([]);
      setStock({});
      setLineas([]);
      return;
    }

    setCargandoCampaña(true);
    Promise.all([
      obtenerCampaña(codigoSeleccionado, codigoEjecutivo),
      obtenerStockDisponible(codigoSeleccionado, codigoEjecutivo),
    ])
      .then(([campaña, stockData]) => {
        const lugaresUnicos = Array.from(
          new Set(campaña.lugares.map((l) => l.nombre_lugar))
        );
        setLugares(lugaresUnicos);
        setProductos(campaña.productos);
        setStock(stockData as Record<string, number>);
        setLineas([]);
      })
      .catch((err) => {
        setErrores([err instanceof Error ? err.message : 'Error cargando campaña.']);
      })
      .finally(() => setCargandoCampaña(false));
  }, [codigoSeleccionado, codigoEjecutivo]);

  function agregarLinea() {
    setLineas((prev) => [...prev, { nombre_lugar: '', nombre_producto: '', cantidad_solicitada: '' }]);
  }

  function actualizarLinea(index: number, cambios: Partial<LineaFormulario>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  }

  function eliminarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }

  // Suma de cantidades solicitadas en el formulario por producto
  function totalSolicitadoEnFormulario(nombreProducto: string): number {
    return lineas.reduce((sum, l) => {
      if (l.nombre_producto === nombreProducto) {
        return sum + (Number(l.cantidad_solicitada) || 0);
      }
      return sum;
    }, 0);
  }

  function validar(): string[] {
    const errs: string[] = [];
    if (!codigoSeleccionado) errs.push('Debes seleccionar una campaña.');
    if (!fechaDespacho) errs.push('La fecha de despacho es obligatoria.');
    const lineasValidas = lineas.filter((l) => l.nombre_lugar && l.nombre_producto);
    if (lineasValidas.length === 0) errs.push('Debes agregar al menos una línea.');

    lineasValidas.forEach((l, i) => {
      const cantidad = Number(l.cantidad_solicitada);
      if (!l.cantidad_solicitada || isNaN(cantidad) || cantidad <= 0) {
        errs.push(`Línea ${i + 1}: la cantidad debe ser mayor a 0.`);
      }
    });

    // Validación de stock en el frontend (el backend también lo valida)
    const totalesPorProducto: Record<string, number> = {};
    lineasValidas.forEach((l) => {
      totalesPorProducto[l.nombre_producto] = (totalesPorProducto[l.nombre_producto] || 0) + (Number(l.cantidad_solicitada) || 0);
    });
    Object.keys(totalesPorProducto).forEach((producto) => {
      const disponible = stock[producto] || 0;
      const solicitado = totalesPorProducto[producto];
      if (solicitado > disponible) {
        errs.push(`"${producto}": solicitado ${solicitado}, disponible ${disponible}.`);
      }
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
      const lineasValidas = lineas
        .filter((l) => l.nombre_lugar && l.nombre_producto)
        .map((l) => ({
          nombre_lugar: l.nombre_lugar,
          nombre_producto: l.nombre_producto,
          cantidad_solicitada: Number(l.cantidad_solicitada),
        }));

      const resultado = await crearSolpedInicial({
        codigo_campaña: codigoSeleccionado,
        codigo_ejecutivo: codigoEjecutivo,
        fecha_despacho: fechaDespacho,
        lineas: lineasValidas,
      });

      setSolpedCreada({ id: resultado.id_solped, version: resultado.version });
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error al crear la SOLPED.']);
    } finally {
      setEnviando(false);
    }
  }

  if (solpedCreada) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">🧾</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">SOLPED creada</h1>
          <p className="text-sm text-gray-500 mb-2">
            <strong>{solpedCreada.id}</strong> — versión {solpedCreada.version}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Campaña <strong>{codigoSeleccionado}</strong> · Despacho el <strong>{fechaDespacho}</strong>
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href={`/solped/${codigoSeleccionado}?codigo_ejecutivo=${encodeURIComponent(codigoEjecutivo)}`}
              className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Ver SOLPEDs de esta campaña
            </Link>
            <button
              onClick={() => {
                setSolpedCreada(null);
                setLineas([]);
                setFechaDespacho('');
                setErrores([]);
              }}
              className="text-xs text-gray-400 hover:text-blue-700 mt-1"
            >
              Crear otra SOLPED
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/80 hover:text-white text-sm">← Inicio</Link>
            <span className="text-white/40">|</span>
            <Link href={`/campanas?codigo_ejecutivo=${encodeURIComponent(codigoEjecutivo)}`}
              className="text-white/80 hover:text-white text-sm">Campañas</Link>
          </div>
          <span className="text-white/80 text-sm">{nombreEjecutivo}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nueva SOLPED</h1>
        <p className="text-sm text-gray-500 mb-6">
          Solicitud de despacho de elementos a almacén.
        </p>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">
              {errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={manejarSubmit}>
          {/* Cabecera */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-4">Datos generales</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Campaña</label>
                <select
                  value={codigoSeleccionado}
                  onChange={(e) => setCodigoSeleccionado(e.target.value)}
                  disabled={cargandoCampañas}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{cargandoCampañas ? 'Cargando…' : 'Selecciona una campaña'}</option>
                  {campañas.map((c) => (
                    <option key={c.codigo_campaña} value={c.codigo_campaña}>
                      {c.codigo_campaña} — {c.cliente} ({c.marca})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Fecha de despacho</label>
                <input
                  type="date"
                  value={fechaDespacho}
                  onChange={(e) => setFechaDespacho(e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Stock disponible */}
          {codigoSeleccionado && !cargandoCampaña && Object.keys(stock).length > 0 && (
            <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-blue-700 mb-2">Stock disponible para esta campaña</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(stock).map((producto) => (
                  <span key={producto} className={
                    'text-xs px-2.5 py-1 rounded-full font-medium ' +
                    (totalSolicitadoEnFormulario(producto) > (stock[producto] || 0)
                      ? 'bg-red-100 text-red-700'
                      : 'bg-white text-gray-700 border border-blue-100')
                  }>
                    {producto}: {Math.max(0, (stock[producto] || 0) - totalSolicitadoEnFormulario(producto))} disponibles
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Líneas de despacho */}
          {codigoSeleccionado && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-900">Líneas de despacho</p>
                <button
                  type="button"
                  onClick={agregarLinea}
                  disabled={cargandoCampaña || lugares.length === 0}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
                >
                  + Agregar línea
                </button>
              </div>

              {cargandoCampaña && <p className="text-sm text-gray-400">Cargando campaña…</p>}

              {!cargandoCampaña && lugares.length === 0 && (
                <p className="text-sm text-gray-400">Esta campaña no tiene lugares registrados.</p>
              )}

              {lineas.length === 0 && !cargandoCampaña && lugares.length > 0 && (
                <p className="text-sm text-gray-400">Click en "+ Agregar línea" para comenzar.</p>
              )}

              {/* Header de columnas */}
              {lineas.length > 0 && (
                <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 mb-1 px-1">
                  <span className="text-xs text-gray-400">Lugar</span>
                  <span className="text-xs text-gray-400">Producto</span>
                  <span className="text-xs text-gray-400">Cantidad</span>
                  <span />
                </div>
              )}

              <div className="space-y-2">
                {lineas.map((linea, i) => (
                  <div key={i} className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
                    <select
                      value={linea.nombre_lugar}
                      onChange={(e) => actualizarLinea(i, { nombre_lugar: e.target.value })}
                      className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Lugar…</option>
                      {lugares.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>

                    <select
                      value={linea.nombre_producto}
                      onChange={(e) => actualizarLinea(i, { nombre_producto: e.target.value })}
                      className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Producto…</option>
                      {productos.map((p) => (
                        <option key={p.nombre_producto} value={p.nombre_producto}>
                          {p.nombre_producto}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={linea.cantidad_solicitada}
                      onChange={(e) => actualizarLinea(i, { cantidad_solicitada: e.target.value })}
                      className={
                        'w-full h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
                        (linea.nombre_producto && Number(linea.cantidad_solicitada) > (stock[linea.nombre_producto] || 0)
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200')
                      }
                    />

                    <button
                      type="button"
                      onClick={() => eliminarLinea(i)}
                      className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

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
                            <p key={i} className="text-xs text-gray-500">
                              {l.nombre_producto}: {l.cantidad_solicitada || 0}
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
            <button
              type="submit"
              disabled={enviando || !codigoSeleccionado}
              className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {enviando ? 'Creando…' : 'Crear SOLPED'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
