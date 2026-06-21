// app/campanas/nueva/page.tsx
//
// Paso 1: Registro de Campaña.
// El ejecutivo ingresa los datos generales, define los lugares donde
// se va a implementar (nombre + zona) y los productos que se usarán
// (nombre, unidad, categoría). Todo se guarda en una sola operación.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearCampaña, obtenerCategorias, type Lugar, type Producto } from '@/lib/api';

const CATEGORIAS_BASE = ['Uniformes', 'Elementos POP', 'Merchandising', 'Canjes', 'Perecibles'];
const CODIGO_REGEX = /^QP-[A-Z]{3}-\d{4}$/;

function filaLugarVacia(): Lugar {
  return { nombre_lugar: '', zona: 'Lima' };
}

function filaProductoVacia(): Producto {
  return { nombre_producto: '', unidad: '', categoria: '' };
}

export default function NuevaCampañaPage() {
  const router = useRouter();

  const [codigo, setCodigo] = useState('');
  const [cliente, setCliente] = useState('');
  const [marca, setMarca] = useState('');
  const [ejecutivo, setEjecutivo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [lugares, setLugares] = useState<Lugar[]>([filaLugarVacia()]);
  const [productos, setProductos] = useState<Producto[]>([filaProductoVacia()]);
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_BASE);

  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [mostrarConfirmDuplicado, setMostrarConfirmDuplicado] = useState(false);

  useEffect(() => {
    obtenerCategorias()
      .then((cats) => {
        if (cats && cats.length > 0) setCategorias(cats);
      })
      .catch(() => {
        // Si falla la carga de categorías, se sigue con las base.
        // No bloquea el formulario por esto.
      });
  }, []);

  function actualizarLugar(index: number, cambios: Partial<Lugar>) {
    setLugares((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  }

  function actualizarProducto(index: number, cambios: Partial<Producto>) {
    setProductos((prev) => prev.map((p, i) => (i === index ? { ...p, ...cambios } : p)));
  }

  function manejarCategoriaChange(index: number, valor: string) {
    if (valor === '__nueva') {
      const nueva = window.prompt('Nombre de la nueva categoría:');
      if (nueva && nueva.trim()) {
        const nombreLimpio = nueva.trim();
        setCategorias((prev) => (prev.includes(nombreLimpio) ? prev : [...prev, nombreLimpio]));
        actualizarProducto(index, { categoria: nombreLimpio });
      }
      return;
    }
    actualizarProducto(index, { categoria: valor });
  }

  function validar(): string[] {
    const errs: string[] = [];

    if (!CODIGO_REGEX.test(codigo.trim().toUpperCase())) {
      errs.push('El código de campaña debe tener el formato QP-XXX-NNNN (ej. QP-YIC-0001).');
    }
    if (!cliente.trim()) errs.push('El cliente es obligatorio.');
    if (!marca.trim()) errs.push('La marca es obligatoria.');
    if (!ejecutivo.trim()) errs.push('El ejecutivo es obligatorio.');
    if (!fechaInicio) errs.push('La fecha de inicio es obligatoria.');
    if (!fechaFin) errs.push('La fecha de fin es obligatoria.');

    const lugaresValidos = lugares.filter((l) => l.nombre_lugar.trim());
    if (lugaresValidos.length === 0) errs.push('Debe ingresar al menos un lugar de implementación.');

    const productosValidos = productos.filter((p) => p.nombre_producto.trim());
    if (productosValidos.length === 0) errs.push('Debe ingresar al menos un producto.');
    productosValidos.forEach((p, i) => {
      if (!p.categoria) errs.push('El producto en la fila ' + (i + 1) + ' necesita una categoría.');
    });

    return errs;
  }

  async function enviarFormulario(forzarDuplicado: boolean) {
    setEnviando(true);
    try {
      const resultado = await crearCampaña({
        codigo_campaña: codigo.trim().toUpperCase(),
        cliente: cliente.trim(),
        marca: marca.trim(),
        ejecutivo: ejecutivo.trim(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        lugares: lugares.filter((l) => l.nombre_lugar.trim()),
        productos: productos.filter((p) => p.nombre_producto.trim()),
        forzarDuplicado,
      });

      if (!resultado.creado && resultado.advertenciaDuplicado) {
        setMostrarConfirmDuplicado(true);
        setEnviando(false);
        return;
      }

      router.push('/campanas/' + codigo.trim().toUpperCase());
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error desconocido al crear la campaña.']);
      setEnviando(false);
    }
  }

  function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validar();
    setErrores(errs);
    if (errs.length > 0) return;
    enviarFormulario(false);
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Nueva campaña</h1>
      <p style={{ fontSize: 14, color: '#6b6b6b', marginBottom: 24 }}>
        Registra los datos generales, los lugares de implementación y los productos que se usarán.
      </p>

      {errores.length > 0 && (
        <div style={cajaErrorStyle}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {errores.map((e, i) => (
              <li key={i} style={{ fontSize: 13 }}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={manejarSubmit}>
        <section style={seccionStyle}>
          <p style={tituloSeccionStyle}>Datos generales</p>
          <div style={gridDosColStyle}>
            <Campo label="Código de campaña">
              <input
                type="text"
                placeholder="QP-YIC-0001"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                style={{ ...inputStyle, textTransform: 'uppercase' }}
              />
            </Campo>
            <Campo label="Cliente">
              <input
                type="text"
                placeholder="Yichang"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                style={inputStyle}
              />
            </Campo>
          </div>
          <div style={gridDosColStyle}>
            <Campo label="Marca">
              <input
                type="text"
                placeholder="Pantene"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                style={inputStyle}
              />
            </Campo>
            <Campo label="Ejecutivo">
              <input
                type="text"
                placeholder="Paul Najarro"
                value={ejecutivo}
                onChange={(e) => setEjecutivo(e.target.value)}
                style={inputStyle}
              />
            </Campo>
          </div>
          <div style={gridDosColStyle}>
            <Campo label="Fecha inicio">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={inputStyle}
              />
            </Campo>
            <Campo label="Fecha fin">
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                style={inputStyle}
              />
            </Campo>
          </div>
        </section>

        <section style={seccionStyle}>
          <div style={cabeceraSeccionStyle}>
            <p style={tituloSeccionStyle}>Lugares de implementación</p>
            <button
              type="button"
              onClick={() => setLugares((prev) => [...prev, filaLugarVacia()])}
              style={botonSecundarioStyle}
            >
              + Agregar lugar
            </button>
          </div>

          {lugares.map((lugar, i) => (
            <div key={i} style={filaLugarStyle}>
              <input
                type="text"
                placeholder="Tienda Real Plaza Salaverry"
                value={lugar.nombre_lugar}
                onChange={(e) => actualizarLugar(i, { nombre_lugar: e.target.value })}
                style={inputStyle}
              />
              <select
                value={lugar.zona}
                onChange={(e) => actualizarLugar(i, { zona: e.target.value as Lugar['zona'] })}
                style={inputStyle}
              >
                <option value="Lima">Lima</option>
                <option value="Provincia">Provincia</option>
              </select>
              <button
                type="button"
                aria-label="Eliminar lugar"
                onClick={() => setLugares((prev) => prev.filter((_, idx) => idx !== i))}
                style={botonEliminarStyle}
                disabled={lugares.length === 1}
              >
                ✕
              </button>
            </div>
          ))}
        </section>

        <section style={seccionStyle}>
          <div style={cabeceraSeccionStyle}>
            <p style={tituloSeccionStyle}>Productos de la campaña</p>
            <button
              type="button"
              onClick={() => setProductos((prev) => [...prev, filaProductoVacia()])}
              style={botonSecundarioStyle}
            >
              + Agregar producto
            </button>
          </div>

          {productos.map((producto, i) => (
            <div key={i} style={filaProductoStyle}>
              <input
                type="text"
                placeholder="Polo institucional talla M"
                value={producto.nombre_producto}
                onChange={(e) => actualizarProducto(i, { nombre_producto: e.target.value })}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="unidad"
                value={producto.unidad}
                onChange={(e) => actualizarProducto(i, { unidad: e.target.value })}
                style={inputStyle}
              />
              <select
                value={producto.categoria}
                onChange={(e) => manejarCategoriaChange(i, e.target.value)}
                style={inputStyle}
              >
                <option value="">Selecciona categoría</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__nueva">+ Nueva categoría</option>
              </select>
              <button
                type="button"
                aria-label="Eliminar producto"
                onClick={() => setProductos((prev) => prev.filter((_, idx) => idx !== i))}
                style={botonEliminarStyle}
                disabled={productos.length === 1}
              >
                ✕
              </button>
            </div>
          ))}
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="submit" disabled={enviando} style={botonPrimarioStyle}>
            {enviando ? 'Creando…' : 'Crear campaña'}
          </button>
        </div>
      </form>

      {mostrarConfirmDuplicado && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <p style={{ fontWeight: 500, marginBottom: 8 }}>Código ya existente</p>
            <p style={{ fontSize: 14, color: '#6b6b6b', marginBottom: 16 }}>
              Ya existe una campaña con el código <strong>{codigo.toUpperCase()}</strong>. ¿Deseas crear
              esta de todas formas? (puede ser una sub-campaña relacionada)
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setMostrarConfirmDuplicado(false)}
                style={botonSecundarioStyle}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarConfirmDuplicado(false);
                  enviarFormulario(true);
                }}
                style={botonPrimarioStyle}
              >
                Crear igual
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ---- Estilos inline (sin dependencias de CSS externas) ----

const seccionStyle: React.CSSProperties = {
  border: '0.5px solid #e3e1d8',
  borderRadius: 12,
  padding: '1rem 1.25rem',
  marginBottom: 16,
};

const cabeceraSeccionStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
};

const tituloSeccionStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  margin: 0,
};

const gridDosColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  marginBottom: 10,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#6b6b6b',
  display: 'block',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  borderRadius: 8,
  border: '0.5px solid #d3d1c7',
  padding: '0 10px',
  fontSize: 14,
  boxSizing: 'border-box',
};

const filaLugarStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '3fr 1fr auto',
  gap: 8,
  marginBottom: 8,
  alignItems: 'center',
};

const filaProductoStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1.3fr auto',
  gap: 8,
  marginBottom: 8,
  alignItems: 'center',
};

const botonSecundarioStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '4px 10px',
  borderRadius: 8,
  border: '0.5px solid #d3d1c7',
  background: 'transparent',
  cursor: 'pointer',
};

const botonPrimarioStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  padding: '8px 18px',
  borderRadius: 8,
  border: 'none',
  background: '#0c447c',
  color: 'white',
  cursor: 'pointer',
};

const botonEliminarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '0.5px solid #d3d1c7',
  background: 'transparent',
  cursor: 'pointer',
};

const cajaErrorStyle: React.CSSProperties = {
  background: '#fcebeb',
  border: '0.5px solid #f09595',
  borderRadius: 8,
  padding: '10px 14px',
  marginBottom: 16,
  color: '#791f1f',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
};

const modalStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: '1.5rem',
  maxWidth: 420,
  width: '90%',
};
