// app/campanas/nueva/page.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { crearCampaña, obtenerCategorias, validarEjecutivo, type Lugar, type Producto } from '@/lib/api';
import AccesoEjecutivo from '@/components/AccesoEjecutivo';
import * as XLSX from 'xlsx';

const CATEGORIAS_BASE = ['Uniformes', 'Elementos POP', 'Merchandising', 'Canjes', 'Perecibles'];
const CODIGO_REGEX = /^QP-[A-Z]{3}-\d{4}$/;

function filaLugarVacia(): Lugar { return { nombre_lugar: '', zona: 'Lima' }; }
function filaProductoVacia(): Producto { return { nombre_producto: '', unidad: '', categoria: '' }; }

export default function NuevaCampañaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Cargando…</p></div>}>
      <NuevaCampañaContenido />
    </Suspense>
  );
}

function NuevaCampañaContenido() {
  const searchParams = useSearchParams();
  const codigoDesdeQuery = searchParams.get('codigo_ejecutivo');
  const [verificandoQuery, setVerificandoQuery] = useState(!!codigoDesdeQuery);
  const [sesionDesdeQuery, setSesionDesdeQuery] = useState<{ codigo: string; nombre: string } | null>(null);

  useEffect(() => {
    if (!codigoDesdeQuery) return;
    validarEjecutivo(codigoDesdeQuery)
      .then((r) => { if (r.valido && r.nombre && r.codigo) setSesionDesdeQuery({ codigo: r.codigo, nombre: r.nombre }); })
      .finally(() => setVerificandoQuery(false));
  }, [codigoDesdeQuery]);

  if (verificandoQuery) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Verificando acceso…</p></div>;
  if (sesionDesdeQuery) return <FormularioNuevaCampaña codigoEjecutivo={sesionDesdeQuery.codigo} nombreEjecutivo={sesionDesdeQuery.nombre} />;
  return (
    <AccesoEjecutivo titulo="Nueva campaña" descripcion="Ingresa tu código de acceso para registrar una campaña.">
      {({ codigoEjecutivo, nombreEjecutivo }) => <FormularioNuevaCampaña codigoEjecutivo={codigoEjecutivo} nombreEjecutivo={nombreEjecutivo} />}
    </AccesoEjecutivo>
  );
}

function FormularioNuevaCampaña({ codigoEjecutivo, nombreEjecutivo }: { codigoEjecutivo: string; nombreEjecutivo: string }) {
  const router = useRouter();
  const inputExcelRef = useRef<HTMLInputElement>(null);

  const [codigo, setCodigo] = useState('');
  const [cliente, setCliente] = useState('');
  const [marca, setMarca] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [lugares, setLugares] = useState<Lugar[]>([filaLugarVacia()]);
  const [productos, setProductos] = useState<Producto[]>([filaProductoVacia()]);
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_BASE);
  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [mostrarConfirmDuplicado, setMostrarConfirmDuplicado] = useState(false);
  const [errorExcel, setErrorExcel] = useState<string | null>(null);
  const [excelCargado, setExcelCargado] = useState(false);

  useEffect(() => {
    obtenerCategorias()
      .then((cats) => { if (cats && cats.length > 0) setCategorias(cats); })
      .catch(() => {});
  }, []);

  // ── Parseo del Excel ─────────────────────────────────────────────────────
  function manejarExcel(e: React.ChangeEvent<HTMLInputElement>) {
  const archivo = e.target.files?.[0];
  if (!archivo) return;
  setErrorExcel(null);
  setExcelCargado(false);

  const reader = new FileReader();
  reader.onload = (ev) => {
    // 👇 setTimeout para no bloquear el hilo principal
    setTimeout(() => {
      try {
        const data  = ev.target?.result;
        const wb    = XLSX.read(data, { type: 'array', cellDates: true });
        const ws    = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const getCabecera = (fila: number) => String(rows[fila]?.[1] ?? '').trim();

        const codigoRaw   = getCabecera(1);
        const clienteRaw  = getCabecera(2);
        const marcaRaw    = getCabecera(3);
        const fechaIniRaw = rows[4]?.[1];
        const fechaFinRaw = rows[5]?.[1];

        if (!codigoRaw)  throw new Error('No se encontró el Código de campaña.');
        if (!clienteRaw) throw new Error('No se encontró el Cliente.');
        if (!marcaRaw)   throw new Error('No se encontró la Marca.');

        function serialAFecha(v: any): string {
          if (!v) return '';
          if (v instanceof Date) {
            const mm = String(v.getMonth() + 1).padStart(2, '0');
            const dd = String(v.getDate()).padStart(2, '0');
            return `${v.getFullYear()}-${mm}-${dd}`;
          }
          if (typeof v === 'number') {
            const date = XLSX.SSF.parse_date_code(v);
            return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
          }
          const str = String(v).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
          const partes = str.split('/');
          if (partes.length === 3) return `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
          return '';
        }

        const lugaresExcel: Lugar[] = [];
        for (let r = 1; r < rows.length; r++) {
          const nombre = String(rows[r]?.[3] ?? '').trim();
          const zona   = String(rows[r]?.[4] ?? '').trim();
          if (!nombre) continue;
          lugaresExcel.push({ nombre_lugar: nombre, zona: zona.toLowerCase() === 'provincia' ? 'Provincia' : 'Lima' });
        }

        const productosExcel: Producto[] = [];
        const categoriasNuevas = new Set<string>();
        for (let r = 1; r < rows.length; r++) {
          const nombre    = String(rows[r]?.[6] ?? '').trim();
          const unidad    = String(rows[r]?.[7] ?? '').trim();
          const categoria = String(rows[r]?.[8] ?? '').trim();
          if (!nombre) continue;
          productosExcel.push({ nombre_producto: nombre, unidad, categoria });
          if (categoria) categoriasNuevas.add(categoria);
        }

        if (lugaresExcel.length === 0)   throw new Error('No se encontraron tiendas en el Excel.');
        if (productosExcel.length === 0) throw new Error('No se encontraron productos en el Excel.');

        setCodigo(codigoRaw.toUpperCase());
        setCliente(clienteRaw);
        setMarca(marcaRaw);
        setFechaInicio(serialAFecha(fechaIniRaw));
        setFechaFin(serialAFecha(fechaFinRaw));
        setLugares(lugaresExcel);
        setProductos(productosExcel);
        setCategorias((prev) => Array.from(new Set([...prev, ...categoriasNuevas])));
        setErrores([]);
        setExcelCargado(true);

      } catch (err) {
        setErrorExcel(err instanceof Error ? err.message : 'Error leyendo el Excel.');
        setExcelCargado(false);
      }
    }, 0);
  };
  reader.readAsArrayBuffer(archivo);
  if (inputExcelRef.current) inputExcelRef.current.value = '';
}

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
    if (!CODIGO_REGEX.test(codigo.trim().toUpperCase())) errs.push('El código de campaña debe tener el formato QP-XXX-NNNN (ej. QP-YIC-0001).');
    if (!cliente.trim()) errs.push('El cliente es obligatorio.');
    if (!marca.trim()) errs.push('La marca es obligatoria.');
    if (!fechaInicio) errs.push('La fecha de inicio es obligatoria.');
    if (!fechaFin) errs.push('La fecha de fin es obligatoria.');
    const lugaresValidos = lugares.filter((l) => l.nombre_lugar.trim());
    if (lugaresValidos.length === 0) errs.push('Debe ingresar al menos un lugar de implementación.');
    const productosValidos = productos.filter((p) => p.nombre_producto.trim());
    if (productosValidos.length === 0) errs.push('Debe ingresar al menos un producto.');
    productosValidos.forEach((p, i) => { if (!p.categoria) errs.push('El producto en la fila ' + (i + 1) + ' necesita una categoría.'); });
    return errs;
  }

  async function enviarFormulario(forzarDuplicado: boolean) {
    setEnviando(true);
    try {
      const resultado = await crearCampaña({
        codigo_campaña: codigo.trim().toUpperCase(),
        cliente: cliente.trim(),
        marca: marca.trim(),
        codigo_ejecutivo: codigoEjecutivo,
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
      router.push('/campanas/' + codigo.trim().toUpperCase() + '?codigo_ejecutivo=' + encodeURIComponent(codigoEjecutivo));
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
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/80 hover:text-white text-sm">← Inicio</Link>
            <span className="text-white/40">|</span>
            <Link href="/campanas" className="text-white/80 hover:text-white text-sm">Todas las campañas</Link>
          </div>
          <span className="text-white/80 text-sm">{nombreEjecutivo}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Nueva campaña</h1>
            <p className="text-sm text-gray-500">Registra los datos generales, los lugares de implementación y los productos.</p>
          </div>
          {/* 👇 BOTÓN CARGAR EXCEL */}
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => inputExcelRef.current?.click()}
              className="flex items-center gap-2 text-xs font-semibold text-green-700 hover:text-green-800 border border-green-200 hover:border-green-300 bg-green-50 hover:bg-green-100 rounded-lg px-3 py-2 transition-colors"
            >
              📂 Cargar desde Excel
            </button>
            {excelCargado && <p className="text-xs text-green-600">✓ Datos cargados — revisa y confirma</p>}
            {errorExcel && <p className="text-xs text-red-600">{errorExcel}</p>}
          </div>
          <input ref={inputExcelRef} type="file" accept=".xlsx,.xls" onChange={manejarExcel} className="hidden" />
        </div>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">{errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}</ul>
          </div>
        )}

        <form onSubmit={manejarSubmit}>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-4">Datos generales</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Campo label="Código de campaña">
                <input type="text" placeholder="QP-YIC-0001" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Campo>
              <Campo label="Cliente">
                <input type="text" placeholder="Yichang" value={cliente} onChange={(e) => setCliente(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Campo>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Campo label="Marca">
                <input type="text" placeholder="Pantene" value={marca} onChange={(e) => setMarca(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Campo>
              <Campo label="Ejecutivo">
                <input type="text" value={nombreEjecutivo} disabled className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm bg-gray-50 text-gray-500" />
              </Campo>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Campo label="Fecha inicio">
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Campo>
              <Campo label="Fecha fin">
                <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Campo>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Lugares de implementación</p>
                <p className="text-xs text-gray-400 mt-0.5">{lugares.filter(l => l.nombre_lugar.trim()).length} lugares</p>
              </div>
              <button type="button" onClick={() => setLugares((prev) => [...prev, filaLugarVacia()])} className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors">+ Agregar lugar</button>
            </div>
            {lugares.map((lugar, i) => (
              <div key={i} className="grid grid-cols-[3fr_1fr_auto] gap-2 mb-2 items-center">
                <input type="text" placeholder="Tienda Real Plaza Salaverry" value={lugar.nombre_lugar} onChange={(e) => actualizarLugar(i, { nombre_lugar: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={lugar.zona} onChange={(e) => actualizarLugar(i, { zona: e.target.value as Lugar['zona'] })} className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Lima">Lima</option>
                  <option value="Provincia">Provincia</option>
                </select>
                <button type="button" aria-label="Eliminar lugar" onClick={() => setLugares((prev) => prev.filter((_, idx) => idx !== i))} disabled={lugares.length === 1} className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">✕</button>
              </div>
            ))}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Productos de la campaña</p>
                <p className="text-xs text-gray-400 mt-0.5">{productos.filter(p => p.nombre_producto.trim()).length} productos</p>
              </div>
              <button type="button" onClick={() => setProductos((prev) => [...prev, filaProductoVacia()])} className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors">+ Agregar producto</button>
            </div>
            {productos.map((producto, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1.3fr_auto] gap-2 mb-2 items-center">
                <input type="text" placeholder="Polo institucional talla M" value={producto.nombre_producto} onChange={(e) => actualizarProducto(i, { nombre_producto: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="unidad" value={producto.unidad} onChange={(e) => actualizarProducto(i, { unidad: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={producto.categoria} onChange={(e) => manejarCategoriaChange(i, e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecciona categoría</option>
                  {categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="__nueva">+ Nueva categoría</option>
                </select>
                <button type="button" aria-label="Eliminar producto" onClick={() => setProductos((prev) => prev.filter((_, idx) => idx !== i))} disabled={productos.length === 1} className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">✕</button>
              </div>
            ))}
          </section>

          <div className="flex justify-end">
            <button type="submit" disabled={enviando} className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              {enviando ? 'Creando…' : 'Crear campaña'}
            </button>
          </div>
        </form>

        {mostrarConfirmDuplicado && (
          <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-[90%]">
              <p className="font-semibold text-gray-900 mb-2">Código ya existente</p>
              <p className="text-sm text-gray-500 mb-4">Ya existe una campaña con el código <strong>{codigo.toUpperCase()}</strong>. ¿Deseas crear esta de todas formas?</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setMostrarConfirmDuplicado(false)} className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="button" onClick={() => { setMostrarConfirmDuplicado(false); enviarFormulario(true); }} className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors">Crear igual</button>
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
