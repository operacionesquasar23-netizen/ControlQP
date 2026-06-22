// app/page.tsx
//
// Index principal de ControlQP, con el mismo lenguaje visual que
// gestion-pdl (header azul de marca, hero, tarjetas blancas con
// ícono + hover). Por ahora solo "Registrar nueva campaña" está
// activa; el resto de tarjetas se van habilitando a medida que se
// construyan los siguientes pasos del flujo (ficha de ingreso,
// SOLPED, despachos, devoluciones, alertas...).

import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Image src="/logo.png" alt="Quasar" width={56} height={56} className="rounded-full" />
          <div>
            <h1 className="text-xl font-bold">Quasar</h1>
            <p className="text-blue-200 text-sm">Control de Inventario QP</p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-brand text-white px-6 pb-16 pt-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-2">ControlQP</h1>
          <h2 className="text-3xl font-bold mb-3">
            Despacho y retorno de elementos<br />de merchandising e impulso
          </h2>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 pb-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Nueva Campaña — activa */}
          <a href="/campanas/nueva"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 transition-colors">
              📋
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Nueva Campaña</h3>
            <p className="text-sm text-gray-500 mb-4">Registra una campaña con sus lugares y productos.</p>
            <span className="text-xs font-semibold text-blue-700 group-hover:text-blue-800">
              Ir al formulario →
            </span>
          </a>

          {/* Ficha de Ingreso — activa */}
          <a href="/fichas-ingreso/nueva"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-green-100 transition-colors">
              📥
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Ficha de Ingreso</h3>
            <p className="text-sm text-gray-500 mb-4">Avisa qué productos van a llegar a almacén.</p>
            <span className="text-xs font-semibold text-green-700 group-hover:text-green-800">
              Ir al formulario →
            </span>
          </a>

          {/* SOLPED — pendiente de construir */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl mb-4">
              🧾
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">SOLPED</h3>
            <p className="text-sm text-gray-500 mb-4">Solicitudes de despacho con control de versiones.</p>
            <span className="text-xs font-semibold text-gray-400">
              Próximamente
            </span>
          </div>

          {/* Stock / Alertas — pendiente de construir */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl mb-4">
              📊
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Stock y Alertas</h3>
            <p className="text-sm text-gray-500 mb-4">Inventario en tiempo real y avisos automáticos.</p>
            <span className="text-xs font-semibold text-gray-400">
              Próximamente
            </span>
          </div>

        </div>

        {/* Info del proceso */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl mb-1">📋</p>
              <p className="text-sm font-medium text-gray-700">Campaña</p>
              <p className="text-xs text-gray-400 mt-0.5">El ejecutivo registra campaña, lugares y productos</p>
            </div>
            <div>
              <p className="text-2xl mb-1">📦</p>
              <p className="text-sm font-medium text-gray-700">Despacho</p>
              <p className="text-xs text-gray-400 mt-0.5">Almacén recibe, pickea y despacha con evidencia</p>
            </div>
            <div>
              <p className="text-2xl mb-1">✅</p>
              <p className="text-sm font-medium text-gray-700">Devolución</p>
              <p className="text-xs text-gray-400 mt-0.5">Cierre de campaña con control de retorno</p>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="mt-auto bg-white border-t border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-400">© 2026 Quasar · ControlQP</p>
          <div className="flex items-center gap-4">
            <a href="/campanas/nueva" className="text-xs text-gray-400 hover:text-blue-700">Nueva Campaña</a>
            <a href="/fichas-ingreso/nueva" className="text-xs text-gray-400 hover:text-blue-700">Ficha de Ingreso</a>
          </div>
        </div>
      </div>

    </div>
  );
}
