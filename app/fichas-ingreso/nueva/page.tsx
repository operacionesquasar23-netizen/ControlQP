// app/fichas-ingreso/nueva/page.tsx
//
// Paso 2: Ficha de Ingreso.
// El ejecutivo elige una campaña activa y marca qué productos (de
// los ya definidos en esa campaña) espera que lleguen a almacén,
// con su cantidad esperada. Esto es solo el AVISO — la confirmación
// real de recepción contra guía de remisión es un paso aparte.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  listarCampañas,
  obtenerCampaña,
  crearFichaIngreso,
  type CampañaResumen,
  type CampañaProducto,
} from '@/lib/api';

interface LineaSeleccionada {
  nombre_producto: string;
  unidad: string;
  categoria: string;
  seleccionado: boolean;
  cantidad_esperada: string;
}

export default function NuevaFichaIngresoPage() {
  const router = useRouter();

  const [campañas, setCampañas] = useState<CampañaResumen[]>([]);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState('');
  const [ejecutivo, setEjecutivo] = useState('');

  const [productosCampaña, setProductosCampaña] = useState<CampañaProducto[]>([]);
  const [lineas, setLineas] = useState<LineaSeleccionada[]>([]);

  const [cargandoCampañas, setCargandoCampañas] = useState(true);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [fichaCreada, setFichaCreada] = useState<string | null>(null);

  useEffect(() => {
    listarCampañas()
      .then((camps) => {
        // Solo campañas activas tienen sentido para recibir ingresos.
        setCampañas(camps.filter((c) => c.estado === 'activa'));
      })
      .catch((err) => {
        setErrores([err instanceof Error ? err.message : 'No se pudieron cargar las campañas.']);
      })
      .finally(() => setCargandoCampañas(false));
  }, []);

  useEffect(() => {
    if (!codigoSeleccionado) {
      setProductosCampaña([]);
      setLineas([]);
      return;
    }

    setCargandoProductos(true);
    obtenerCampaña(codigoSeleccionado)
      .then((campaña) => {
        setProductosCampaña(campaña.productos);
        setLineas(
          campaña.productos.map((p) => ({
            nombre_producto: p.nombre_producto,
            unidad: p.unidad,
            categoria: p.categoria,
            seleccionado: false,
            cantidad_esperada: '',
          }))
        );
      })
      .catch((err) => {
        setErrores([err instanceof Error ? err.message : 'No se pudo cargar el detalle de la campaña.']);
      })
      .finally(() => setCargandoProductos(false));
  }, [codigoSeleccionado]);

  function actualizarLinea(index: number, cambios: Partial<LineaSeleccionada>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  }

  function validar(): string[] {
    const errs: string[] = [];
    if (!codigoSeleccionado) errs.push('Debes seleccionar una campaña.');
    if (!ejecutivo.trim()) errs.push('El ejecutivo es obligatorio.');

    const seleccionadas = lineas.filter((l) => l.seleccionado);
    if (seleccionadas.length === 0) {
      errs.push('Debes marcar al menos un producto que va a ingresar.');
    }
    seleccionadas.forEach((l) => {
      const cantidad = Number(l.cantidad_esperada);
      if (!l.cantidad_esperada || isNaN(cantidad) || cantidad <= 0) {
        errs.push(`Indica una cantidad válida para "${l.nombre_producto}".`);
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
      const seleccionadas = lineas.filter((l) => l.seleccionado);
      const resultado = await crearFichaIngreso({
        codigo_campaña: codigoSeleccionado,
        ejecutivo: ejecutivo.trim(),
        lineas: seleccionadas.map((l) => ({
          nombre_producto: l.nombre_producto,
          cantidad_esperada: Number(l.cantidad_esperada),
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
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">
            ✅
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ficha de ingreso enviada</h1>
          <p className="text-sm text-gray-500 mb-6">
            La ficha <strong className="text-gray-700">{fichaCreada}</strong> quedó registrada para la
            campaña <strong className="text-gray-700">{codigoSeleccionado}</strong>, pendiente de
            confirmación en almacén.
          </p>
          <button
            onClick={() => {
              setFichaCreada(null);
              setCodigoSeleccionado('');
              setEjecutivo('');
              setErrores([]);
            }}
            className="inline-block bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Registrar otra ficha
          </button>
          <div className="mt-3">
            <Link href="/" className="text-xs text-gray-400 hover:text-blue-700">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-white/80 hover:text-white text-sm">← Inicio</Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nueva ficha de ingreso</h1>
        <p className="text-sm text-gray-500 mb-6">
          Avisa qué productos esperas que lleguen a almacén para una campaña activa.
        </p>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">
              {errores.map((e, i) => (
                <li key={i} className="text-sm">{e}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={manejarSubmit}>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-4">Campaña</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Selecciona la campaña</label>
                <select
                  value={codigoSeleccionado}
                  onChange={(e) => setCodigoSeleccionado(e.target.value)}
                  disabled={cargandoCampañas}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {cargandoCampañas ? 'Cargando campañas…' : 'Selecciona una campaña'}
                  </option>
                  {campañas.map((c) => (
                    <option key={c.codigo_campaña} value={c.codigo_campaña}>
                      {c.codigo_campaña} — {c.cliente} ({c.marca})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Ejecutivo</label>
                <input
                  type="text"
                  placeholder="Paul Najarro"
                  value={ejecutivo}
                  onChange={(e) => setEjecutivo(e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {codigoSeleccionado && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Productos que van a ingresar</p>
              <p className="text-xs text-gray-400 mb-4">
                Marca los productos esperados de esta campaña e indica la cantidad.
              </p>

              {cargandoProductos && (
                <p className="text-sm text-gray-400">Cargando productos de la campaña…</p>
              )}

              {!cargandoProductos && productosCampaña.length === 0 && (
                <p className="text-sm text-gray-400">Esta campaña no tiene productos registrados.</p>
              )}

              {!cargandoProductos && lineas.length > 0 && (
                <div className="space-y-2">
                  {lineas.map((linea, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[auto_2fr_1fr_1fr] gap-3 items-center border border-gray-100 rounded-lg px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={linea.seleccionado}
                        onChange={(e) => actualizarLinea(i, { seleccionado: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="text-sm text-gray-900">{linea.nombre_producto}</p>
                        <p className="text-xs text-gray-400">{linea.categoria}</p>
                      </div>
                      <input
                        type="number"
                        min="1"
                        placeholder="Cantidad"
                        value={linea.cantidad_esperada}
                        disabled={!linea.seleccionado}
                        onChange={(e) => actualizarLinea(i, { cantidad_esperada: e.target.value })}
                        className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-300"
                      />
                      <p className="text-xs text-gray-400">{linea.unidad}</p>
                    </div>
                  ))}
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
              {enviando ? 'Enviando…' : 'Enviar ficha de ingreso'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
