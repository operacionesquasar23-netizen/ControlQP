// app/page.tsx
//
// Home provisional: mientras solo exista el Paso 1, la portada
// enlaza directo al formulario de nueva campaña. Cuando se agreguen
// más pasos (fichas de ingreso, SOLPED, despachos...) esto se
// convierte en un dashboard real.

import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 12 }}>Gestión QP</h1>
      <p style={{ fontSize: 14, color: '#6b6b6b', marginBottom: 24 }}>
        Sistema piloto de control de despacho y retorno de elementos.
      </p>
      <Link
        href="/campañas/nueva"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          borderRadius: 8,
          background: '#0c447c',
          color: 'white',
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        Registrar nueva campaña
      </Link>
    </main>
  );
}
