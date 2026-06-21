// app/campanas/[codigo]/page.tsx
//
// Pantalla simple de confirmación tras crear una campaña.
// Por ahora solo muestra el código y un mensaje de éxito; cuando
// se construya el siguiente paso (ficha de ingreso, SOLPED, etc.)
// esta pantalla puede ampliarse a un detalle completo de campaña.

import Link from 'next/link';

export default function CampañaCreadaPage({ params }: { params: { codigo: string } }) {
  return (
    <main style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 12 }}>Campaña creada</h1>
      <p style={{ fontSize: 14, color: '#6b6b6b', marginBottom: 24 }}>
        La campaña <strong>{params.codigo}</strong> se registró correctamente.
      </p>
      <Link
        href="/campanas/nueva"
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
        Registrar otra campaña
      </Link>
    </main>
  );
}
