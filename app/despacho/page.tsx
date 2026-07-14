// app/despacho/page.tsx

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { validarAlmacen, listarSolpedsVigentes, formatearFecha, type SolpedVigente } from '@/lib/api';
import AccesoAlmacen from '@/components/AccesoAlmacen';

export default function DespachoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando…</p>
      </div>
    }>
      <DespachoContenido />
    </Suspense>
  );
}

function DespachoContenido() {
  const searchParams = useSearchParams();
  const codigoDesdeQuery = searchParams.get('codigo_almacen');

  const [verificandoQuery, setVerificandoQuery] = useState(!!codigoDesdeQuery);
  const [sesion, setSesion] = useState<{ codigo: string; nombre: string } | null>(null);

  useEffect(() => {
    if (!codigoDesdeQuery) return;
    validarAlmacen(codigoDesdeQuery)
      .then((r) => {
        if (r.valido && r.nombre && r.codigo) setSesion({ codigo: r.codigo, nombre: r.nombre });
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
    return <ListaSolpedsVigentes codigoAlmacen={sesion.codigo} nombreAlmacen={sesion.nombre} />;
  }

  return (
    <AccesoAlmacen titulo="Despacho" descripcion="Ingresa tu código de acceso de almacén.">
      {({ codigoAlmacen, nombreAlmacen }) => (
        <ListaSolpedsVigentes codigoAlmacen={codigoAlmacen} nombreAlmacen={nombreAlmacen} />
      )}
    </AccesoAlmacen>
  );
}

function ListaSolpedsVigentes({
  codigoAlmacen,
  nombreAlmacen,
}: {
  codigoAlmacen: string;
  nombreAlmacen: string;
}) {
  const [solpeds, setSolpeds] = useState<SolpedVigente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    listarSolpedsVigentes()
      .then(setSolpeds)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando SOLPEDs.'))
      .finally(() => setCargando(false));
  }, []);

  const solpedsFiltradas = solpeds.filter((s) => {
    const q = busqueda.toLowerCase();
    return (
      s.cabecera.id_solped.toLowerCase().includes(q) ||
      s.cabecera.codigo_campaña.toLowerCase().includes(q) ||
      s.cabecera.cliente.toLowerCase().includes(q) ||
      s.cabecera.marca.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Despacho</h1>
            <p className="text-white/70 text-xs mt-0.5">SOLPEDs pendientes de despacho</p>
          </div>
          <span className="text-white/80 text-sm">{nombreAlmacen}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar por SOLPED, campaña, cliente…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full h-10 rounded-xl border border-gray-200 px-4 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />

        {cargando && (
          <p className="text-sm text-gray-400 text-center py-12">Cargando SOLPEDs…</p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {!cargando && !error && solpedsFiltradas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm text-gray-400">
              {busqueda ? 'No se encontraron resultados.' : 'No hay SOLPEDs pendientes de despacho.'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {solpedsFiltradas.map((s) => (
            <Link
              key={s.cabecera.id_solped}
              href={`/despacho/${s.cabecera.id_solped}?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {s.cabecera.id_solped}
                    </span>
                    <span className="text-xs text-gray-400">v{s.cabecera.version}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{s.cabecera.cliente}</p>
                  <p className="text-xs text-gray-500">{s.cabecera.marca} · {s.cabecera.codigo_campaña}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Despacho</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatearFecha(s.cabecera.fecha_despacho)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {s.detalle.length} {s.detalle.length === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
