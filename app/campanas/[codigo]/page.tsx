// app/campanas/[codigo]/page.tsx
//
// Vista de detalle de una campaña. Muestra los datos generales,
// lugares y productos ya registrados, y permite AGREGAR lugares o
// productos nuevos (no editar ni eliminar los existentes — eso
// queda para una iteración futura si hace falta).
//
// Este es el camino para registrar "elementos de última hora" que
// no estaban contemplados al crear la campaña: primero se agregan
// aquí, y luego sí aparecen disponibles para marcarlos en una ficha
// de ingreso.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  obtenerCampaña,
  agregarElementosACampaña,
  formatearFecha,
  type CampañaCompleta,
  type Lugar,
  type Producto,
} from '@/lib/api';

const CATEGORIAS_BASE = ['Uniformes', 'Elementos POP', 'Merchandising', 'Canjes', 'Perecibles'];

function filaLugarVacia(): Lugar {
  return { nombre_lugar: '', zona: 'Lima' };
}

function filaProductoVacia(): Producto {
  return { nombre_producto: '', unidad: '', categoria: '' };
}

export default function DetalleCampañaPage({ params }: { params: { codigo: string } }) {
  const codigo = params.codigo;

  const [campaña, setCampaña] = useState<CampañaCompleta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [lugaresNuevos, setLugaresNuevos] = useState<Lugar[]>([]);
  const [productosNuevos, setProductosNuevos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_BASE);

  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  function cargarCampaña() {
    setCargando(true);
    obtenerCampaña(codigo)
      .then((c) => {
        if (!c) {
          setErrorCarga('No se encontró ninguna campaña con el código ' + codigo + '.');
          return;
        }
        setCampaña(c);
        const cats = Array.from(new Set(c.productos.map((p) => p.categoria).filter(Boolean)));
        if (cats.length > 0) setCategorias(Array.from(new Set([...CATEGORIAS_BASE, ...cats])));
      })
      .catch((err) => {
        setErrorCarga(err instanceof Error ? err.message : 'No se pudo cargar la campaña.');
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargarCampaña();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  function manejarCategoriaChange(index: number, valor: string) {
    if (valor === '__nueva') {
      const nueva = window.prompt('Nombre de la nueva categoría:');
      if (nueva && nueva.trim()) {
        const nombreLimpio = nueva.trim();
        setCategorias((prev) => (prev.includes(nombreLimpio) ? prev : [...prev, nombreLimpio]));
        setProductosNuevos((prev) => prev.map((p, i) => (i === index ? { ...p, categoria: nombreLimpio } : p)));
      }
      return;
    }
    setProductosNuevos((prev) => prev.map((p, i) => (i === index ? { ...p, categoria: valor } : p)));
  }

  function validar(): string[] {
    const errs: string[] = [];
    const lugaresValidos = lugaresNuevos.filter((l) => l.nombre_lugar.trim());
    const productosValidos = productosNuevos.filter((p) => p.nombre_producto.trim());

    if (lugaresValidos.length === 0 && productosValidos.length === 0) {
      errs.push('Agrega al menos un lugar o un producto nuevo.');
    }
    productosValidos.forEach((p, i) => {
      if (!p.categoria) errs.push('El producto nuevo en la fila ' + (i + 1) + ' necesita una categoría.');
    });
    return errs;
  }

  async function manejarGuardar() {
    const errs = validar();
    setErrores(errs);
    if (errs.length > 0) return;

    setGuardando(true);
    try {
      const resultado = await agregarElementosACampaña({
        codigo_campaña: codigo,
        lugares: lugaresNuevos.filter((l) => l.nombre_lugar.trim()),
        productos: productosNuevos.filter((p) => p.nombre_producto.trim()),
      });

      setMensajeExito(
        `Se agregaron ${resultado.lugaresAgregados} lugar(es) y ${resultado.productosAgregados} producto(s) nuevo(s).`
      );
      setLugaresNuevos([]);
      setProductosNuevos([]);
      setMostrarFormulario(false);
      cargarCampaña();
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error desconocido al guardar.']);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando campaña…</p>
      </div>
    );
  }

  if (errorCarga || !campaña) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <p className="text-sm text-red-600 mb-4">{errorCarga}</p>
          <Link href="/" className="text-xs text-gray-400 hover:text-blue-700">← Volver al inicio</Link>
        </div>
      </div>
    );
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{campaña.cabecera.codigo_campaña}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {campaña.cabecera.cliente} — {campaña.cabecera.marca}
        </p>

        {mensajeExito && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5 text-green-800 text-sm">
            {mensajeExito}
          </div>
        )}

        {/* Datos generales (solo lectura) */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-4">Datos generales</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-400">Ejecutivo:</span> {campaña.cabecera.ejecutivo}</div>
            <div><span className="text-gray-400">Estado:</span> {campaña.cabecera.estado}</div>
            <div><span className="text-gray-400">Inicio:</span> {formatearFecha(campaña.cabecera.fecha_inicio)}</div>
            <div><span className="text-gray-400">Fin:</span> {formatearFecha(campaña.cabecera.fecha_fin)}</div>
          </div>
        </section>

        {/* Lugares existentes */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Lugares de implementación</p>
          {campaña.lugares.length === 0 && <p className="text-sm text-gray-400">Sin lugares registrados.</p>}
          <div className="space-y-1">
            {campaña.lugares.map((l, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-gray-50 py-1.5 last:border-0">
                <span className="text-gray-900">{l.nombre_lugar}</span>
                <span className="text-gray-400">{l.zona}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Productos existentes */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Productos de la campaña</p>
          {campaña.productos.length === 0 && <p className="text-sm text-gray-400">Sin productos registrados.</p>}
          <div className="space-y-1">
            {campaña.productos.map((p, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-gray-50 py-1.5 last:border-0">
                <span className="text-gray-900">{p.nombre_producto}</span>
                <span className="text-gray-400">{p.unidad} · {p.categoria}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Botón para abrir el formulario de "agregar de última hora" */}
        {!mostrarFormulario && (
          <button
            onClick={() => {
              setMostrarFormulario(true);
              setLugaresNuevos([filaLugarVacia()]);
              setProductosNuevos([filaProductoVacia()]);
              setMensajeExito(null);
            }}
            className="text-sm font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-4 py-2 transition-colors mb-4"
          >
            + Agregar lugar o producto de última hora
          </button>
        )}

        {mostrarFormulario && (
          <>
            {errores.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
                <ul className="list-disc pl-5 space-y-0.5">
                  {errores.map((e, i) => (
                    <li key={i} className="text-sm">{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-900">Nuevos lugares</p>
                <button
                  type="button"
                  onClick={() => setLugaresNuevos((prev) => [...prev, filaLugarVacia()])}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
                >
                  + Agregar lugar
                </button>
              </div>

              {lugaresNuevos.map((lugar, i) => (
                <div key={i} className="grid grid-cols-[3fr_1fr_auto] gap-2 mb-2 items-center">
                  <input
                    type="text"
                    placeholder="Tienda Real Plaza Salaverry"
                    value={lugar.nombre_lugar}
                    onChange={(e) =>
                      setLugaresNuevos((prev) =>
                        prev.map((l, idx) => (idx === i ? { ...l, nombre_lugar: e.target.value } : l))
                      )
                    }
                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={lugar.zona}
                    onChange={(e) =>
                      setLugaresNuevos((prev) =>
                        prev.map((l, idx) => (idx === i ? { ...l, zona: e.target.value as Lugar['zona'] } : l))
                      )
                    }
                    className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Lima">Lima</option>
                    <option value="Provincia">Provincia</option>
                  </select>
                  <button
                    type="button"
                    aria-label="Quitar"
                    onClick={() => setLugaresNuevos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </section>

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-900">Nuevos productos</p>
                <button
                  type="button"
                  onClick={() => setProductosNuevos((prev) => [...prev, filaProductoVacia()])}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
                >
                  + Agregar producto
                </button>
              </div>

              {productosNuevos.map((producto, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1.3fr_auto] gap-2 mb-2 items-center">
                  <input
                    type="text"
                    placeholder="Exhibidor de mesa"
                    value={producto.nombre_producto}
                    onChange={(e) =>
                      setProductosNuevos((prev) =>
                        prev.map((p, idx) => (idx === i ? { ...p, nombre_producto: e.target.value } : p))
                      )
                    }
                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="unidad"
                    value={producto.unidad}
                    onChange={(e) =>
                      setProductosNuevos((prev) =>
                        prev.map((p, idx) => (idx === i ? { ...p, unidad: e.target.value } : p))
                      )
                    }
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
                    aria-label="Quitar"
                    onClick={() => setProductosNuevos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </section>

            <div className="flex justify-end gap-2 mb-4">
              <button
                onClick={() => {
                  setMostrarFormulario(false);
                  setErrores([]);
                }}
                className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={manejarGuardar}
                disabled={guardando}
                className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </>
        )}

        <div className="mt-2">
          <Link
            href="/fichas-ingreso/nueva"
            className="text-xs text-gray-400 hover:text-blue-700"
          >
            Ir a registrar una ficha de ingreso →
          </Link>
        </div>
      </main>
    </div>
  );
}
