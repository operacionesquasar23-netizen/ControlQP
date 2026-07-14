// app/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { validarEjecutivo, validarAlmacen } from '@/lib/api';

type TipoAcceso = 'ejecutivo' | 'almacen';
interface ConfigModal {
  destino: string;
  tipo: TipoAcceso;
  titulo: string;
  placeholder: string;
  paramKey: string;
}

export default function HomePage() {
  const router = useRouter();
  const [modal, setModal] = useState<ConfigModal | null>(null);
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarIngresar(e: React.FormEvent) {
    e.preventDefault();
    if (!modal || !codigo.trim()) return;
    setVerificando(true);
    setError(null);
    try {
      const resultado = modal.tipo === 'almacen'
        ? await validarAlmacen(codigo.trim())
        : await validarEjecutivo(codigo.trim());
      if (!resultado.valido || !resultado.codigo) {
        setError('Código de acceso no válido.');
        return;
      }
      setModal(null);
      setCodigo('');
      router.push(modal.destino + '?' + modal.paramKey + '=' + encodeURIComponent(resultado.codigo));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar el código.');
    } finally {
      setVerificando(false);
    }
  }

  function abrirModal(config: ConfigModal) {
    setCodigo('');
    setError(null);
    setModal(config);
  }

  const modalEj = (destino: string) => ({
    destino, tipo: 'ejecutivo' as TipoAcceso,
    titulo: 'Acceso ejecutivo', placeholder: 'Ej: EJ001', paramKey: 'codigo_ejecutivo'
  });
  const modalAlm = (destino: string) => ({
    destino, tipo: 'almacen' as TipoAcceso,
    titulo: 'Acceso almacén', placeholder: 'Ej: ALM001', paramKey: 'codigo_almacen'
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Image src="/logo.png" alt="Quasar" width={56} height={56} className="rounded-full" />
          <div>
            <h1 className="text-xl font-bold">Quasar</h1>
            <p className="text-blue-200 text-sm">Control de Inventario QP</p>
          </div>
        </div>
      </div>

      <div className="bg-brand text-white px-6 pb-16 pt-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-2">ControlQP</h1>
          <h2 className="text-3xl font-bold mb-3">Despacho y retorno de elementos<br />de merchandising e impulso</h2>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-8 pb-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          <button onClick={() => abrirModal(modalEj('/campanas'))}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 transition-colors">📋</div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Campañas</h3>
            <p className="text-sm text-gray-500 mb-4">Crea, busca y edita campañas, lugares y productos.</p>
            <span className="text-xs font-semibold text-blue-700 group-hover:text-blue-800">Ver campañas →</span>
          </button>

          <button onClick={() => abrirModal(modalEj('/fichas-ingreso/nueva'))}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-green-100 transition-colors">📥</div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Ficha de Ingreso</h3>
            <p className="text-sm text-gray-500 mb-4">Avisa qué productos van a llegar a almacén.</p>
            <span className="text-xs font-semibold text-green-700 group-hover:text-green-800">Ir al formulario →</span>
          </button>

          <button onClick={() => abrirModal(modalEj('/solped/nueva'))}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-amber-100 transition-colors">🧾</div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">SOLPED</h3>
            <p className="text-sm text-gray-500 mb-4">Solicitudes de despacho con control de versiones.</p>
            <span className="text-xs font-semibold text-amber-700 group-hover:text-amber-800">Ir al formulario →</span>
          </button>

          <button onClick={() => abrirModal(modalAlm('/recepcion'))}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-purple-100 transition-colors">📦</div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Recepción</h3>
            <p className="text-sm text-gray-500 mb-4">Confirma ingresos a almacén con foto y guía.</p>
            <span className="text-xs font-semibold text-purple-700 group-hover:text-purple-800">Ir a recepciones →</span>
          </button>

          <button onClick={() => abrirModal(modalAlm('/despacho'))}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-orange-100 transition-colors">🚚</div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Despacho</h3>
            <p className="text-sm text-gray-500 mb-4">Confirma el despacho de una SOLPED vigente con foto.</p>
            <span className="text-xs font-semibold text-orange-700 group-hover:text-orange-800">Ir a despachos →</span>
          </button>

        </div>

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-6">
          <div className="grid grid-cols-5 gap-6 text-center">
            <div>
              <p className="text-2xl mb-1">📋</p>
              <p className="text-sm font-medium text-gray-700">Campaña</p>
              <p className="text-xs text-gray-400 mt-0.5">El ejecutivo registra campaña, lugares y productos</p>
            </div>
            <div>
              <p className="text-2xl mb-1">📥</p>
              <p className="text-sm font-medium text-gray-700">Ingreso</p>
              <p className="text-xs text-gray-400 mt-0.5">Ejecutivo avisa qué va a llegar, almacén confirma</p>
            </div>
            <div>
              <p className="text-2xl mb-1">🧾</p>
              <p className="text-sm font-medium text-gray-700">SOLPED</p>
              <p className="text-xs text-gray-400 mt-0.5">Ejecutivo solicita despacho con control de versiones</p>
            </div>
            <div>
              <p className="text-2xl mb-1">🚚</p>
              <p className="text-sm font-medium text-gray-700">Despacho</p>
              <p className="text-xs text-gray-400 mt-0.5">Almacén confirma despacho contra SOLPED vigente</p>
            </div>
            <div>
              <p className="text-2xl mb-1">✅</p>
              <p className="text-sm font-medium text-gray-700">Devolución</p>
              <p className="text-xs text-gray-400 mt-0.5">Cierre de campaña con control de retorno</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto bg-white border-t border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-400">© 2026 Quasar · ControlQP</p>
          <div className="flex items-center gap-4">
            <button onClick={() => abrirModal(modalEj('/campanas'))} className="text-xs text-gray-400 hover:text-blue-700">Campañas</button>
            <button onClick={() => abrirModal(modalAlm('/recepcion'))} className="text-xs text-gray-400 hover:text-blue-700">Recepción</button>
            <button onClick={() => abrirModal(modalAlm('/despacho'))} className="text-xs text-gray-400 hover:text-blue-700">Despacho</button>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-4">
              {modal.tipo === 'almacen' ? '📦' : '📋'}
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{modal.titulo}</h2>
            <p className="text-sm text-gray-500 mb-5">Ingresa tu código de acceso para continuar.</p>
            <form onSubmit={manejarIngresar}>
              <label className="text-xs text-gray-400 block mb-1">Código de acceso</label>
              <div className="flex gap-2 mb-1">
                <input
                  type="text"
                  placeholder={modal.placeholder}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  autoFocus
                  className="flex-1 h-10 rounded-lg border border-gray-200 px-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" disabled={verificando}
                  className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-4 rounded-lg text-sm font-semibold transition-colors">
                  {verificando ? '…' : 'Ingresar'}
                </button>
              </div>
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </form>
            <button onClick={() => setModal(null)} className="mt-4 text-xs text-gray-400 hover:text-gray-600 w-full text-center">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
