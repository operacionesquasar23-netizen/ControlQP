// app/seguimiento/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerSesion } from '@/lib/sesion';
import { listarCampañas, formatearFecha, type CampañaResumen } from '@/lib/api';

export default function SeguimientoPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [listo, setListo] = useState(false);
  const [campañas, setCampañas] = useState<CampañaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'comercial') { router.replace('/'); return; }
    setCodigo(sesion.codigo);
    setListo(true);
    listarCampañas(sesion.codigo)
      .then(setCampañas)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando campañas.'))
      .finally(() => setCargando(false));
  }, [router]);

  function irA(href: string) {
    setSaliendo(true);
    setTimeout(() => router.push(href), 250);
  }

  // Agrupar por mes
  function agruparPorMes(campañas: CampañaResumen[]) {
    const grupos: Record<string, CampañaResumen[]> = {};
    campañas.forEach((c) => {
      if (!c.fecha_inicio) return;
      const fecha = new Date(c.fecha_inicio + 'T00:00:00');
      const clave = fecha.toLocaleString('es-PE', { month: 'long', year: 'numeric' });
      const claveCapitalizada = clave.charAt(0).toUpperCase() + clave.slice(1);
      if (!grupos[claveCapitalizada]) grupos[claveCapitalizada] = [];
      grupos[claveCapitalizada].push(c);
    });
    return grupos;
  }

  if (!listo) return null;

  const grupos = agruparPorMes(campañas);

  return (
    <div className={`min-h-screen bg-slate-50 transition-opacity duration-250 ${saliendo ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-brand text-white px-6 py-5 animate-fade-slide-down">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Seguimiento</h1>
            <p className="text-white/70 text-xs mt-0.5">Expediente de tus campañas</p>
          </div>
          <button
            onClick={() => irA('/comercial')}
            className="text-white/70 hover:text-white text-sm"
          >← Volver</button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {cargando && <p className="text-sm text-gray-400 text-center py-12 animate-pulse-soft">Cargando campañas…</p>}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">{error}</div>}

        {!cargando && !error && campañas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm text-gray-400">No tienes campañas registradas.</p>
          </div>
        )}

        <div className="space-y-8">
          {Object.entries(grupos).map(([mes, items], gi) => (
            <div key={mes} className={`animate-fade-slide-up delay-${Math.min(gi * 75, 300)}`}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">{mes}</h2>
              <div className="space-y-3">
                {items.map((c) => {
                  const hoy       = new Date();
                  const inicio    = new Date(c.fecha_inicio + 'T00:00:00');
                  const fin       = new Date(c.fecha_fin + 'T00:00:00');
                  const vigente   = hoy >= inicio && hoy <= fin;
                  const futura    = hoy < inicio;
                  const vencida   = hoy > fin;

                  return (
                    <button
                      key={c.codigo_campaña}
                      onClick={() => irA(`/seguimiento/${c.codigo_campaña}`)}
                      className="w-full bg-white rounded-2xl border-2 border-transparent hover:border-blue-200 shadow-sm hover:shadow-md p-5 text-left transition-all duration-200 hover:-translate-y-0.5 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                              {c.codigo_campaña}
                            </span>
                            {vigente && <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">● Vigente</span>}
                            {futura  && <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Próxima</span>}
                            {vencida && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Finalizada</span>}
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{c.cliente}</p>
                          <p className="text-xs text-gray-400">{c.marca}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">
                            {formatearFecha(c.fecha_inicio)} → {formatearFecha(c.fecha_fin)}
                          </p>
                          <p className="text-xs text-blue-600 mt-2 group-hover:text-blue-700">Ver expediente →</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
