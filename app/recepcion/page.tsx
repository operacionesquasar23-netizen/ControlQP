// app/recepcion/page.tsx
//
// Módulo de recepción para almacén. Lista todas las fichas de ingreso
// pendientes de confirmar, con filtro por código, cliente o campaña.
// Protegido por código de acceso con rol 'almacen'.

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { validarAlmacen, listarFichasPendientes, type FichaPendiente } from '@/lib/api';
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

  if (verificandoQuery) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Verificando acceso…</p>
      </div>
    );
  }

  if (sesion) {
    return <ListaFichasPendientes codigoAlmacen={sesion.codigo} nombreAlmacen={sesion.nombre} />;
  }

  return (
    <AccesoAlmacen titulo="Recepción" descripcion="Ingresa tu código de acceso de almacén.">
      {({ codigoAlmacen, nombreAlmacen }) => (
        <ListaFichasPendientes codigoAlmacen={codigoAlmacen} nombreAlmacen={nombreAlmacen} />
      )}
    </AccesoAlmacen>
  );
}

function ListaFichasPendientes({
  codigoAlmacen,
  nombreAlmacen,
}: {
  codigoAlmacen: string;
  nombreAlmacen: string;
}) {
  const [fichas, setFichas] = useState<FichaPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    listarFichasPendientes()
      .then(setFichas)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando fichas.'))
      .finally(() => setCargando(false));
  }, []);

  const fichasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return fichas;
    return fichas.filter((f) =>
      f.cabecera.codigo_campaña.toLowerCase().includes(texto) ||
      f.cabecera.cliente.toLowerCase().includes(texto) ||
      f.cabecera.id_ficha.toLowerCase().includes(texto)
    );
  }, [fichas, busqueda]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-white/80 hover:text-white text-sm">← Inicio</Link>
          <span className="text-white/80 text-sm">{nombreAlmacen}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Fichas pendientes</h1>
        <p className="text-sm text-gray-500 mb-6">
          Confirma las recepciones de elementos que llegaron a almacén.
        </p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <input
            type="text"
            placeholder="Buscar por código de ficha, campaña o cliente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-red-800 text-sm">{error}</div>
        )}

        {cargando && <p className="text-sm text-gray-400">Cargando fichas…</p>}

        {!cargando && fichasFiltradas.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm text-gray-500">
              {fichas.length === 0 ? 'No hay fichas pendientes de recepción.' : 'No se encontraron fichas con esa búsqueda.'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {fichasFiltradas.map((f) => (
            <Link
              key={f.cabecera.id_ficha}
              href={`/recepcion/${f.cabecera.id_ficha}?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {f.cabecera.id_ficha} — {f.cabecera.codigo_campaña}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {f.cabecera.cliente} · {f.cabecera.marca} · {f.detalle.length} producto(s)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                    Pendiente
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    Avisado por {f.cabecera.ejecutivo}
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
