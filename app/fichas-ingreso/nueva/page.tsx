// app/fichas-ingreso/nueva/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  listarCampañas,
  obtenerCampaña,
  crearFichaIngreso,
  validarEjecutivo,
  type CampañaResumen,
  type CampañaProducto,
} from '@/lib/api';
import AccesoEjecutivo from '@/components/AccesoEjecutivo';

interface LineaSeleccionada {
  nombre_producto: string;
  unidad: string;
  categoria: string;
  seleccionado: boolean;
  cantidad_esperada: string;
  factor_conversion: string; // 👈 NUEVO — ej. "12" si 1 caja = 12 unidades
}

export default function NuevaFichaIngresoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando…</p>
      </div>
    }>
      <NuevaFichaIngresoContenido />
    </Suspense>
  );
}

function NuevaFichaIngresoContenido() {
  const searchParams = useSearchParams();
  const codigoDesdeQuery = searchParams.get('codigo_ejecutivo');
  const [verificandoQuery, setVerificandoQuery] = useState(!!codigoDesdeQuery);
  const [sesionDesdeQuery, setSesionDesdeQuery] = useState<{ codigo: string; nombre: string } | null>(null);

  useEffect(() => {
    if (!codigoDesdeQuery) return;
    validarEjecutivo(codigoDesdeQuery)
      .then((r) => { if (r.valido && r.nombre && r.codigo) setSesionDesdeQuery({ codigo: r.codigo, nombre: r.nombre }); })
      .finally(() => setVerificandoQuery(false));
  }, [codigoDesdeQuery]);

  if (verificandoQuery) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Verificando acceso…</p></div>;
  if (sesionDesdeQuery) return <FormularioFichaIngreso codigoEjecutivo={sesionDesdeQuery.codigo} nombreEjecutivo={sesionDesdeQuery.nombre} />;
  return (
    <AccesoEjecutivo titulo="Ficha de ingreso" descripcion="Ingresa tu código de acceso para avisar un ingreso a almacén.">
      {({ codigoEjecutivo, nombreEjecutivo }) => <FormularioFichaIngreso codigoEjecutivo={codigoEjecutivo} nombreEjecutivo={nombreEjecutivo} />}
    </AccesoEjecutivo>
  );
}

function FormularioFichaIngreso({ codigoEjecutivo, nombreEjecutivo }: { codigoEjecutivo: string; nombreEjecutivo: string }) {
  const [campañas, setCampañas] = useState<CampañaResumen[]>([]);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState('');
  const [productosCampaña, setProductosCampaña] = useState<CampañaProducto[]>([]);
  const [lineas, setLineas] = useState<LineaSeleccionada[]>([]);
  const [cargandoCampañas, setCargandoCampañas] = useState(true);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [fichaCreada, setFichaCreada] = useState<string | null>(null);

  useEffect(() => {
    listarCampañas(codigoEjecutivo)
      .then((camps) => setCampañas(camps.filter((c) => c.estado === 'activa')))
      .catch((err) => setErrores([err instanceof Error ? err.message : 'No se pudieron cargar las campañas.']))
      .finally(() => setCargandoCampañas(false));
  }, [codigoEjecutivo]);

  useEffect(() => {
    if (!codigoSeleccionado) { setProductosCampaña([]); setLineas([]); return; }
    setCargandoProductos(true);
    obtenerCampaña(codigoSeleccionado, codigoEjecutivo)
      .then((campaña) => {
        setProductosCampaña(campaña.productos);
        setLineas(campaña.productos.map((p) => ({
          nombre_producto  : p.nombre_producto,
          unidad           : p.unidad,
          categoria        : p.categoria,
          seleccionado     : false,
          cantidad_esperada: '',
          factor_conversion: '1', // por defecto sin conversión
        })));
      })
      .catch((err) => setErrores([err instanceof Error ? err.message : 'No se pudo cargar el detalle de la campaña.']))
      .finally(() => setCargandoProductos(false));
  }, [codigoSeleccionado, codigoEjecutivo]);

  function actualizarLinea(index: number, cambios: Partial<LineaSeleccionada>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  }

  function validar(): string[] {
    const errs: string[] = [];
    if (!codigoSeleccionado) errs.push('Debes seleccionar una campaña.');
    const seleccionadas = lineas.filter((l) => l.seleccionado);
    if (seleccionadas.length === 0) errs.push('Debes marcar al menos un producto que va a ingresar.');
    seleccionadas.forEach((l) => {
      const cantidad = Number(l.cantidad_esperada);
      if (!l.cantidad_esperada || isNaN(cantidad) || cantidad <= 0)
        errs.push(`Indica una cantidad válida para "${l.nombre_producto}".`);
      const factor = Number(l.factor_conversion);
      if (!l.factor_conversion || isNaN(factor) || factor <= 0)
        errs.push(`El factor de conversión de "${l.nombre_producto}" debe ser mayor a 0.`);
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
      const seleccionadas = lineas.filter((l) => l.seleccionado);
      const resultado = await crearFichaIngreso({
        codigo_campaña: codigoSeleccionado,
        ejecutivo     : nombreEjecutivo,
        lineas        : seleccionadas.map((l) => ({
          nombre_producto  : l.nombre_producto,
          cantidad_esperada: Number(l.cantidad_esperada),
          factor_conversion: Number(l.factor_conversion) || 1, // 👈 NUEVO
        })),
      });
      setFichaCreada(resultado.id_ficha);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error desconocido al crear la ficha.']);
    } finally {
      setEnviando(false);
    }
  }

  if (fichaCreada) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ficha de ingreso enviada</h1>
          <p className="text-sm text-gray-500 mb-6">
            La ficha <strong>{fichaCreada}</strong> quedó registrada para la campaña <strong>{codigoSeleccionado}</strong>, pendiente de confirmación en almacén.
          </p>
          <button
            onClick={() => { setFichaCreada(null); setCodigoSeleccionado(''); setErrores([]); }}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Registrar otra ficha
          </button>
          <div className="mt-3">
            <Link href="/" className="text-xs text-gray-400 hover:text-blue-700">← Volver al inicio</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-white/80 hover:text-white text-sm">← Inicio</Link>
          <span className="text-white/80 text-sm">{nombreEjecutivo}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nueva ficha de ingreso</h1>
        <p className="text-sm text-gray-500 mb-6">Avisa qué productos esperas que lleguen a almacén.</p>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">{errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}</ul>
          </div>
        )}

        <form onSubmit={manejarSubmit}>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-4">Campaña</p>
            <label className="text-xs text-gray-400 block mb-1">Selecciona la campaña</label>
            <select value={codigoSeleccionado} onChange={(e) => setCodigoSeleccionado(e.target.value)} disabled={cargandoCampañas}
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{cargandoCampañas ? 'Cargando campañas…' : 'Selecciona una campaña'}</option>
              {campañas.map((c) => <option key={c.codigo_campaña} value={c.codigo_campaña}>{c.codigo_campaña} — {c.cliente} ({c.marca})</option>)}
            </select>
            {!cargandoCampañas && campañas.length === 0 && <p className="text-xs text-gray-400 mt-2">No tienes campañas activas registradas.</p>}
          </section>

          {codigoSeleccionado && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Productos que van a ingresar</p>
              <p className="text-xs text-gray-400 mb-4">
                Marca los productos esperados e indica cantidad y unidad. Si llegan en cajas, indica el factor de conversión (ej. 1 Caja = 12 Unidades → factor: 12).
              </p>

              {cargandoProductos && <p className="text-sm text-gray-400">Cargando productos…</p>}
              {!cargandoProductos && productosCampaña.length === 0 && <p className="text-sm text-gray-400">Esta campaña no tiene productos registrados.</p>}

              {!cargandoProductos && lineas.length > 0 && (
                <>
                  {/* Headers */}
                  <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr] gap-2 mb-2 px-1">
                    <span />
                    <span className="text-xs text-gray-400">Producto</span>
                    <span className="text-xs text-gray-400">Cantidad</span>
                    <span className="text-xs text-gray-400">Unidad</span>
                    <span className="text-xs text-gray-400">
                      Factor
                      <span className="ml-1 text-gray-300" title="Si llegan en cajas: cuántas unidades trae cada caja. Dejar en 1 si no hay conversión.">ⓘ</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    {lineas.map((linea, i) => (
                      <div key={i} className="grid grid-cols-[auto_2fr_1fr_1fr_1fr] gap-2 items-center border border-gray-100 rounded-lg px-3 py-2">
                        <input type="checkbox" checked={linea.seleccionado} onChange={(e) => actualizarLinea(i, { seleccionado: e.target.checked })} className="w-4 h-4" />
                        <div>
                          <p className="text-sm text-gray-900">{linea.nombre_producto}</p>
                          <p className="text-xs text-gray-400">{linea.categoria}</p>
                        </div>
                        <input
                          type="number" min="1" placeholder="Cant."
                          value={linea.cantidad_esperada}
                          disabled={!linea.seleccionado}
                          onChange={(e) => actualizarLinea(i, { cantidad_esperada: e.target.value })}
                          className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-300"
                        />
                        <p className="text-xs text-gray-500">{linea.unidad}</p>
                        <div className="relative">
                          <input
                            type="number" min="1" placeholder="1"
                            value={linea.factor_conversion}
                            disabled={!linea.seleccionado}
                            onChange={(e) => actualizarLinea(i, { factor_conversion: e.target.value })}
                            className={`w-full h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-300 ${
                              linea.seleccionado && Number(linea.factor_conversion) > 1
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-200'
                            }`}
                          />
                          {linea.seleccionado && Number(linea.factor_conversion) > 1 && (
                            <p className="text-xs text-blue-600 mt-0.5">
                              = {Number(linea.cantidad_esperada) * Number(linea.factor_conversion) || 0} unidades
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={enviando || !codigoSeleccionado}
              className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              {enviando ? 'Enviando…' : 'Enviar ficha de ingreso'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
