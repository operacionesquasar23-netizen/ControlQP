// app/campanas/page.tsx
//
// Listado de campañas. Punto de entrada para que el ejecutivo
// encuentre cualquier campaña (sin tener que recordar el código
// exacto) y entre a verla/editarla en /campanas/[codigo].

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listarCampañas, formatearFecha, type CampañaResumen } from '@/lib/api';

type FiltroEstado = 'todas' | 'activa' | 'finalizada' | 'cerrada';

export default function ListadoCampañasPage() {
  const [campañas, setCampañas] = useState<CampañaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    listarCampañas()
      .then(setCampañas)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las campañas.'))
      .finally(() => setCargando(false));
  }, []);

  const estadosDisponibles = useMemo(() => {
    const set = new Set(campañas.map((c) => c.estado));
    return Array.from(set);
  }, [campañas]);

  const campañasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return campañas.filter((c) => {
      const pasaEstado = filtroEstado === 'todas' || c.estado === filtroEstado;
      const pasaBusqueda =
        texto === '' ||
        c.codigo_campaña.toLowerCase().includes(texto) ||
        c.cliente.toLowerCase().includes(texto);
      return pasaEstado && pasaBusqueda;
    });
  }, [campañas, filtroEstado, busqueda]);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-white/80 hover:text-white text-sm">← Inicio</Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Campañas</h1>
            <p className="text-sm text-gray-500">Busca una campaña para ver o editar su detalle.</p>
          </div>
          <Link
            href="/campanas/nueva"
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
          >
            + Nueva campaña
          </Link>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar por código o cliente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todos los estados</option>
            {estadosDisponibles.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-red-800 text-sm">
            {error}
          </div>
        )}

        {cargando && <p className="text-sm text-gray-400">Cargando campañas…</p>}

        {!cargando && campañasFiltradas.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-sm text-gray-400">No se encontraron campañas con esos filtros.</p>
          </div>
        )}

        <div className="space-y-2">
          {campañasFiltradas.map((c) => (
            <Link
              key={c.codigo_campaña}
              href={`/campanas/${c.codigo_campaña}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {c.codigo_campaña} — {c.cliente}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.marca} · {c.ejecutivo} · {formatearFecha(c.fecha_inicio)} a {formatearFecha(c.fecha_fin)}
                  </p>
                </div>
                <span
                  className={
                    'text-xs font-semibold px-2.5 py-1 rounded-full ' +
                    (c.estado === 'activa'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500')
                  }
                >
                  {c.estado}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
