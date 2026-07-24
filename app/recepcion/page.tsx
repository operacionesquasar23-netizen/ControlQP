// app/recepcion/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { validarAlmacen, listarFichasPendientes, formatearFecha, type FichaPendiente } from '@/lib/api';
import AccesoAlmacen from '@/components/AccesoAlmacen';

export default function RecepcionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando…</p>
      </div>
    }>
      <RecepcionContenido />
    </Suspense>
  );
}

function RecepcionContenido() {
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

  if (verificandoQuery) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-gray-400">Verificando acceso…</p>
    </div>
  );

  if (sesion) return <ListaFichas codigoAlmacen={sesion.codigo} nombreAlmacen={sesion.nombre} />;

  return (
    <AccesoAlmacen titulo="Recepción" descripcion="Ingresa tu código de acceso de almacén.">
      {({ codigoAlmacen, nombreAlmacen }) => (
        <ListaFichas codigoAlmacen={codigoAlmacen} nombreAlmacen={nombreAlmacen} />
      )}
    </AccesoAlmacen>
  );
}

function ListaFichas({ codigoAlmacen, nombreAlmacen }: { codigoAlmacen: string; nombreAlmacen: string }) {
  const router = useRouter();
  const [fichas, setFichas] = useState<FichaPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    listarFichasPendientes()
      .then(setFichas)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando fichas.'))
      .finally(() => setCargando(false));
  }, []);

  function irA(idFicha: string) {
    setSaliendo(true);
    setTimeout(() => router.push(`/recepcion/${idFicha}?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`), 250);
  }

  const fichasFiltradas = fichas.filter((f) => {
    const q = busqueda.toLowerCase();
    return (
      f.cabecera.id_ficha.toLowerCase().includes(q) ||
      f.cabecera.codigo_campaña.toLowerCase().includes(q) ||
      f.cabecera.cliente.toLowerCase().includes(q) ||
      f.cabecera.marca.toLowerCase().includes(q)
    );
  });

  return (
    <div className={`min-h-screen bg-slate-50 transition-opacity duration-250 ${saliendo ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-brand text-white px-6 py-5 animate-fade-slide-down">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Recepción</h1>
            <p className="text-white/70 text-xs mt-0.5">Fichas pendientes de confirmar</p>
          </div>
          <span className="text-white/80 text-sm">{nombreAlmacen}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <input
          type="text"
          placeholder="Buscar por ficha, campaña, cliente…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full h-10 rounded-xl border border-gray-200 px-4 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white animate-fade-slide-up"
        />

        {cargando && <p className="text-sm text-gray-400 text-center py-12 animate-pulse-soft">Cargando fichas…</p>}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">{error}</div>}

        {!cargando && !error && fichasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm text-gray-400">
              {busqueda ? 'No se encontraron resultados.' : 'No hay fichas pendientes.'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {fichasFiltradas.map((f, i) => (
            <button
              key={f.cabecera.id_ficha}
              onClick={() => irA(f.cabecera.id_ficha)}
              className={`animate-fade-slide-up delay-${Math.min(i * 75, 300)} w-full bg-white rounded-2xl border-2 border-transparent hover:border-purple-200 shadow-sm hover:shadow-md p-5 text-left transition-all duration-200 hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {f.cabecera.id_ficha}
                    </span>
                    <span className="text-xs text-gray-400">{f.cabecera.codigo_campaña}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{f.cabecera.cliente}</p>
                  <p className="text-xs text-gray-500">{f.cabecera.marca} · {f.cabecera.ejecutivo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Enviado</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatearFecha(String(f.cabecera.fecha_envio))}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{f.detalle.length} productos</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
