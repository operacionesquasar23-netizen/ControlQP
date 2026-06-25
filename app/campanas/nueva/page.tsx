// app/campanas/nueva/page.tsx
//
// Paso 1: Registro de Campaña.
// El ejecutivo ingresa los datos generales, define los lugares donde
// se va a implementar (nombre + zona) y los productos que se usarán
// (nombre, unidad, categoría). Todo se guarda en una sola operación.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-white/80 hover:text-white text-sm">← Inicio</Link>
          <span className="text-white/40">|</span>
          <Link href="/campanas" className="text-white/80 hover:text-white text-sm">Todas las campañas</Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nueva campaña</h1>
        <p className="text-sm text-gray-500 mb-6">
          Registra los datos generales, los lugares de implementación y los productos que se usarán.
        </p>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">
              {errores.map((e, i) => (
                <li key={i} className="text-sm">{e}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={manejarSubmit}>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-4">Datos generales</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Campo label="Código de campaña">
                <input
                  type="text"
                  placeholder="QP-YIC-0001"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Campo>
              <Campo label="Cliente">
                <input
                  type="text"
                  placeholder="Yichang"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Campo>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Campo label="Marca">
                <input
                  type="text"
                  placeholder="Pantene"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Campo>
              <Campo label="Ejecutivo">
                <input
                  type="text"
                  placeholder="Paul Najarro"
                  value={ejecutivo}
                  onChange={(e) => setEjecutivo(e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Campo>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Campo label="Fecha inicio">
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Campo>
              <Campo label="Fecha fin">
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Campo>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900">Lugares de implementación</p>
              <button
                type="button"
                onClick={() => setLugares((prev) => [...prev, filaLugarVacia()])}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                + Agregar lugar
              </button>
            </div>

            {lugares.map((lugar, i) => (
              <div key={i} className="grid grid-cols-[3fr_1fr_auto] gap-2 mb-2 items-center">
                <input
                  type="text"
                  placeholder="Tienda Real Plaza Salaverry"
                  value={lugar.nombre_lugar}
                  onChange={(e) => actualizarLugar(i, { nombre_lugar: e.target.value })}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={lugar.zona}
                  onChange={(e) => actualizarLugar(i, { zona: e.target.value as Lugar['zona'] })}
                  className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Lima">Lima</option>
                  <option value="Provincia">Provincia</option>
                </select>
                <button
                  type="button"
                  aria-label="Eliminar lugar"
                  onClick={() => setLugares((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={lugares.length === 1}
                  className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900">Productos de la campaña</p>
              <button
                type="button"
                onClick={() => setProductos((prev) => [...prev, filaProductoVacia()])}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                + Agregar producto
              </button>
            </div>

            {productos.map((producto, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1.3fr_auto] gap-2 mb-2 items-center">
                <input
                  type="text"
                  placeholder="Polo institucional talla M"
                  value={producto.nombre_producto}
                  onChange={(e) => actualizarProducto(i, { nombre_producto: e.target.value })}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="unidad"
                  value={producto.unidad}
                  onChange={(e) => actualizarProducto(i, { unidad: e.target.value })}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={producto.categoria}
                  onChange={(e) => manejarCategoriaChange(i, e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  disabled={productos.length === 1}
                  className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={enviando}
              className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {enviando ? 'Creando…' : 'Crear campaña'}
            </button>
          </div>
        </form>

        {mostrarConfirmDuplicado && (
          <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-[90%]">
              <p className="font-semibold text-gray-900 mb-2">Código ya existente</p>
              <p className="text-sm text-gray-500 mb-4">
                Ya existe una campaña con el código <strong>{codigo.toUpperCase()}</strong>. ¿Deseas crear
                esta de todas formas? (puede ser una sub-campaña relacionada)
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarConfirmDuplicado(false)}
                  className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarConfirmDuplicado(false);
                    enviarFormulario(true);
                  }}
                  className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
                >
                  Crear igual
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      {children}
    </div>
  );
}
