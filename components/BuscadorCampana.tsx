// components/BuscadorCampana.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { type CampañaResumen } from '@/lib/api';

interface Props {
  campañas: CampañaResumen[];
  cargando: boolean;
  value: string;
  onChange: (codigo: string) => void;
  placeholder?: string;
}

export default function BuscadorCampaña({ campañas, cargando, value, onChange, placeholder }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) { setBusqueda(''); return; }
    const camp = campañas.find((c) => c.codigo_campaña === value);
    if (camp) setBusqueda(`${camp.codigo_campaña} — ${camp.cliente} (${camp.marca})`);
  }, [value, campañas]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtradas = campañas.filter((c) => {
    const q = busqueda.toLowerCase();
    return (
      c.codigo_campaña.toLowerCase().includes(q) ||
      c.cliente.toLowerCase().includes(q) ||
      c.marca.toLowerCase().includes(q)
    );
  });

  function seleccionar(c: CampañaResumen) {
    onChange(c.codigo_campaña);
    setBusqueda(`${c.codigo_campaña} — ${c.cliente} (${c.marca})`);
    setAbierto(false);
  }

  function limpiar() {
    onChange('');
    setBusqueda('');
    setAbierto(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={cargando ? 'Cargando campañas…' : busqueda}
          disabled={cargando}
          placeholder={placeholder || 'Buscar campaña por código, cliente o marca…'}
          onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); onChange(''); }}
          onFocus={() => setAbierto(true)}
          className="w-full h-9 rounded-lg border border-gray-200 px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
        {value && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
          >✕</button>
        )}
      </div>

      {abierto && !cargando && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtradas.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-3">No se encontraron campañas.</p>
          ) : (
            filtradas.map((c) => (
              <button
                key={c.codigo_campaña}
                type="button"
                onClick={() => seleccionar(c)}
                className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                  value === c.codigo_campaña ? 'bg-blue-50' : ''
                }`}
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
