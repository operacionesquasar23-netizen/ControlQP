// components/AccesoAlmacen.tsx
//
// Puerta de entrada para el módulo de recepción de almacén.
// Igual que AccesoEjecutivo pero valida rol = 'almacen'.

'use client';

import { useState } from 'react';
import { validarAlmacen } from '@/lib/api';

interface AccesoAlmacenProps {
  titulo: string;
  descripcion: string;
  children: (datos: { codigoAlmacen: string; nombreAlmacen: string }) => React.ReactNode;
}

export default function AccesoAlmacen({ titulo, descripcion, children }: AccesoAlmacenProps) {
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sesion, setSesion] = useState<{ codigo: string; nombre: string } | null>(null);

  async function manejarIngresar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return;

    setVerificando(true);
    setError(null);
    try {
      const resultado = await validarAlmacen(codigo.trim());
      if (!resultado.valido || !resultado.nombre || !resultado.codigo) {
        setError('Código de acceso no válido o sin permiso de almacén.');
        return;
      }
      setSesion({ codigo: resultado.codigo, nombre: resultado.nombre });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar el código.');
    } finally {
      setVerificando(false);
    }
  }

  if (sesion) {
    return <>{children({ codigoAlmacen: sesion.codigo, nombreAlmacen: sesion.nombre })}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full">
        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl mb-4">
          📦
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">{titulo}</h1>
        <p className="text-sm text-gray-500 mb-5">{descripcion}</p>

        <form onSubmit={manejarIngresar}>
          <label className="text-xs text-gray-400 block mb-1">Ingresa tu código de acceso</label>
          <div className="flex gap-2 mb-1">
            <input
              type="text"
              placeholder="Ej: ALM001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              autoFocus
              className="flex-1 h-10 rounded-lg border border-gray-200 px-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              disabled={verificando}
              className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-4 rounded-lg text-sm font-semibold transition-colors"
            >
              {verificando ? '…' : 'Ingresar'}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </form>
      </div>
    </div>
  );
}
