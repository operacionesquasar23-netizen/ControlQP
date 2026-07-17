// app/devolucion/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerSesion } from '@/lib/sesion';
import { listarDevolucionesPendientes, formatearFecha, type DevolucionPendiente } from '@/lib/api';

export default function DevolucionPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [listo, setListo] = useState(false);
  const [devoluciones, setDevoluciones] = useState<DevolucionPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'almacen') { router.replace('/'); return; }
    setCodigo(sesion.codigo);
    setNombre(sesion.nombre);
    setListo(true);
    listarDevolucionesPendientes()
      .then(setDevoluciones)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando devoluciones.'))
      .finally(() => setCargando(false));
  }, [router]);

  function irA(href: string) {
    setSaliendo(true);
    setTimeout(() => router.push(href + '?codigo_almacen=' + encodeURIComponent(codigo)), 250);
  }

  const devolucionesFiltradas = devoluciones.filter((d) => {
    const q = busqueda.toLowerCase();
    return (
      d.cabecera.id_devolucion.toLowerCase().includes(q) ||
      d.cabecera.id_despacho.toLowerCase().includes(q) ||
      d.cabecera.cliente.toLowerCase().includes(q) ||
      d.cabecera.marca.toLowerCase().includes(q) ||
      d.cabecera.codigo_campaña.toLowerCase().includes(q)
    );
  });

  if (!listo) return null;

  return (
    <div className={`min-h-screen bg-slate-50 transition-opacity duration-250 ${saliendo ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-brand text-white px-6 py-5 animate-fade-slide-down">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Devoluciones</h1>
            <p className="text-white/70 text-xs mt-0.5">Solicitudes pendientes de confirmar</p>
          </div>
          <span className="text-white/80 text-sm">{nombre}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar por devolución, despacho, cliente, campaña…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full h-10 rounded-xl border border-gray-200 px-4 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white animate-fade-slide-up"
        />

        {cargando && <p className="text-sm text-gray-400 text-center py-12 animate-pulse-soft">Cargando devoluciones…</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">{error}</div>
        )}

        {!cargando && !error && devolucionesFiltradas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">↩️</p>
            <p className="text-sm text-gray-400">
              {busqueda ? 'No se encontraron resultados.' : 'No hay devoluciones pendientes.'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {devolucionesFiltradas.map((d, i) => (
            <button
              key={d.cabecera.id_devolucion}
              onClick={() => irA('/devolucion/' + d.cabecera.id_devolucion)}
              className={`animate-fade-slide-up delay-${Math.min(i * 75, 300)} w-full bg-white rounded-2xl border-2 border-transparent hover:border-purple-200 shadow-sm hover:shadow-md p-5 text-left transition-all duration-200 hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {d.cabecera.id_devolucion}
                    </span>
                    <span className="text-xs text-gray-400">← {d.cabecera.id_despacho}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{d.cabecera.cliente}</p>
                  <p className="text-xs text-gray-500">{d.cabecera.marca} · {d.cabecera.codigo_campaña}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Solicitado</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatearFecha(String(d.cabecera.fecha_solicitud))}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{d.detalle.length} productos</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
