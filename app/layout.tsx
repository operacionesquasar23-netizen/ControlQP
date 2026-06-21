// app/layout.tsx
//
// Layout raíz mínimo. Sin librerías de UI externas para mantener
// el piloto liviano — todo el estilo va inline en cada página por ahora.

export const metadata = {
  title: 'Gestión QP — Control de inventario',
  description: 'Sistema piloto de control de despacho y retorno de elementos QP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
