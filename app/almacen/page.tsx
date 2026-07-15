// app/almacen/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { obtenerSesion, cerrarSesion } from '@/lib/sesion';

const MODULOS = [
  {
    href: '/recepcion',
    icon: '📦',
    color: 'purple',
    titulo: 'Recepción',
    desc: 'Confirma ingresos a almacén con foto y guía de remisión.',
    link: 'Ir a recepciones →',
  },
  {
    href: '/despacho',
    icon: '🚚',
    color: 'orange',
    titulo: 'Despacho',
    desc: 'Confirma el despacho de una SOLPED vigente con foto.',
    link: 'Ir a despachos →',
  },
  {
  href : '/devolucion',
  icon : '↩️',
  color: 'green',
  titulo: 'Devoluciones',
  desc  : 'Confirma el retorno de elementos con foto.',
  link  : 'Ver devoluciones →',
  },
];

const COLORES: Record<string, string> = {
  purple: 'bg-purple-50 group-hover:bg-purple-100 text-purple-700',
  orange: 'bg-orange-50 group-hover:bg-orange-100 text-orange-700',
  green: 'bg-green-50 group-hover:bg-green-100 text-orange-700',
};

export default function AlmacenPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [listo, setListo] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'almacen') {
      router.replace('/');
      return;
    }
    setNombre(sesion.nombre);
    setCodigo(sesion.codigo);
    setListo(true);
  }, [router]);

  function handleModulo(href: string) {
    setSaliendo(true);
    setTimeout(() => router.push(href + '?codigo_almacen=' + encodeURIComponent(codigo)), 250);
  }

  function handleCerrar() {
    cerrarSesion();
    setSaliendo(true);
    setTimeout(() => router.replace('/'), 250);
  }

  if (!listo) return null;

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col transition-opacity duration-250 ${saliendo ? 'opacity-0' : 'opacity-100'}`}>

      {/* Header */}
      <div className="bg-brand text-white px-6 py-5 animate-fade-slide-down">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Quasar" width={40} height={40} className="rounded-full" />
            <div>
              <h1 className="text-lg font-bold">ControlQP · Almacén</h1>
              <p className="text-blue-200 text-xs">{nombre}</p>
            </div>
          </div>
          <button
            onClick={handleCerrar}
            className="text-white/70 hover:text-white text-xs border border-white/20 hover:border-white/50 rounded-lg px-3 py-1.5 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-10 w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-1 animate-fade-slide-up">Bienvenido, {nombre}</h2>
        <p className="text-sm text-gray-500 mb-8 animate-fade-slide-up delay-75">¿Qué quieres hacer hoy?</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MODULOS.map((m, i) => (
            <button
              key={m.href}
              onClick={() => handleModulo(m.href)}
              className={`animate-fade-slide-up bg-white rounded-2xl border-2 border-transparent hover:border-orange-200 shadow-sm hover:shadow-lg p-8 text-left transition-all duration-200 hover:-translate-y-1 group delay-${(i + 1) * 75}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5 transition-colors ${COLORES[m.color].split(' ').slice(0, 2).join(' ')}`}>
                {m.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{m.titulo}</h3>
              <p className="text-sm text-gray-500 mb-5">{m.desc}</p>
              <span className={`text-xs font-semibold ${COLORES[m.color].split(' ')[2]}`}>{m.link}</span>
            </button>
          ))}
        </div>
      </main>

      <div className="mt-auto bg-white border-t border-gray-100 px-6 py-4">
        <p className="text-xs text-gray-400 text-center">© 2026 Quasar · ControlQP</p>
      </div>
    </div>
  );
}
