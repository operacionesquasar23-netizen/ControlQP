// components/BuscadorCampaña.tsx
//
// Reemplaza el <select> de campañas en ficha de ingreso, SOLPED y
// devolución. El ejecutivo escribe código o cliente y la lista se
// filtra en tiempo real. Click en una opción → queda seleccionada.
//
// Uso:
//   <BuscadorCampaña
//     campañas={campañas}          // CampañaResumen[]
//     valor={codigoSeleccionado}   // string
//     onChange={setCodigoSeleccionado}  // (codigo: string) => void
//     disabled={cargando}
//   />

'use client';

import { useEffect, useRef, useState } from 'react';
import type { CampañaResumen } from '@/lib/api';

interface BuscadorCampañaProps {
  campañas: CampañaResumen[];
  valor: string;
  onChange: (codigo: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function BuscadorCampaña({
  campañas,
  valor,
  onChange,
  disabled = false,
  placeholder = 'Buscar campaña por código o cliente…',
}: BuscadorCampañaProps) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Cuando cambia el valor externo, actualiza el texto mostrado
  useEffect(() => {
    if (valor) {
      const campaña = campañas.find((c) => c.codigo_campaña === valor);
      if (campaña) {
        setTexto(`${campaña.codigo_campaña} — ${campaña.cliente}`);
      }
    } else {
      setTexto('');
    }
  }, [valor, campañas]);

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    function manejarClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        // Si no hay selección válida, limpia el texto
        if (!valor) setTexto('');
      }
    }
    document.addEventListener('mousedown', manejarClickFuera);
    return () => document.removeEventListener('mousedown', manejarClickFuera);
  }, [valor]);

  const campañasFiltradas = campañas.filter((c) => {
    if (!texto.trim()) return true;
    const q = texto.trim().toLowerCase();
    return (
      c.codigo_campaña.toLowerCase().includes(q) ||
      c.cliente.toLowerCase().includes(q) ||
      c.marca.toLowerCase().includes(q)
    );
  });

  function seleccionar(campaña: CampañaResumen) {
    onChange(campaña.codigo_campaña);
    setTexto(`${campaña.codigo_campaña} — ${campaña.cliente}`);
    setAbierto(false);
  }

  function manejarFoco() {
    // Al enfocar, limpia el texto para facilitar nueva búsqueda
    // pero mantiene el valor seleccionado hasta que elija otra
    setTexto('');
    setAbierto(true);
  }

  function manejarCambio(e: React.ChangeEvent<HTMLInputElement>) {
    setTexto(e.target.value);
    setAbierto(true);
    // Si borra todo, limpia la selección
    if (!e.target.value.trim()) onChange('');
  }

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        value={texto}
        onChange={manejarCambio}
        onFocus={manejarFoco}
        disabled={disabled}
        placeholder={disabled ? 'Cargando campañas…' : placeholder}
        className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      />

      {/* Indicador de selección activa */}
      {valor && (
        <button
          type="button"
          onClick={() => { onChange(''); setTexto(''); setAbierto(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
          aria-label="Limpiar selección"
        >
          ✕
        </button>
      )}

      {/* Dropdown */}
      {abierto && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
          {campañasFiltradas.length === 0 ? (
            <p className="text-sm text-gray-400 px-3 py-3 text-center">
              No se encontraron campañas
            </p>
          ) : (
            campañasFiltradas.map((c) => (
              <button
                key={c.codigo_campaña}
                type="button"
                onClick={() => seleccionar(c)}
                className={
                  'w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ' +
                  (c.codigo_campaña === valor ? 'bg-blue-50' : '')
                }
              >
                <p className="text-sm font-medium text-gray-900">{c.codigo_campaña}</p>
                <p className="text-xs text-gray-400">{c.cliente} · {c.marca}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
