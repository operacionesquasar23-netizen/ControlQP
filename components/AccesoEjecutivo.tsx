// components/AccesoEjecutivo.tsx
//
// Puerta de entrada para las pantallas de campañas. Pide el código
// de acceso del ejecutivo (igual patrón que el módulo de Nueva
// Solicitud en gestion-pdl) y solo si es válido muestra el contenido.
// No persiste el código entre pantallas — cada vez que se entra a
// una ruta protegida, se vuelve a pedir.

'use client';

import { useState } from 'react';
import { validarEjecutivo } from '@/lib/api';

interface AccesoEjecutivoProps {
  titulo: string;
  descripcion: string;
  children: (datos: { codigoEjecutivo: string; nombreEjecutivo: string }) => React.ReactNode;
}

export default function AccesoEjecutivo({ titulo, descripcion, children }: AccesoEjecutivoProps) {
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
      const resultado = await validarEjecutivo(codigo.trim());
      if (!resultado.valido || !resultado.nombre || !resultado.codigo) {
        setError('Código de acceso no válido.');
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
    return <>{children({ codigoEjecutivo: sesion.codigo, nombreEjecutivo: sesion.nombre })}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-4">
          📋
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">{titulo}</h1>
        <p className="text-sm text-gray-500 mb-5">{descripcion}</p>

        <form onSubmit={manejarIngresar}>
          <label className="text-xs text-gray-400 block mb-1">Ingresa tu código de acceso</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: EJ001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              autoFocus
              className="flex-1 h-10 rounded-lg border border-gray-200 px-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={verificando}
              className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-4 rounded-lg text-sm font-semibold transition-colors"
            >
              {verificando ? '…' : 'Ingresar'}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </form>
      </div>
    </div>
  );
}
