// app/seguimiento/[codigo]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerSesion } from '@/lib/sesion';
import { obtenerExpedienteCampaña, formatearFecha, type ExpedienteCampaña } from '@/lib/api';

type Pestaña = 'stock' | 'ingresos' | 'despachos' | 'devoluciones';

export default function ExpedientePage({ params }: { params: { codigo: string } }) {
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [expediente, setExpediente] = useState<ExpedienteCampaña | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestaña, setPestaña] = useState<Pestaña>('stock');
  const [saliendo, setSaliendo] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  function alternar(idItem: string) {
    setAbierto((prev) => (prev === idItem ? null : idItem));
  }

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'comercial') { router.replace('/'); return; }
    setListo(true);
    obtenerExpedienteCampaña(params.codigo, sesion.codigo)
      .then(setExpediente)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando expediente.'))
      .finally(() => setCargando(false));
  }, [router, params.codigo]);

  if (!listo) return null;

  const PESTAÑAS: { key: Pestaña; label: string; icon: string }[] = [
    { key: 'stock',        label: 'Stock',        icon: '📦' },
    { key: 'ingresos',     label: 'Ingresos',     icon: '📥' },
    { key: 'despachos',    label: 'Despachos',    icon: '🚚' },
    { key: 'devoluciones', label: 'Devoluciones', icon: '↩️' },
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
              onClick={() => { setPestaña(p.key); setAbierto(null); }}
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
                    <button
                      type="button"
                      onClick={() => alternar(f.id_ficha)}
                      className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-xs">{abierto === f.id_ficha ? '▾' : '▸'}</span>
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{f.id_ficha}</span>
                        <span className="text-xs text-gray-400">{formatearFecha(f.fecha_envio)}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        f.estado === 'recibida' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {f.estado === 'recibida' ? '✅ Recibida' : '⏳ Pendiente'}
                      </span>
                    </button>
                    {abierto === f.id_ficha && (
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left text-xs text-gray-400 font-medium px-6 py-2">Producto</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Esperado</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Recibido</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Estado</th>
                          <th className="text-center text-xs text-gray-400 font-medium px-3 py-2 pr-6">Foto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.detalle.map((d, i) => {
                          const esperadoBase = d.cantidad_esperada_base;
                          const recibido     = d.cantidad_recibida;
                          const completo     = recibido !== null && recibido >= esperadoBase;
                          const parcial      = recibido !== null && recibido > 0 && recibido < esperadoBase;
                          const sinRecibir   = recibido === null || recibido === 0;
                          return (
                            <tr key={i} className="border-t border-gray-50">
                              <td className="px-6 py-2.5 text-sm text-gray-900">{d.nombre_producto}</td>
                              <td className="px-3 py-2.5 text-center">
                                <p className="text-sm text-gray-500">{d.cantidad_esperada_base} {d.unidad_recibida || 'unid.'}</p>
                                {d.factor_conversion > 1 && (
                                  <p className="text-xs text-gray-300">({d.cantidad_esperada} × {d.factor_conversion})</p>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {recibido !== null ? (
                                  <div>
                                    <p className={`text-sm font-medium ${completo ? 'text-green-700' : parcial ? 'text-amber-600' : 'text-red-600'}`}>
                                      {recibido} {d.unidad_recibida || 'unid.'}
                                    </p>
                                    {parcial && (
                                      <p className="text-xs text-amber-500">faltan {esperadoBase - recibido}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 text-sm">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center text-sm">
                                {sinRecibir ? '⏳' : completo ? '✅' : '⚠️ Parcial'}
                              </td>
                              <td className="px-3 py-2.5 pr-6 text-center">
                                {d.url_foto ? (
                                  <button onClick={() => setFotoAmpliada(d.url_foto.replace('&sz=w200', '&sz=w1200'))}>
                                    <img src={d.url_foto} alt={d.nombre_producto}
                                      className="w-10 h-10 object-cover rounded-lg hover:scale-110 transition-transform border border-gray-100" />
                                  </button>
                                ) : (
                                  <span className="text-gray-200">🖼</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── DESPACHOS ─────────────────────────────────── */}
            {pestaña === 'despachos' && (
              <div className="space-y-4 animate-fade-slide-up">
                {expediente.solicitudesDespacho.length === 0 ? (
                  <EmptyState icon="🚚" texto="Sin SOLPEDs registradas." />
                ) : expediente.solicitudesDespacho.map((s) => {
                  // Tiendas de la SOLPED con las que ya tienen despacho vinculadas
                  const tiendasDetalle = Array.from(new Set(s.detalle.map((l) => l.nombre_lugar)));
                  const tiendasDespachadas = new Set(s.despachos.flatMap((desp) => desp.detalle.map((l) => l.nombre_lugar)));
                  const totalTiendas = tiendasDetalle.length;
                  const cantidadDespachadas = tiendasDespachadas.size;
                  const todasDespachadas = totalTiendas > 0 && cantidadDespachadas >= totalTiendas;

                  // Cantidad real despachada por tienda + producto, para comparar contra lo solicitado
                  const despachadoPorTiendaProducto = new Map<string, number>();
                  s.despachos.forEach((desp) => {
                    desp.detalle.forEach((l) => {
                      despachadoPorTiendaProducto.set(`${l.nombre_lugar}__${l.nombre_producto}`, l.cantidad_despachada);
                    });
                  });

                  // Info del despacho (foto, fecha, responsable) por tienda
                  const despachoPorTienda = new Map<string, typeof s.despachos[number]>();
                  s.despachos.forEach((desp) => {
                    const lugar = desp.detalle[0]?.nombre_lugar;
                    if (lugar) despachoPorTienda.set(lugar, desp);
                  });

                  return (
                    <div key={s.id_solped} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => alternar(s.id_solped)}
                        className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-300 text-xs">{abierto === s.id_solped ? '▾' : '▸'}</span>
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{s.id_solped}</span>
                          <span className="text-xs text-gray-400">v{s.version}</span>
                          <span className="text-xs text-gray-400">Despacho: {formatearFecha(s.fecha_despacho)}</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          todasDespachadas ? 'bg-green-50 text-green-700' :
                          cantidadDespachadas > 0 ? 'bg-amber-50 text-amber-700' :
                          s.estado === 'vigente' ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {todasDespachadas
                            ? '✅ Despachada'
                            : `${cantidadDespachadas} / ${totalTiendas} tiendas despachadas`}
                        </span>
                      </button>

                      {abierto === s.id_solped && (
                      <>
                      {(() => {
                        const lugares = s.detalle.reduce((acc, l) => {
                          if (!acc[l.nombre_lugar]) acc[l.nombre_lugar] = [];
                          acc[l.nombre_lugar].push(l);
                          return acc;
                        }, {} as Record<string, typeof s.detalle>);
                        return (
                          <div className="space-y-4 py-4">
                            {Object.entries(lugares).map(([lugar, lineas]) => {
                              const desp = despachoPorTienda.get(lugar);
                              return (
                                <div key={lugar}>
                                  <div className="flex items-center gap-2 px-6 mb-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lugar}</p>
                                    {desp ? (
                                      <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">✅ Despachado {formatearFecha(desp.fecha)}</span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">⏳ Pendiente</span>
                                    )}
                                  </div>
                                  <table className="w-full">
                                    <thead>
                                      <tr className="bg-gray-50">
                                        <th className="text-left text-xs text-gray-400 font-medium px-6 py-2">Producto</th>
                                        <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Solicitado</th>
                                        <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Despachado</th>
                                        <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Estado</th>
                                        <th className="text-center text-xs text-gray-400 font-medium px-3 py-2 pr-6">Foto</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lineas.map((l, i) => {
                                        const clave = `${lugar}__${l.nombre_producto}`;
                                        const despachadoReal = despachadoPorTiendaProducto.get(clave);
                                        const completo   = despachadoReal !== undefined && despachadoReal >= l.cantidad_solicitada;
                                        const parcial    = despachadoReal !== undefined && despachadoReal > 0 && despachadoReal < l.cantidad_solicitada;
                                        const sinDespachar = despachadoReal === undefined;
                                        return (
                                          <tr key={i} className="border-t border-gray-50">
                                            <td className="px-6 py-2.5 text-sm text-gray-900">{l.nombre_producto}</td>
                                            <td className="px-3 py-2.5 text-center text-sm text-gray-500">{l.cantidad_solicitada}</td>
                                            <td className="px-3 py-2.5 text-center">
                                              {!sinDespachar ? (
                                                <p className={`text-sm font-medium ${completo ? 'text-green-700' : parcial ? 'text-amber-600' : 'text-red-600'}`}>{despachadoReal}</p>
                                              ) : (
                                                <span className="text-gray-300 text-sm">—</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-sm">
                                              {sinDespachar ? '⏳' : completo ? '✅' : '⚠️ Parcial'}
                                            </td>
                                            <td className="px-3 py-2.5 pr-6 text-center">
                                              {desp?.url_foto ? (
                                                <button onClick={() => setFotoAmpliada(desp.url_foto.replace('&sz=w200', '&sz=w1200'))}>
                                                  <img src={desp.url_foto} alt={`Foto despacho ${lugar}`}
                                                    className="w-10 h-10 object-cover rounded-lg hover:scale-110 transition-transform border border-gray-100 mx-auto" />
                                                </button>
                                              ) : (
                                                <span className="text-gray-200">🖼</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      {!todasDespachadas && (
                        <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                          ⚠️ Quedan {totalTiendas - cantidadDespachadas} tienda{totalTiendas - cantidadDespachadas !== 1 ? 's' : ''} sin despachar
                        </div>
                      )}
                      </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── DEVOLUCIONES ──────────────────────────────── */}
            {pestaña === 'devoluciones' && (
              <div className="space-y-4 animate-fade-slide-up">
                {expediente.solicitudesDevolucion.length === 0 ? (
                  <EmptyState icon="↩️" texto="Sin solicitudes de devolución registradas." />
                ) : expediente.solicitudesDevolucion.map((d) => (
                  <div key={d.id_devolucion} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => alternar(d.id_devolucion)}
                      className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-xs">{abierto === d.id_devolucion ? '▾' : '▸'}</span>
                        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{d.id_devolucion}</span>
                        <span className="text-xs text-gray-400">{formatearFecha(d.fecha_solicitud)}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        d.estado === 'recibida' ? 'bg-green-50 text-green-700' :
                        d.estado === 'parcialmente_recibida' ? 'bg-amber-50 text-amber-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {d.estado === 'recibida' ? '✅ Confirmada' : d.estado === 'parcialmente_recibida' ? '⏳ Parcial' : '⏳ Pendiente'}
                      </span>
                    </button>

                    {abierto === d.id_devolucion && (
                    <>
                    {/* Detalle devolución agrupado por lugar, en tabla como Ingresos */}
                    {(() => {
                      const lugares = d.detalle.reduce((acc, l) => {
                        if (!acc[l.nombre_lugar]) acc[l.nombre_lugar] = [];
                        acc[l.nombre_lugar].push(l);
                        return acc;
                      }, {} as Record<string, typeof d.detalle>);
                      const confPorTienda = new Map(d.confirmaciones.map((c) => [c.nombre_lugar, c]));
                      return (
                        <div className="space-y-4 py-4">
                          {Object.entries(lugares).map(([lugar, lineas]) => {
                            const conf = confPorTienda.get(lugar);
                            return (
                              <div key={lugar}>
                                <div className="flex items-center gap-2 px-6 mb-2">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lugar}</p>
                                  {conf ? (
                                    <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">✅ Confirmado {formatearFecha(conf.fecha)}</span>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">⏳ Pendiente</span>
                                  )}
                                </div>
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="text-left text-xs text-gray-400 font-medium px-6 py-2">Producto</th>
                                      <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Solicitado</th>
                                      <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Recibido</th>
                                      <th className="text-center text-xs text-gray-400 font-medium px-3 py-2">Estado</th>
                                      <th className="text-center text-xs text-gray-400 font-medium px-3 py-2 pr-6">Foto</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lineas.map((l, i) => {
                                      const recibido = l.cantidad_recibida;
                                      const completo   = recibido !== null && recibido >= l.cantidad_solicitada;
                                      const parcial    = recibido !== null && recibido > 0 && recibido < l.cantidad_solicitada;
                                      const sinRecibir = recibido === null;
                                      return (
                                        <tr key={i} className="border-t border-gray-50">
                                          <td className="px-6 py-2.5 text-sm text-gray-900">{l.nombre_producto}</td>
                                          <td className="px-3 py-2.5 text-center text-sm text-gray-500">{l.cantidad_solicitada}</td>
                                          <td className="px-3 py-2.5 text-center">
                                            {!sinRecibir ? (
                                              <p className={`text-sm font-medium ${completo ? 'text-green-700' : parcial ? 'text-amber-600' : 'text-red-600'}`}>{recibido}</p>
                                            ) : (
                                              <span className="text-gray-300 text-sm">—</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2.5 text-center text-sm">
                                            {sinRecibir ? '⏳' : completo ? '✅' : '⚠️ Parcial'}
                                          </td>
                                          <td className="px-3 py-2.5 pr-6 text-center">
                                            {conf?.url_foto ? (
                                              <button onClick={() => setFotoAmpliada(conf.url_foto.replace('&sz=w200', '&sz=w1200'))}>
                                                <img src={conf.url_foto} alt={`Foto devolución ${lugar}`}
                                                  className="w-10 h-10 object-cover rounded-lg hover:scale-110 transition-transform border border-gray-100 mx-auto" />
                                              </button>
                                            ) : (
                                              <span className="text-gray-200">🖼</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Resumen de cada confirmación de tienda (responsable, observaciones) */}
                    {d.confirmaciones.length > 0 && (
                      <div className="border-t border-green-100">
                        {d.confirmaciones.map((c, i) => (
                          <div key={i} className="px-6 py-3 bg-green-50 border-b border-green-100 last:border-b-0">
                            <p className="text-xs text-green-700">
                              ✅ {c.nombre_lugar} · Confirmada el {formatearFecha(c.fecha)} por {c.recibido_por}
                              {c.observaciones && ` · ${c.observaciones}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {d.estado !== 'recibida' && (() => {
                      const tiendasTotales = new Set(d.detalle.map((l) => l.nombre_lugar)).size;
                      const tiendasConfirmadas = new Set(d.confirmaciones.map((c) => c.nombre_lugar)).size;
                      const faltan = tiendasTotales - tiendasConfirmadas;
                      return (
                        <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                          ⏳ Esperando confirmación de almacén en {faltan} tienda{faltan !== 1 ? 's' : ''}
                        </div>
                      );
                    })()}
                    </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal foto ampliada */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 animate-fade-in"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="relative max-w-2xl w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <img src={fotoAmpliada} alt="Foto" className="w-full rounded-2xl shadow-2xl" />
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
            >✕</button>
          </div>
        </div>
      )}
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
