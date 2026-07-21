// app/recepcion/[id]/page.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  validarAlmacen,
  obtenerFichaParaRecepcion,
  subirFotoRecepcion,
  confirmarRecepcion,
  type FichaPendiente,
} from '@/lib/api';
import AccesoAlmacen from '@/components/AccesoAlmacen';

interface LineaRecepcion {
  nombre_producto: string;
  cantidad_esperada: number;
  cantidad_recibida: string;
}

interface FotoProducto {
  preview: string;
  base64: string;
  mimeType: string;
  nombre: string;
}

export default function ConfirmarRecepcionPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando…</p>
      </div>
    }>
      <ConfirmarRecepcionContenido id={params.id} />
    </Suspense>
  );
}

function ConfirmarRecepcionContenido({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const codigoDesdeQuery = searchParams.get('codigo_almacen');
  const [verificandoQuery, setVerificandoQuery] = useState(!!codigoDesdeQuery);
  const [sesion, setSesion] = useState<{ codigo: string; nombre: string } | null>(null);

  useEffect(() => {
    if (!codigoDesdeQuery) return;
    validarAlmacen(codigoDesdeQuery)
      .then((r) => { if (r.valido && r.nombre && r.codigo) setSesion({ codigo: r.codigo, nombre: r.nombre }); })
      .finally(() => setVerificandoQuery(false));
  }, [codigoDesdeQuery]);

  if (verificandoQuery) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Verificando acceso…</p></div>;
  if (sesion) return <FormularioRecepcion id={id} codigoAlmacen={sesion.codigo} nombreAlmacen={sesion.nombre} />;
  return (
    <AccesoAlmacen titulo="Confirmar recepción" descripcion="Ingresa tu código de acceso de almacén.">
      {({ codigoAlmacen, nombreAlmacen }) => <FormularioRecepcion id={id} codigoAlmacen={codigoAlmacen} nombreAlmacen={nombreAlmacen} />}
    </AccesoAlmacen>
  );
}

function FormularioRecepcion({ id, codigoAlmacen, nombreAlmacen }: { id: string; codigoAlmacen: string; nombreAlmacen: string }) {
  const [ficha, setFicha] = useState<FichaPendiente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [lineas, setLineas] = useState<LineaRecepcion[]>([]);
  const [guiaRemision, setGuiaRemision] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotosPorProducto, setFotosPorProducto] = useState<{ [nombre_producto: string]: FotoProducto }>({});
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [subiendo, setSubiendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [recepcionConfirmada, setRecepcionConfirmada] = useState<string | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false); // 👈 NUEVO
  const inputFotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    obtenerFichaParaRecepcion(id)
      .then((f) => {
        setFicha(f);
        setLineas(f.detalle.map((d) => ({ nombre_producto: d.nombre_producto, cantidad_esperada: Number(d.cantidad_esperada), cantidad_recibida: String(d.cantidad_esperada) })));
      })
      .catch((err) => setErrorCarga(err instanceof Error ? err.message : 'Error cargando ficha.'))
      .finally(() => setCargando(false));
  }, [id]);

  function actualizarLinea(index: number, cantidad: string) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, cantidad_recibida: cantidad } : l)));
  }

  function manejarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo || !productoSeleccionado) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setFotosPorProducto((prev) => ({ ...prev, [productoSeleccionado]: { preview: dataUrl, base64: dataUrl.split(',')[1], mimeType: archivo.type, nombre: `recepcion_${id}_${productoSeleccionado.replace(/\s+/g, '_')}_${Date.now()}.${archivo.type.split('/')[1]}` } }));
    };
    reader.readAsDataURL(archivo);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  function eliminarFoto(nombre_producto: string) {
    setFotosPorProducto((prev) => { const next = { ...prev }; delete next[nombre_producto]; return next; });
  }

  function validar(): string[] {
    const errs: string[] = [];
    if (!guiaRemision.trim()) errs.push('El número de guía de remisión es obligatorio.');
    if (Object.keys(fotosPorProducto).length === 0) errs.push('Debe adjuntar al menos una foto de evidencia.');
    lineas.forEach((l, i) => { const cant = Number(l.cantidad_recibida); if (!l.cantidad_recibida || isNaN(cant) || cant < 0) errs.push(`Línea ${i + 1}: la cantidad recibida debe ser 0 o mayor.`); });
    return errs;
  }

  // 👇 NUEVO — validar primero, luego mostrar modal
  function solicitarConfirmacion() {
    const errs = validar();
    setErrores(errs);
    if (errs.length > 0) return;
    setMostrarModal(true);
  }

  async function manejarConfirmar() {
    setMostrarModal(false);
    setSubiendo(true);
    let urlsFotosPorProducto: { nombre_producto: string; url: string }[] = [];
    try {
      urlsFotosPorProducto = await Promise.all(
        Object.entries(fotosPorProducto).map(async ([nombre_producto, foto]) => {
          const url = await subirFotoRecepcion(id, ficha!.cabecera.codigo_campaña, foto.base64, foto.mimeType, foto.nombre);
          return { nombre_producto, url };
        })
      );
    } catch (err) {
      setErrores(['Error al subir las fotos: ' + (err instanceof Error ? err.message : 'Error desconocido.')]);
      setSubiendo(false);
      return;
    }
    setSubiendo(false);
    setConfirmando(true);
    try {
      const resultado = await confirmarRecepcion({
        id_ficha: id, codigo_almacen: codigoAlmacen, num_guia_remision: guiaRemision.trim(),
        urls_fotos: urlsFotosPorProducto.map((f) => f.url), urls_fotos_por_producto: urlsFotosPorProducto,
        observaciones: observaciones.trim(),
        lineas: lineas.map((l) => ({ nombre_producto: l.nombre_producto, cantidad_esperada: l.cantidad_esperada, cantidad_recibida: Number(l.cantidad_recibida) })),
      });
      setRecepcionConfirmada(resultado.id_recepcion);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error al confirmar recepción.']);
    } finally {
      setConfirmando(false);
    }
  }

  if (cargando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Cargando ficha…</p></div>;
  if (errorCarga || !ficha) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <p className="text-sm text-red-600 mb-4">{errorCarga}</p>
        <Link href={`/recepcion?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`} className="text-xs text-gray-400 hover:text-blue-700">← Volver a fichas pendientes</Link>
      </div>
    </div>
  );

  if (recepcionConfirmada) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">✅</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Recepción confirmada</h1>
        <p className="text-sm text-gray-500 mb-2"><strong>{recepcionConfirmada}</strong></p>
        <p className="text-sm text-gray-500 mb-6">Ficha <strong>{id}</strong> · Campaña <strong>{ficha.cabecera.codigo_campaña}</strong></p>
        <Link href={`/recepcion?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`} className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">Ver otras fichas pendientes</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href={`/recepcion?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`} className="text-white/80 hover:text-white text-sm">← Fichas pendientes</Link>
          <span className="text-white/80 text-sm">{nombreAlmacen}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Confirmar recepción</h1>
        <p className="text-sm text-gray-500 mb-6">{ficha.cabecera.id_ficha} · {ficha.cabecera.codigo_campaña} · {ficha.cabecera.cliente}</p>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">{errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}</ul>
          </div>
        )}

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-4">Cantidades recibidas</p>
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 mb-2 px-1">
            <span className="text-xs text-gray-400">Producto</span>
            <span className="text-xs text-gray-400 text-center">Esperado</span>
            <span className="text-xs text-gray-400 text-center">Recibido</span>
          </div>
          <div className="space-y-2">
            {lineas.map((linea, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr] gap-2 items-center">
                <p className="text-sm text-gray-900">{linea.nombre_producto}</p>
                <p className="text-sm text-gray-400 text-center">{linea.cantidad_esperada}</p>
                <input type="number" min="0" value={linea.cantidad_recibida} onChange={(e) => actualizarLinea(i, e.target.value)}
                  className={'w-full h-9 rounded-lg border px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ' + (Number(linea.cantidad_recibida) < linea.cantidad_esperada ? 'border-amber-300 bg-amber-50' : 'border-gray-200')} />
              </div>
            ))}
          </div>
          {lineas.some((l) => Number(l.cantidad_recibida) < l.cantidad_esperada) && (
            <p className="text-xs text-amber-600 mt-3">⚠️ Algunas cantidades son menores a las esperadas — quedará registrada la diferencia.</p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-4">Datos de la recepción</p>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">N° de guía de remisión <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Ej: 001-000123" value={guiaRemision} onChange={(e) => setGuiaRemision(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Observaciones (opcional)</label>
              <input type="text" placeholder="Ej: Algunos empaques con golpes leves" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-1">Fotos por producto <span className="text-red-500">*</span></p>
          <p className="text-xs text-gray-400 mb-4">Toca 📷 en cada producto para adjuntar su foto de evidencia</p>
          <div className="space-y-3">
            {lineas.map((linea) => {
              const foto = fotosPorProducto[linea.nombre_producto];
              return (
                <div key={linea.nombre_producto} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{linea.nombre_producto}</p>
                    {foto && <p className="text-xs text-green-600 mt-0.5">✓ Foto adjunta</p>}
                  </div>
                  {foto ? (
                    <div className="relative shrink-0">
                      <img src={foto.preview} alt={linea.nombre_producto} className="w-16 h-16 object-cover rounded-lg" />
                      <button type="button" onClick={() => eliminarFoto(linea.nombre_producto)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setProductoSeleccionado(linea.nombre_producto); inputFotoRef.current?.click(); }} className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors">📷 Foto</button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-4">{Object.keys(fotosPorProducto).length} de {lineas.length} productos con foto</p>
          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" onChange={manejarFoto} className="hidden" />
        </section>

        <div className="flex justify-end">
          <button onClick={solicitarConfirmacion} disabled={subiendo || confirmando}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            {subiendo ? 'Subiendo fotos…' : confirmando ? 'Confirmando…' : 'Confirmar recepción'}
          </button>
        </div>
      </main>

      {/* Modal confirmación */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-scale-in">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">¿Confirmar recepción?</h2>
            <p className="text-sm text-gray-500 mb-1">Ficha <strong>{id}</strong></p>
            <p className="text-sm text-gray-500 mb-6">Esta acción es irreversible — la ficha quedará marcada como recibida.</p>
            <div className="flex gap-3">
              <button onClick={() => setMostrarModal(false)} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={manejarConfirmar} className="flex-1 h-10 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-colors">Sí, confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
