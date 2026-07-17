// app/seguimiento/[codigo]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerSesion } from '@/lib/sesion';
import { obtenerExpedienteCampaña, formatearFecha, type ExpedienteCampaña } from '@/lib/api';

type Pestaña = 'stock' | 'ingresos' | 'despachos' | 'devoluciones';

export default function ExpedientePage({ params }: { params: { codigo: string } }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [listo, setListo] = useState(false);
  const [expediente, setExpediente] = useState<ExpedienteCampaña | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestaña, setPestaña] = useState<Pestaña>('stock');
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'comercial') { router.replace('/'); return; }
    setCodigo(sesion.codigo);
    setListo(true);
    obtenerExpedienteCampaña(params.codigo, sesion.codigo)
      .then(setExpediente)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando expediente.'))
      .finally(() => setCargando(false));
  }, [router, params.codigo]);

  if (!listo) return null;

  const PESTAÑAS: { key: Pestaña; label: string; icon: string }[] = [
    { key: 'stock',        label: 'Stock',       icon: '📦' },
    { key: 'ingresos',     label: 'Ingresos',    icon: '📥' },
    { key: 'despachos',    label: 'Despachos',   icon: '🚚' },
    { key: 'devoluciones', label: 'Devoluciones',icon: '↩️' },
  ];

  return (
    <div className={`min-h-screen bg-slate-50 transition-opacity duration-250 ${saliendo ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-brand text-white px-6 py-5 animate-fade-slide-down">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <button
              onClick={() => { setSaliendo(true); setTimeout(() => router.push('/seguimiento'), 250); }}
              className="text-white/70 hover:text-white text-xs mb-1 block"
            >← Seguimiento</button>
            <h1 className="text-lg font-bold">{params.codigo}</h1>
            {expediente && (
              <p className="text-white/70 text-xs mt-0.5">
                {expediente.cabecera.cliente} · {expediente.cabecera.marca} · {formatearFecha(expediente.cabecera.fecha_inicio)} → {formatearFecha(expediente.cabecera.fecha_fin)}
              </p>
            )}
          </div>
          {expediente && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              expediente.cabecera.estado === 'activa' ? 'bg-green-400/20 text-green-200' : 'bg-white/10 text-white/60'
            }`}>
              {expediente.cabecera.estado === 'activa' ? '● Activa' : 'Inactiva'}
            </span>
          )}
        </div>
      </div>

      {/* Pestañas */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {PESTAÑAS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPestaña(p.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                pestaña === p.key
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {cargando && <p className="text-sm text-gray-400 text-center py-12 animate-pulse-soft">Cargando expediente…</p>}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">{error}</div>}

        {expediente && (
          <>
            {/* ── STOCK ─────────────────────────────────────── */}
            {pestaña === 'stock' && (
              <div className="animate-fade-slide-up">
                {expediente.stock.length === 0 ? (
                  <EmptyState icon="📦" texto="Sin movimientos de stock registrados." />
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Producto</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-3">Recibido</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-3">Despachado</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-3">Devuelto</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-3">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expediente.stock.map((s, i) => (
                          <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                            <td className="px-6 py-3 text-sm text-gray-900">{s.nombre_producto}</td>
                            <td className="px-3 py-3 text-center text-sm text-blue-700 font-medium">{s.recibido}</td>
                            <td className="px-3 py-3 text-center text-sm text-amber-600 font-medium">{s.despachado}</td>
                            <td className="px-3 py-3 text-center text-sm text-purple-600 font-medium">{s.devuelto}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                                s.stock > 0 ? 'text-green-700 bg-green-50' : 'text-gray-400 bg-gray-50'
                              }`}>{s.stock}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── INGRESOS ──────────────────────────────────── */}
            {pestaña === 'ingresos' && (
              <div className="space-y-4 animate-fade-slide-up">
                {expediente.ingresos.length === 0 ? (
                  <EmptyState icon="📥" texto="Sin fichas de ingreso registradas." />
                ) : expediente.ingresos.map((f) => (
                  <div key={f.id_ficha} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{f.id_ficha}</span>
                        <span className="text-xs text-gray-400">{formatearFecha(f.fecha_envio)}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        f.estado === 'recibida' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {f.estado === 'recibida' ? '✅ Recibida' : '⏳ Pendiente'}
                      </span>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left text-xs text-gray-400 font-medium px-6 py-2">Producto</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Esperado</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Recibido</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.detalle.map((d, i) => {
                          const diff = d.cantidad_recibida !== null && d.cantidad_recibida < d.cantidad_esperada;
                          return (
                            <tr key={i} className="border-t border-gray-50">
                              <td className="px-6 py-2.5 text-sm text-gray-900">{d.nombre_producto}</td>
                              <td className="px-3 py-2.5 text-center text-sm text-gray-500">{d.cantidad_esperada}</td>
                              <td className="px-3 py-2.5 text-center text-sm font-medium">
                                {d.cantidad_recibida !== null ? (
                                  <span className={diff ? 'text-amber-600' : 'text-green-700'}>{d.cantidad_recibida}</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center text-xs">
                                {d.cantidad_recibida === null ? '⏳' : diff ? '⚠️ Parcial' : '✅'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* ── DESPACHOS ─────────────────────────────────── */}
            {pestaña === 'despachos' && (
              <div className="space-y-4 animate-fade-slide-up">
                {expediente.solicitudesDespacho.length === 0 ? (
                  <EmptyState icon="🚚" texto="Sin SOLPEDs registradas." />
                ) : expediente.solicitudesDespacho.map((s) => (
                  <div key={s.id_solped} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{s.id_solped}</span>
                        <span className="text-xs text-gray-400">v{s.version}</span>
                        <span className="text-xs text-gray-400">Despacho: {formatearFecha(s.fecha_despacho)}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.despacho ? 'bg-green-50 text-green-700' :
                        s.estado === 'vigente' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {s.despacho ? '✅ Despachada' : s.estado === 'vigente' ? '⏳ Sin despacho' : s.estado}
                      </span>
                    </div>

                    {/* Detalle SOLPED agrupado por lugar */}
                    {(() => {
                      const lugares = s.detalle.reduce((acc, l) => {
                        if (!acc[l.nombre_lugar]) acc[l.nombre_lugar] = [];
                        acc[l.nombre_lugar].push(l);
                        return acc;
                      }, {} as Record<string, typeof s.detalle>);
                      return (
                        <div className="px-6 py-4 space-y-3">
                          {Object.entries(lugares).map(([lugar, lineas]) => (
                            <div key={lugar}>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{lugar}</p>
                              <div className="space-y-1">
                                {lineas.map((l, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-700">{l.nombre_producto}</span>
                                    <span className="text-gray-500">× {l.cantidad_solicitada}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Info despacho */}
                    {s.despacho && (
                      <div className="px-6 py-3 bg-green-50 border-t border-green-100 text-xs text-green-700">
                        🚚 Despachado el {formatearFecha(s.despacho.fecha)} por {s.despacho.despachado_por} · {s.despacho.id_despacho}
                      </div>
                    )}
                    {!s.despacho && s.estado === 'vigente' && (
                      <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                        ⚠️ SOLPED vigente — aún no hay despacho registrado
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── DEVOLUCIONES ──────────────────────────────── */}
            {pestaña === 'devoluciones' && (
              <div className="space-y-4 animate-fade-slide-up">
                {expediente.solicitudesDevolucion.length === 0 ? (
                  <EmptyState icon="↩️" texto="Sin solicitudes de devolución registradas." />
                ) : expediente.solicitudesDevolucion.map((d) => (
                  <div key={d.id_devolucion} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{d.id_devolucion}</span>
                        <span className="text-xs text-gray-400">← {d.id_despacho}</span>
                        <span className="text-xs text-gray-400">{formatearFecha(d.fecha_solicitud)}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        d.estado === 'recibida' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {d.estado === 'recibida' ? '✅ Confirmada' : '⏳ Pendiente'}
                      </span>
                    </div>

                    {/* Detalle devolución agrupado por lugar */}
                    {(() => {
                      const lugares = d.detalle.reduce((acc, l) => {
                        if (!acc[l.nombre_lugar]) acc[l.nombre_lugar] = [];
                        acc[l.nombre_lugar].push(l);
                        return acc;
                      }, {} as Record<string, typeof d.detalle>);
                      return (
                        <div className="px-6 py-4 space-y-3">
                          {Object.entries(lugares).map(([lugar, lineas]) => (
                            <div key={lugar}>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{lugar}</p>
                              <div className="space-y-1">
                                {lineas.map((l, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-700">{l.nombre_producto}</span>
                                    <span className="text-gray-500">× {l.cantidad_solicitada}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Info confirmación */}
                    {d.confirmacion && (
                      <div className="px-6 py-3 bg-green-50 border-t border-green-100 text-xs text-green-700">
                        ✅ Confirmada el {formatearFecha(d.confirmacion.fecha)} por {d.confirmacion.recibido_por}
                        {d.confirmacion.observaciones && ` · ${d.confirmacion.observaciones}`}
                      </div>
                    )}
                    {!d.confirmacion && (
                      <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                        ⏳ Esperando confirmación de almacén
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState({ icon, texto }: { icon: string; texto: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-sm text-gray-400">{texto}</p>
    </div>
  );
}
