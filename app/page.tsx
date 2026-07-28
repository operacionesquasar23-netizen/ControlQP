// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { validarEjecutivo, validarAlmacen } from '@/lib/api';
import { guardarSesion, obtenerSesion } from '@/lib/sesion';

type RolElegido = 'comercial' | 'almacen' | null;

export default function HomePage() {
  const router = useRouter();
  const [rolElegido, setRolElegido] = useState<RolElegido>(null);
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (sesion) {
      router.replace('/' + sesion.rol);
    }
  }, [router]);

  function elegirRol(rol: 'comercial' | 'almacen') {
    setCodigo('');
    setError(null);
    setRolElegido(rol);
  }

  async function manejarIngresar(e: React.FormEvent) {
    e.preventDefault();
    if (!rolElegido || !codigo.trim()) return;
    setVerificando(true);
    setError(null);
    try {
      const resultado = rolElegido === 'almacen'
        ? await validarAlmacen(codigo.trim())
        : await validarEjecutivo(codigo.trim());

      if (!resultado.valido || !resultado.codigo || !resultado.nombre) {
        setError('Código de acceso no válido.');
        return;
      }

      guardarSesion({
        rol: rolElegido,
        codigo: resultado.codigo,
        nombre: resultado.nombre,
      });

      setSaliendo(true);
      setTimeout(() => router.push('/' + rolElegido), 250);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar el código.');
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col transition-opacity duration-250 ${saliendo ? 'opacity-0' : 'opacity-100'}`}>

      {/* Header + Hero unificado */}
      <div className="relative overflow-hidden text-white" style={{ minHeight: '320px' }}>
        <img
          src="/fondo-hero.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-brand/60" />

        {/* Header */}
        <div className="relative z-10 px-6 py-5">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <Image src="/logo.png" alt="Quasar" width={52} height={52} className="rounded-full" />
            <div>
              <h1 className="text-xl font-bold">Quasar</h1>
              <p className="text-blue-200 text-sm">People</p>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 px-6 pb-24 pt-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-3">Control de Inventario QP</h1>
            <p className="text-blue-200 text-lg">Despacho y retorno de elementos</p>
          </div>
        </div>
      </div>

      {/* Tarjetas de acceso */}
      <div className="max-w-4xl mx-auto px-4 -mt-12 pb-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Comercial */}
          <button
            onClick={() => elegirRol('comercial')}
            className="animate-fade-slide-up delay-75 bg-white rounded-2xl border-2 border-transparent hover:border-blue-300 shadow-sm hover:shadow-lg p-8 text-left transition-all duration-200 hover:-translate-y-1 group"
          >
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:bg-blue-100 transition-colors">📋</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Comercial</h2>
            <p className="text-sm text-gray-500 mb-5">Gestiona campañas, fichas de ingreso y solicitudes de despacho.</p>
            <span className="text-sm font-semibold text-blue-700 group-hover:text-blue-800">Ingresar como comercial →</span>
          </button>

          {/* Almacén */}
          <button
            onClick={() => elegirRol('almacen')}
            className="animate-fade-slide-up delay-150 bg-white rounded-2xl border-2 border-transparent hover:border-orange-300 shadow-sm hover:shadow-lg p-8 text-left transition-all duration-200 hover:-translate-y-1 group"
          >
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:bg-orange-100 transition-colors">📦</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Almacén</h2>
            <p className="text-sm text-gray-500 mb-5">Confirma recepciones y despachos de elementos con foto.</p>
            <span className="text-sm font-semibold text-orange-700 group-hover:text-orange-800">Ingresar como almacén →</span>
          </button>

          {/* Inventario — acceso libre */}
          <a
            href="/inventario"
            className="animate-fade-slide-up delay-225 bg-white rounded-2xl border-2 border-transparent hover:border-green-300 shadow-sm hover:shadow-lg p-8 text-left transition-all duration-200 hover:-translate-y-1 group block"
          >
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:bg-green-100 transition-colors">📊</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Inventario</h2>
            <p className="text-sm text-gray-500 mb-5">Stock en tiempo real por campaña y producto.</p>
            <span className="text-sm font-semibold text-green-700 group-hover:text-green-800">Ver inventario →</span>
          </a>

        </div>

        {/* Flujo */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 animate-fade-slide-up delay-300">
          <div className="grid grid-cols-5 gap-3 text-center">
            {[
              { icon: '📋', label: 'Campaña'    },
              { icon: '📥', label: 'Ingreso'    },
              { icon: '🧾', label: 'SOLPED'     },
              { icon: '🚚', label: 'Despacho'   },
              { icon: '↩️', label: 'Devolución' },
            ].map((paso, i) => (
              <div key={i}>
                <p className="text-xl mb-1">{paso.icon}</p>
                <p className="text-xs font-medium text-gray-600">{paso.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto bg-white border-t border-gray-100 px-6 py-4 animate-fade-in delay-300">
        <p className="text-xs text-gray-400 text-center">© 2026 Quasar · ControlQP</p>
      </div>

      {/* Modal código */}
      {rolElegido && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-scale-in">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${rolElegido === 'comercial' ? 'bg-blue-50' : 'bg-orange-50'}`}>
              {rolElegido === 'comercial' ? '📋' : '📦'}
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Acceso {rolElegido === 'comercial' ? 'Comercial' : 'Almacén'}
            </h2>
            <p className="text-sm text-gray-500 mb-5">Ingresa tu código de acceso para continuar.</p>
            <form onSubmit={manejarIngresar}>
              <label className="text-xs text-gray-400 block mb-1">Código de acceso</label>
              <div className="flex gap-2 mb-1">
                <input
                  type="text"
                  placeholder={rolElegido === 'comercial' ? 'Ej: EJ001' : 'Ej: ALM001'}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  autoFocus
                  className="flex-1 h-10 rounded-lg border border-gray-200 px-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={verificando || !codigo.trim()}
                  className={`px-4 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 ${rolElegido === 'comercial' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-orange-600 hover:bg-orange-700'}`}
                >
                  {verificando ? <span className="animate-pulse-soft">…</span> : 'Ingresar'}
                </button>
              </div>
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </form>
            <button
              onClick={() => setRolElegido(null)}
              className="mt-4 text-xs text-gray-400 hover:text-gray-600 w-full text-center transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
