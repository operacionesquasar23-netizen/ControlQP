// app/inventario/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { obtenerInventario, formatearFecha, type CampañaInventario } from '@/lib/api';

interface FilaPlana {
  codigo_campaña: string;
  cliente: string;
  marca: string;
  nombre_producto: string;
  unidad: string;
  recibido: number;
  despachado: number;
  devuelto: number;
  stock: number;
  url_foto: string;
}

export default function InventarioPage() {
  const [campañas, setCampañas] = useState<CampañaInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [soloConStock, setSoloConStock] = useState(false);

  useEffect(() => {
    obtenerInventario()
      .then(setCampañas)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando inventario.'))
      .finally(() => setCargando(false));
  }, []);

  // Aplanar todas las campañas en filas individuales
  const filas: FilaPlana[] = useMemo(() => {
    const resultado: FilaPlana[] = [];
    campañas.forEach((c) => {
      c.productos.forEach((p) => {
        resultado.push({
          codigo_campaña : c.codigo_campaña,
          cliente        : c.cliente,
          marca          : c.marca,
          nombre_producto: p.nombre_producto,
          unidad         : p.unidad,
          recibido       : p.recibido,
          despachado     : p.despachado,
          devuelto       : p.devuelto,
          stock          : p.stock,
          url_foto       : p.url_foto,
        });
      });
    });
    return resultado;
  }, [campañas]);

  const filasFiltradas = useMemo(() => {
    let resultado = busqueda.trim()
      ? filas.filter((f) =>
          f.codigo_campaña.toLowerCase().includes(q) ||
          f.cliente.toLowerCase().includes(q) ||
          f.marca.toLowerCase().includes(q) ||
          f.nombre_producto.toLowerCase().includes(q) ||
          f.unidad.toLowerCase().includes(q)
        )
      : filas;

    if (soloConStock) resultado = resultado.filter((f) => f.stock > 0);
    return resultado;
  }, [filas, busqueda, soloConStock]);

  function exportarExcel() {
    const datos = filasFiltradas.map((f) => ({
      'Código'      : f.codigo_campaña,
      'Cliente'     : f.cliente,
      'Marca'       : f.marca,
      'Producto'    : f.nombre_producto,
      'Unidad'      : f.unidad,
      'Recibido'    : f.recibido,
      'Despachado'  : f.despachado,
      'Devuelto'    : f.devuelto,
      'Stock'       : f.stock,
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    // Anchos de columna
    ws['!cols'] = [
      { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 30 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
    ];

    XLSX.writeFile(wb, `Inventario_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-brand text-white px-6 py-5 animate-fade-slide-down">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Inventario</h1>
            <p className="text-white/70 text-xs mt-0.5">Stock en tiempo real por campaña y producto</p>
          </div>
          <a href="/" className="text-white/70 hover:text-white text-xs border border-white/20 hover:border-white/50 rounded-lg px-3 py-1.5 transition-colors">
            ← Inicio
          </a>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Barra superior: buscador + exportar */}
        <div className="flex gap-3 mb-5 animate-fade-slide-up">
          <input
            type="text"
            placeholder="Buscar por campaña, cliente, producto, unidad…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 h-10 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            onClick={() => setSoloConStock((prev) => !prev)}
            className={`h-10 px-4 rounded-xl border text-sm font-semibold transition-colors whitespace-nowrap ${
              soloConStock
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {soloConStock ? '✓ Con stock' : 'Con stock'}
          </button>
          <button
            onClick={exportarExcel}
            disabled={filasFiltradas.length === 0}
            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold transition-colors disabled:opacity-40"
          >
            📥 Exportar Excel
          </button>
        </div>

        {/* Contador */}
        {!cargando && !error && (
          <p className="text-xs text-gray-400 mb-3">
            {filasFiltradas.length} {filasFiltradas.length === 1 ? 'producto' : 'productos'}
            {busqueda && ` — filtrando por "${busqueda}"`}
          </p>
        )}

        {cargando && <p className="text-sm text-gray-400 text-center py-12 animate-pulse-soft">Cargando inventario…</p>}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">{error}</div>}

        {!cargando && !error && filasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm text-gray-400">{busqueda ? 'No se encontraron resultados.' : 'No hay productos registrados.'}</p>
          </div>
        )}

        {/* Tabla */}
        {!cargando && !error && filasFiltradas.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-slide-up delay-75">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 whitespace-nowrap">Código</th>
                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 whitespace-nowrap">Cliente</th>
                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 whitespace-nowrap">Producto</th>
                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 whitespace-nowrap">Unidad</th>
                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 whitespace-nowrap">Recibido</th>
                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 whitespace-nowrap">Despachado</th>
                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 whitespace-nowrap">Devuelto</th>
                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 whitespace-nowrap">Stock</th>
                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 pr-5 whitespace-nowrap">Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {filasFiltradas.map((f, i) => {
                    const mostrarCodigo = i === 0 || filasFiltradas[i - 1].codigo_campaña !== f.codigo_campaña;
                    return (
                      <tr
                        key={`${f.codigo_campaña}-${f.nombre_producto}-${i}`}
                        className={`border-t border-gray-50 hover:bg-gray-50/50 transition-colors ${mostrarCodigo && i !== 0 ? 'border-t-2 border-gray-100' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {mostrarCodigo ? (
                            <div>
                              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{f.codigo_campaña}</span>
                              <p className="text-xs text-gray-400 mt-0.5">{f.marca}</p>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {mostrarCodigo ? f.cliente : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{f.nombre_producto}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{f.unidad}</td>
                        <td className="px-4 py-3 text-center text-sm text-blue-700 font-medium">{f.recibido}</td>
                        <td className="px-4 py-3 text-center text-sm text-amber-600 font-medium">{f.despachado}</td>
                        <td className="px-4 py-3 text-center text-sm text-purple-600 font-medium">{f.devuelto}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${f.stock > 0 ? 'text-green-700 bg-green-50' : 'text-gray-400 bg-gray-50'}`}>
                            {f.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 pr-5 text-center">
                          {f.url_foto ? (
                            <button onClick={() => setFotoAmpliada(f.url_foto)}>
                              <img
                                src={f.url_foto}
                                alt={f.nombre_producto}
                                className="w-10 h-10 object-cover rounded-lg hover:scale-110 transition-transform border border-gray-100 mx-auto"
                              />
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
          </div>
        )}
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
