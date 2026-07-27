// app/devolucion/nueva/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerSesion } from '@/lib/sesion';
import {
  listarDespachosDeCampaña,
  crearSolicitudDevolucion,
  formatearFecha,
  type DespachoParaDevolucion,
} from '@/lib/api';

interface LineaForm {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_despachada: number;
  cantidad_devuelta: string;
  incluir: boolean;
}

export default function NuevaDevolucionPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [listo, setListo] = useState(false);

  const [despachos, setDespachos] = useState<DespachoParaDevolucion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [despachoElegido, setDespachoElegido] = useState<DespachoParaDevolucion | null>(null);
  const [lineas, setLineas] = useState<LineaForm[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [confirmado, setConfirmado] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'comercial') { router.replace('/'); return; }
    setCodigo(sesion.codigo);
    setListo(true);
    listarDespachosDeCampaña(sesion.codigo)
      .then(setDespachos)
      .catch((err) => setErrorCarga(err instanceof Error ? err.message : 'Error cargando despachos.'))
      .finally(() => setCargando(false));
  }, [router]);

  // Filtro sobre la lista de despachos
  const despachosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return despachos;
    return despachos.filter((d) =>
      d.cabecera.id_despacho.toLowerCase().includes(q) ||
      d.cabecera.cliente.toLowerCase().includes(q) ||
      d.cabecera.marca.toLowerCase().includes(q) ||
      d.cabecera.codigo_campaña.toLowerCase().includes(q)
    );
  }, [despachos, busqueda]);

  function elegirDespacho(d: DespachoParaDevolucion) {
    setDespachoElegido(d);
    setLineas(d.detalle.map((l) => ({
      nombre_lugar       : l.nombre_lugar,
      nombre_producto    : l.nombre_producto,
      cantidad_despachada: Number(l.cantidad_despachada),
      cantidad_devuelta  : String(l.cantidad_despachada),
      incluir            : true,
    })));
    setErrores([]);
  }

  function actualizarLinea(i: number, cantidad: string) {
    setLineas((prev) => prev.map((l, idx) => idx === i ? { ...l, cantidad_devuelta: cantidad } : l));
  }

  function toggleIncluir(i: number) {
    setLineas((prev) => prev.map((l, idx) => idx === i ? { ...l, incluir: !l.incluir } : l));
  }

  function validar(): string[] {
    const errs: string[] = [];
    const activas = lineas.filter((l) => l.incluir);
    if (activas.length === 0) errs.push('Debe incluir al menos un producto.');
    activas.forEach((l) => {
      const cant = Number(l.cantidad_devuelta);
      if (!l.cantidad_devuelta || isNaN(cant) || cant <= 0)
        errs.push(`${l.nombre_producto}: la cantidad debe ser mayor a 0.`);
      if (cant > l.cantidad_despachada)
        errs.push(`${l.nombre_producto}: no puede devolver más de lo despachado (${l.cantidad_despachada}).`);
    });
    return errs;
  }

  async function manejarEnviar() {
    const errs = validar();
    setErrores(errs);
    if (errs.length > 0) return;
    setEnviando(true);
    try {
      const resultado = await crearSolicitudDevolucion({
        id_despacho     : despachoElegido!.cabecera.id_despacho,
        codigo_ejecutivo: codigo,
        lineas          : lineas
          .filter((l) => l.incluir)
          .map((l) => ({
            nombre_lugar       : l.nombre_lugar,
            nombre_producto    : l.nombre_producto,
            cantidad_despachada: l.cantidad_despachada,
            cantidad_devuelta  : Number(l.cantidad_devuelta),
          })),
      });
      setConfirmado(resultado.id_devolucion);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error al crear la solicitud.']);
    } finally {
      setEnviando(false);
    }
  }

  if (!listo) return null;

  if (confirmado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Solicitud creada</h1>
          <p className="text-sm text-gray-500 mb-2"><strong>{confirmado}</strong></p>
          <p className="text-sm text-gray-500 mb-6">Almacén recibirá la notificación para confirmar la devolución.</p>
          <button
            onClick={() => { setSaliendo(true); setTimeout(() => router.push('/comercial'), 250); }}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const lugares = despachoElegido
    ? lineas.reduce((acc, l) => {
        if (!acc[l.nombre_lugar]) acc[l.nombre_lugar] = [];
        acc[l.nombre_lugar].push(l);
        return acc;
      }, {} as Record<string, LineaForm[]>)
    : {};

  return (
    <div className={`min-h-screen bg-slate-50 transition-opacity duration-250 ${saliendo ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Nueva Devolución</h1>
            <p className="text-white/70 text-xs mt-0.5">Solicitud de retorno de elementos</p>
          </div>
          <button
            onClick={() => { setSaliendo(true); setTimeout(() => router.push('/comercial'), 250); }}
            className="text-white/70 hover:text-white text-sm"
          >← Volver</button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">
              {errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}
            </ul>
          </div>
        )}

        {/* Paso 1: elegir despacho */}
        {!despachoElegido && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Selecciona el despacho a devolver</h2>
            <p className="text-sm text-gray-500 mb-4">Solo aparecen despachos sin devolución registrada.</p>

            {/* Buscador */}
            {!cargando && despachos.length > 0 && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Buscar por despacho, campaña, cliente o marca…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                {busqueda && (
                  <p className="text-xs text-gray-400 mt-1.5 px-1">
                    {despachosFiltrados.length} de {despachos.length} despachos
                  </p>
                )}
              </div>
            )}

            {cargando && <p className="text-sm text-gray-400 text-center py-12">Cargando despachos…</p>}
            {errorCarga && <p className="text-sm text-red-600">{errorCarga}</p>}

            {!cargando && !errorCarga && despachos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-gray-400">No hay despachos disponibles para devolver.</p>
              </div>
            )}

            {!cargando && !errorCarga && despachos.length > 0 && despachosFiltrados.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No se encontraron despachos con esa búsqueda.</p>
              </div>
            )}

            <div className="space-y-3">
              {despachosFiltrados.map((d) => (
                <button
                  key={d.cabecera.id_despacho}
                  onClick={() => elegirDespacho(d)}
                  className="w-full bg-white rounded-2xl border-2 border-transparent hover:border-blue-200 shadow-sm hover:shadow-md p-5 text-left transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        {d.cabecera.id_despacho}
                      </span>
                      <p className="text-sm font-semibold text-gray-900 mt-2">{d.cabecera.cliente}</p>
                      <p className="text-xs text-gray-500">{d.cabecera.marca} · {d.cabecera.codigo_campaña}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">Fecha despacho</p>
                      <p className="text-sm font-semibold text-gray-900">{formatearFecha(String(d.cabecera.fecha))}</p>
                      <p className="text-xs text-gray-400 mt-1">{d.detalle.length} productos</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Paso 2: ingresar cantidades */}
        {despachoElegido && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => { setDespachoElegido(null); setBusqueda(''); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >← Cambiar despacho</button>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {despachoElegido.cabecera.id_despacho}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                {despachoElegido.cabecera.cliente} · {despachoElegido.cabecera.marca}
              </p>
              <p className="text-xs text-gray-400 mb-5">
                Despacho del {formatearFecha(String(despachoElegido.cabecera.fecha))} · {despachoElegido.cabecera.codigo_campaña}
              </p>

              <div className="space-y-6">
                {Object.entries(lugares).map(([lugar, items]) => (
                  <div key={lugar}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{lugar}</p>
                    <div className="grid grid-cols-[auto_1fr_80px_80px] gap-2 mb-2 px-1">
                      <span className="text-xs text-gray-400">✓</span>
                      <span className="text-xs text-gray-400">Producto</span>
                      <span className="text-xs text-gray-400 text-center">Despachado</span>
                      <span className="text-xs text-gray-400 text-center">A devolver</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((linea, i) => {
                        const idx = lineas.findIndex(
                          (l) => l.nombre_lugar === linea.nombre_lugar && l.nombre_producto === linea.nombre_producto
                        );
                        return (
                          <div key={i} className="grid grid-cols-[auto_1fr_80px_80px] gap-2 items-center">
                            <input
                              type="checkbox"
                              checked={linea.incluir}
                              onChange={() => toggleIncluir(idx)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600"
                            />
                            <p className={`text-sm ${!linea.incluir ? 'text-gray-300 line-through' : 'text-gray-900'}`}>
                              {linea.nombre_producto}
                            </p>
                            <p className="text-sm text-gray-400 text-center">{linea.cantidad_despachada}</p>
                            <input
                              type="number"
                              min="1"
                              max={linea.cantidad_despachada}
                              value={linea.cantidad_devuelta}
                              disabled={!linea.incluir}
                              onChange={(e) => actualizarLinea(idx, e.target.value)}
                              className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:bg-gray-50"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={manejarEnviar}
                disabled={enviando}
                className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {enviando ? 'Enviando…' : 'Crear solicitud de devolución'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
