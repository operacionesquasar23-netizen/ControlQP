// app/campanas/[codigo]/page.tsx
//
// Pantalla simple de confirmación tras crear una campaña.
// Por ahora solo muestra el código y un mensaje de éxito; cuando
// se construya el siguiente paso (ficha de ingreso, SOLPED, etc.)
// esta pantalla puede ampliarse a un detalle completo de campaña.

import Link from 'next/link';

export default function CampañaCreadaPage({ params }: { params: { codigo: string } }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">
          ✅
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Campaña creada</h1>
        <p className="text-sm text-gray-500 mb-6">
          La campaña <strong className="text-gray-700">{params.codigo}</strong> se registró correctamente.
        </p>
        <Link
          href="/campanas/nueva"
          className="inline-block bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          Registrar otra campaña
        </Link>
        <div className="mt-3">
          <Link href="/" className="text-xs text-gray-400 hover:text-blue-700">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
