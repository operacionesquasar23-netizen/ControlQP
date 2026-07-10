// app/layout.tsx
//
// Layout raíz. Importa Tailwind globalmente (igual estilo visual
// que gestion-pdl) y define metadata básica del sitio.

import './globals.css';

export const metadata = {
  title: 'Gestión QP — Control de inventario',
  description: 'Sistema piloto de control de despacho y retorno de elementos QP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
