// app/devolucion/nueva/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerSesion } from '@/lib/sesion';
import * as XLSX from 'xlsx';
import {
  listarCampañas,
  obtenerCampaña,
  crearSolicitudDevolucion,
  formatearFecha,
  type CampañaResumen,
  type CampañaProducto,
} from '@/lib/api';
import BuscadorCampaña from '@/components/BuscadorCampana';

interface LineaForm {
  nombre_lugar: string;
  nombre_producto: string;
  cantidad_despachada: number;
  cantidad_devuelta: string;
  incluir: boolean;
}

export default function NuevaDevolucionPage() {
  const router = useRouter();
  const inputExcelRef = useRef<HTMLInputElement>(null);

  const [codigo, setCodigo] = useState('');
  const [listo, setListo] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const [campañas, setCampañas] = useState<CampañaResumen[]>([]);
  const [cargandoCampañas, setCargandoCampañas] = useState(true);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState('');
  const [lugares, setLugares] = useState<string[]>([]);
  const [productos, setProductos] = useState<CampañaProducto[]>([]);
  const [cargandoCampaña, setCargandoCampaña] = useState(false);

  const [lineas, setLineas] = useState<LineaForm[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [confirmado, setConfirmado] = useState<string | null>(null);

  const [errorExcel, setErrorExcel] = useState<string | null>(null);
  const [excelCargado, setExcelCargado] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'comercial') { router.replace('/'); return; }
    setCodigo(sesion.codigo);
    setListo(true);
    listarCampañas(sesion.codigo)
      .then((c) => setCampañas(c.filter((x) => x.estado === 'activa')))
      .finally(() => setCargandoCampañas(false));
  }, [router]);

  useEffect(() => {
    if (!codigoSeleccionado) { setLugares([]); setProductos([]); setLineas([]); setExcelCargado(false); return; }
    setCargandoCampaña(true);
    obtenerCampaña(codigoSeleccionado, codigo)
      .then((c) => {
        setLugares(Array.from(new Set(c.lugares.map((l) => l.nombre_lugar))));
        setProductos(c.productos);
        setLineas([]);
        setExcelCargado(false);
      })
      .finally(() => setCargandoCampaña(false));
  }, [codigoSeleccionado, codigo]);

  // ── Parseo Excel (mismo formato que SOLPED) ───────────────────────────────
  function manejarExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setErrorExcel(null);
    setExcelCargado(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setTimeout(() => {
        try {
          const data = ev.target?.result;
          const wb   = XLSX.read(data, { type: 'array', cellDates: true });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          // Fila 4 (índice 3): fecha en col B, productos desde col E
          const fechaRaw = rows[3]?.[1];
          const nombresProductos: string[] = [];
          for (let c = 4; c < (rows[3]?.length || 0); c++) {
            const nombre = String(rows[3]?.[c] ?? '').trim();
            if (nombre) nombresProductos.push(nombre);
          }

          if (!fechaRaw) throw new Error('No se encontró la fecha en el Excel.');
          if (nombresProductos.length === 0) throw new Error('No se encontraron productos en el Excel.');

          // Verificar productos contra campaña
          const productosDisponibles = productos.map((p) => p.nombre_producto);
          const noEncontrados = nombresProductos.filter((p) => !productosDisponibles.includes(p));
          if (noEncontrados.length > 0) throw new Error(`Productos no encontrados en la campaña: ${noEncontrados.join(', ')}`);

          // Filas de tiendas desde índice 4
          const lineasExcel: LineaForm[] = [];
          for (let r = 4; r < rows.length; r++) {
            const nombreTienda = String(rows[r]?.[3] ?? '').trim();
            if (!nombreTienda) continue;
            for (let c = 0; c < nombresProductos.length; c++) {
              const cantRaw  = rows[r]?.[4 + c];
              const cantidad = Number(cantRaw);
              if (!cantRaw || isNaN(cantidad) || cantidad <= 0) continue;
              lineasExcel.push({
                nombre_lugar       : nombreTienda,
                nombre_producto    : nombresProductos[c],
                cantidad_despachada: 0, // no aplica en devolución por campaña
                cantidad_devuelta  : String(cantidad),
                incluir            : true,
              });
            }
          }

          if (lineasExcel.length === 0) throw new Error('No se encontraron líneas con cantidad mayor a 0.');

          setLineas(lineasExcel);
          setExcelCargado(true);
          setErrores([]);

        } catch (err) {
          setErrorExcel(err instanceof Error ? err.message : 'Error leyendo el Excel.');
          setExcelCargado(false);
        }
      }, 0);
    };
    reader.readAsArrayBuffer(archivo);
    if (inputExcelRef.current) inputExcelRef.current.value = '';
  }

  function actualizarLinea(i: number, cantidad: string) {
    setLineas((prev) => prev.map((l, idx) => idx === i ? { ...l, cantidad_devuelta: cantidad } : l));
  }

  function toggleIncluir(i: number) {
    setLineas((prev) => prev.map((l, idx) => idx === i ? { ...l, incluir: !l.incluir } : l));
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, { nombre_lugar: '', nombre_producto: '', cantidad_despachada: 0, cantidad_devuelta: '', incluir: true }]);
  }

  function eliminarLinea(i: number) {
    setLineas((prev) => prev.filter((_, idx) => idx !== i));
  }

  function validar(): string[] {
    const errs: string[] = [];
    if (!codigoSeleccionado) errs.push('Debes seleccionar una campaña.');
    const activas = lineas.filter((l) => l.incluir && l.nombre_lugar && l.nombre_producto);
    if (activas.length === 0) errs.push('Debe incluir al menos un producto.');
    activas.forEach((l) => {
      const cant = Number(l.cantidad_devuelta);
      if (!l.cantidad_devuelta || isNaN(cant) || cant <= 0)
        errs.push(`${l.nombre_producto} (${l.nombre_lugar}): la cantidad debe ser mayor a 0.`);
    });
    return errs;
  }

  async function manejarEnviar() {
    const errs = validar();
    setErrores(errs);
    if (errs.length > 0) return;

    setEnviando(true);
    try {
      const resultado = await crearSolicitudDevolucion({
        codigo_campaña  : codigoSeleccionado,
        codigo_ejecutivo: codigo,
        lineas          : lineas
          .filter((l) => l.incluir && l.nombre_lugar && l.nombre_producto)
          .map((l) => ({
            nombre_lugar       : l.nombre_lugar,
            nombre_producto    : l.nombre_producto,
            cantidad_despachada: 0,
            cantidad_devuelta  : Number(l.cantidad_devuelta),
          })),
      });
      setConfirmado(resultado.id_devolucion);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error al crear la solicitud.']);
    } finally {
      setEnviando(false);
    }
  }

  if (!listo) return null;

  if (confirmado) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center animate-scale-in">
        <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">✅</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Solicitud creada</h1>
        <p className="text-sm text-gray-500 mb-2"><strong>{confirmado}</strong></p>
        <p className="text-sm text-gray-500 mb-6">Campaña <strong>{codigoSeleccionado}</strong> · Almacén recibirá la notificación.</p>
        <button
          onClick={() => { setSaliendo(true); setTimeout(() => router.push('/comercial'), 250); }}
          className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >Volver al inicio</button>
      </div>
    </div>
  );

  // Agrupar lineas por lugar para el resumen
  const lugaresMapa = lineas.reduce((acc, l) => {
    if (!l.incluir || !l.nombre_lugar) return acc;
    if (!acc[l.nombre_lugar]) acc[l.nombre_lugar] = [];
    acc[l.nombre_lugar].push(l);
    return acc;
  }, {} as Record<string, LineaForm[]>);

  return (
    <div className={`min-h-screen bg-slate-50 transition-opacity duration-250 ${saliendo ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-brand text-white px-6 py-5 animate-fade-slide-down">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <button onClick={() => { setSaliendo(true); setTimeout(() => router.push('/comercial'), 250); }} className="text-white/70 hover:text-white text-xs mb-1 block">← Volver</button>
            <h1 className="text-lg font-bold">Nueva Devolución</h1>
            <p className="text-white/70 text-xs mt-0.5">Solicitud de retorno de elementos</p>
          </div>
          {codigoSeleccionado && !cargandoCampaña && (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => inputExcelRef.current?.click()}
                className="flex items-center gap-2 text-xs font-semibold text-green-300 hover:text-green-200 border border-green-400/30 hover:border-green-300 rounded-lg px-3 py-1.5 transition-colors"
              >📂 Cargar desde Excel</button>
              {excelCargado && <p className="text-xs text-green-300">✓ Datos cargados</p>}
              {errorExcel && <p className="text-xs text-red-300 max-w-40 text-right">{errorExcel}</p>}
            </div>
          )}
          <input ref={inputExcelRef} type="file" accept=".xlsx,.xls" onChange={manejarExcel} className="hidden" />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">{errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}</ul>
          </div>
        )}

        {/* Campaña */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 animate-fade-slide-up">
          <p className="text-sm font-semibold text-gray-900 mb-4">Campaña</p>
          <BuscadorCampaña campañas={campañas} cargando={cargandoCampañas} value={codigoSeleccionado} onChange={setCodigoSeleccionado} />
        </section>

        {/* Líneas */}
        {codigoSeleccionado && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 animate-fade-slide-up delay-75">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Productos a devolver</p>
                <p className="text-xs text-gray-400 mt-0.5">Carga un Excel o agrega líneas manualmente</p>
              </div>
              <button type="button" onClick={agregarLinea} disabled={cargandoCampaña}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40">
                + Agregar línea
              </button>
            </div>

            {cargandoCampaña && <p className="text-sm text-gray-400">Cargando campaña…</p>}

            {!cargandoCampaña && lineas.length === 0 && (
              <p className="text-sm text-gray-400">Carga un Excel o agrega líneas manualmente.</p>
            )}

            {lineas.length > 0 && (
              <>
                <div className="grid grid-cols-[auto_2fr_2fr_1fr_auto] gap-2 mb-2 px-1">
                  <span className="text-xs text-gray-400">✓</span>
                  <span className="text-xs text-gray-400">Lugar</span>
                  <span className="text-xs text-gray-400">Producto</span>
                  <span className="text-xs text-gray-400">Cantidad</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {lineas.map((linea, i) => (
                    <div key={i} className="grid grid-cols-[auto_2fr_2fr_1fr_auto] gap-2 items-center">
                      <input type="checkbox" checked={linea.incluir} onChange={() => toggleIncluir(i)} className="w-4 h-4" />
                      {excelCargado ? (
                        <p className={`text-sm ${!linea.incluir ? 'text-gray-300 line-through' : 'text-gray-700'}`}>{linea.nombre_lugar}</p>
                      ) : (
                        <select value={linea.nombre_lugar} onChange={(e) => setLineas((prev) => prev.map((l, idx) => idx === i ? { ...l, nombre_lugar: e.target.value } : l))}
                          className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Lugar…</option>
                          {lugares.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      )}
                      {excelCargado ? (
                        <p className={`text-sm ${!linea.incluir ? 'text-gray-300 line-through' : 'text-gray-900'}`}>{linea.nombre_producto}</p>
                      ) : (
                        <select value={linea.nombre_producto} onChange={(e) => setLineas((prev) => prev.map((l, idx) => idx === i ? { ...l, nombre_producto: e.target.value } : l))}
                          className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Producto…</option>
                          {productos.map((p) => <option key={p.nombre_producto} value={p.nombre_producto}>{p.nombre_producto}</option>)}
                        </select>
                      )}
                      <input
                        type="number" min="1"
                        value={linea.cantidad_devuelta}
                        disabled={!linea.incluir}
                        onChange={(e) => actualizarLinea(i, e.target.value)}
                        className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:bg-gray-50"
                      />
                      <button type="button" onClick={() => eliminarLinea(i)}
                        className="w-9 h-9 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors text-sm">✕</button>
                    </div>
                  ))}
                </div>

                {/* Resumen por lugar */}
                {Object.keys(lugaresMapa).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className="text-xs text-gray-400 mb-2">Resumen por lugar</p>
                    <div className="space-y-1">
                      {Object.entries(lugaresMapa).map(([lugar, items]) => (
                        <div key={lugar} className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">{lugar}</p>
                          {items.map((l, i) => (
                            <p key={i} className="text-xs text-gray-500">{l.nombre_producto}: {l.cantidad_devuelta || 0}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        <div className="flex justify-end">
          <button onClick={manejarEnviar} disabled={enviando || !codigoSeleccionado}
            className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            {enviando ? <span className="animate-pulse-soft">Enviando…</span> : 'Crear solicitud de devolución'}
          </button>
        </div>
      </main>
    </div>
  );
}
