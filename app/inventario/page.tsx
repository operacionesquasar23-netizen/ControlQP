// app/inventario/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { obtenerInventario, formatearFecha, type CampañaInventario } from '@/lib/api';

export default function InventarioPage() {
  const [campañas, setCampañas] = useState<CampañaInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  useEffect(() => {
    obtenerInventario()
      .then((data) => {
        setCampañas(data);
        setExpandidas(new Set(data.map((c) => c.codigo_campaña)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando inventario.'))
      .finally(() => setCargando(false));
  }, []);

  function toggleExpandida(codigo: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      next.has(codigo) ? next.delete(codigo) : next.add(codigo);
      return next;
    });
  }

  const campañasFiltradas = campañas.filter((c) => {
    const q = busqueda.toLowerCase();
    return (
      c.codigo_campaña.toLowerCase().includes(q) ||
      c.cliente.toLowerCase().includes(q) ||
      c.marca.toLowerCase().includes(q) ||
      c.productos.some((p) => p.nombre_producto.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-brand text-white px-6 py-5 animate-fade-slide-down">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Inventario</h1>
            <p className="text-white/70 text-xs mt-0.5">Stock en tiempo real por campaña</p>
          </div>
          <a href="/" className="text-white/70 hover:text-white text-xs border border-white/20 hover:border-white/50 rounded-lg px-3 py-1.5 transition-colors">
            ← Inicio
          </a>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar campaña, cliente, producto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full h-10 rounded-xl border border-gray-200 px-4 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white animate-fade-slide-up"
        />

        {cargando && (
          <p className="text-sm text-gray-400 text-center py-12 animate-pulse-soft">Cargando inventario…</p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">{error}</div>
        )}

        {!cargando && !error && campañasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm text-gray-400">
              {busqueda ? 'No se encontraron resultados.' : 'No hay campañas registradas.'}
            </p>
          </div>
        )}

        {/* Lista de campañas */}
        <div className="space-y-4">
          {campañasFiltradas.map((campaña, ci) => {
            const expandida = expandidas.has(campaña.codigo_campaña);
            const conStock  = campaña.productos.filter((p) => p.stock > 0).length;
            const sinStock  = campaña.productos.filter((p) => p.stock === 0).length;

            return (
              <div
                key={campaña.codigo_campaña}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-slide-up delay-${Math.min(ci * 75, 300)}`}
              >
                {/* Cabecera campaña */}
                <button
                  onClick={() => toggleExpandida(campaña.codigo_campaña)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${campaña.estado === 'activa' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {campaña.codigo_campaña}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{campaña.cliente}</span>
                        <span className="text-xs text-gray-400">{campaña.marca}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatearFecha(campaña.fecha_inicio)} → {formatearFecha(campaña.fecha_fin)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="flex gap-2 text-xs">
                      {conStock > 0 && (
                        <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          {conStock} con stock
                        </span>
                      )}
                      {sinStock > 0 && (
                        <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">
                          {sinStock} sin stock
                        </span>
                      )}
                    </div>
                    <span className={`text-gray-400 transition-transform duration-200 ${expandida ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </div>
                </button>

                {/* Tabla de productos */}
                {expandida && (
                  <div className="border-t border-gray-50">
                    {campaña.productos.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Sin movimientos registrados.</p>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Producto</th>
                            <th className="text-center text-xs text-gray-400 font-medium px-3 py-3">Recibido</th>
                            <th className="text-center text-xs text-gray-400 font-medium px-3 py-3">Despachado</th>
                            <th className="text-center text-xs text-gray-400 font-medium px-3 py-3">Devuelto</th>
                            <th className="text-center text-xs text-gray-400 font-medium px-3 py-3">Stock</th>
                            <th className="text-center text-xs text-gray-400 font-medium px-3 py-3 pr-6">Foto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campaña.productos.map((p, pi) => (
                            <tr key={pi} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-3">
                                <p className="text-sm text-gray-900">{p.nombre_producto}</p>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="text-sm text-blue-700 font-medium">{p.recibido}</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="text-sm text-amber-600 font-medium">{p.despachado}</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="text-sm text-purple-600 font-medium">{p.devuelto}</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                                  p.stock > 0 ? 'text-green-700 bg-green-50' : 'text-gray-400 bg-gray-50'
                                }`}>
                                  {p.stock}
                                </span>
                              </td>
                              <td className="px-3 py-3 pr-6 text-center">
                                {p.url_foto ? (
                                  <button onClick={() => setFotoAmpliada(p.url_foto)} className="inline-block">
                                    <img
                                      src={p.url_foto}
                                      alt={p.nombre_producto}
                                      className="w-10 h-10 object-cover rounded-lg hover:scale-110 transition-transform cursor-pointer border border-gray-100"
                                    />
                                  </button>
                                ) : (
                                  <span className="text-gray-200 text-lg">🖼</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal foto ampliada */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 animate-fade-in"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="relative max-w-2xl w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <img src={fotoAmpliada} alt="Foto producto" className="w-full rounded-2xl shadow-2xl" />
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
