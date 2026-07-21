// app/despacho/[id]/page.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  validarAlmacen,
  obtenerSolpedParaDespacho,
  subirFotoDespacho,
  confirmarDespacho,
  formatearFecha,
  type SolpedVigente,
} from '@/lib/api';
import AccesoAlmacen from '@/components/AccesoAlmacen';

export default function ConfirmarDespachoPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Cargando…</p></div>}>
      <ConfirmarDespachoContenido id={params.id} />
    </Suspense>
  );
}

function ConfirmarDespachoContenido({ id }: { id: string }) {
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
  if (sesion) return <FormularioDespacho id={id} codigoAlmacen={sesion.codigo} nombreAlmacen={sesion.nombre} />;
  return (
    <AccesoAlmacen titulo="Confirmar despacho" descripcion="Ingresa tu código de acceso de almacén.">
      {({ codigoAlmacen, nombreAlmacen }) => <FormularioDespacho id={id} codigoAlmacen={codigoAlmacen} nombreAlmacen={nombreAlmacen} />}
    </AccesoAlmacen>
  );
}

function FormularioDespacho({ id, codigoAlmacen, nombreAlmacen }: { id: string; codigoAlmacen: string; nombreAlmacen: string }) {
  const [solped, setSolped] = useState<SolpedVigente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [foto, setFoto] = useState<{ preview: string; base64: string; mimeType: string; nombre: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [despachoConfirmado, setDespachoConfirmado] = useState<string | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false); // 👈 NUEVO
  const inputFotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    obtenerSolpedParaDespacho(id)
      .then(setSolped)
      .catch((err) => setErrorCarga(err instanceof Error ? err.message : 'Error cargando SOLPED.'))
      .finally(() => setCargando(false));
  }, [id]);

  function manejarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setFoto({ preview: dataUrl, base64: dataUrl.split(',')[1], mimeType: archivo.type, nombre: `despacho_${id}_${Date.now()}.${archivo.type.split('/')[1]}` });
    };
    reader.readAsDataURL(archivo);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  function validar(): string[] {
    const errs: string[] = [];
    if (!foto) errs.push('La foto del despacho es obligatoria.');
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
    let urlFoto = '';
    try {
      urlFoto = await subirFotoDespacho(id, solped!.cabecera.codigo_campaña, foto!.base64, foto!.mimeType, foto!.nombre);
    } catch (err) {
      setErrores(['Error al subir la foto: ' + (err instanceof Error ? err.message : 'Error desconocido.')]);
      setSubiendo(false);
      return;
    }
    setSubiendo(false);
    setConfirmando(true);
    try {
      const resultado = await confirmarDespacho({ id_solped: id, codigo_almacen: codigoAlmacen, url_foto: urlFoto, observaciones: observaciones.trim() });
      setDespachoConfirmado(resultado.id_despacho);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error al confirmar despacho.']);
    } finally {
      setConfirmando(false);
    }
  }

  if (cargando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Cargando SOLPED…</p></div>;
  if (errorCarga || !solped) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <p className="text-sm text-red-600 mb-4">{errorCarga}</p>
        <Link href={`/despacho?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`} className="text-xs text-gray-400 hover:text-blue-700">← Volver a SOLPEDs</Link>
      </div>
    </div>
  );

  if (despachoConfirmado) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">✅</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Despacho confirmado</h1>
        <p className="text-sm text-gray-500 mb-2"><strong>{despachoConfirmado}</strong></p>
        <p className="text-sm text-gray-500 mb-6">SOLPED <strong>{id}</strong> · Campaña <strong>{solped.cabecera.codigo_campaña}</strong></p>
        <Link href={`/despacho?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`} className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">Ver otras SOLPEDs</Link>
      </div>
    </div>
  );

  const lugares = solped.detalle.reduce((acc, linea) => {
    if (!acc[linea.nombre_lugar]) acc[linea.nombre_lugar] = [];
    acc[linea.nombre_lugar].push(linea);
    return acc;
  }, {} as Record<string, typeof solped.detalle>);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href={`/despacho?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`} className="text-white/80 hover:text-white text-sm">← SOLPEDs</Link>
          <span className="text-white/80 text-sm">{nombreAlmacen}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Confirmar despacho</h1>
        <p className="text-sm text-gray-500 mb-6">{solped.cabecera.id_solped} · v{solped.cabecera.version} · {solped.cabecera.cliente} · {solped.cabecera.codigo_campaña}</p>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">{errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}</ul>
          </div>
        )}

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Detalle de la SOLPED</p>
          <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-500">
            <div><span className="text-gray-400">Fecha despacho:</span> <strong>{formatearFecha(solped.cabecera.fecha_despacho)}</strong></div>
            <div><span className="text-gray-400">Marca:</span> <strong>{solped.cabecera.marca}</strong></div>
          </div>
          <div className="space-y-4">
            {Object.entries(lugares).map(([lugar, lineas]) => (
              <div key={lugar}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{lugar}</p>
                <div className="space-y-1">
                  {lineas.map((linea, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                      <p className="text-sm text-gray-900">{linea.nombre_producto}</p>
                      <span className="text-sm font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-lg">{linea.cantidad_solicitada}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Observaciones (opcional)</p>
          <input type="text" placeholder="Ej: Entrega parcial, falta un bulto" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Foto del despacho <span className="text-red-500">*</span></p>
              <p className="text-xs text-gray-400 mt-0.5">Una foto general de los elementos a despachar</p>
            </div>
            {foto && <button type="button" onClick={() => inputFotoRef.current?.click()} className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors">📷 Cambiar</button>}
          </div>
          {!foto ? (
            <button type="button" onClick={() => inputFotoRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors">
              <p className="text-3xl mb-2">📷</p>
              <p className="text-sm text-gray-400">Toca para tomar o seleccionar una foto</p>
            </button>
          ) : (
            <div className="relative">
              <img src={foto.preview} alt="Foto despacho" className="w-full max-h-64 object-cover rounded-xl" />
              <button type="button" onClick={() => setFoto(null)} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
            </div>
          )}
          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" onChange={manejarFoto} className="hidden" />
        </section>

        <div className="flex justify-end">
          <button onClick={solicitarConfirmacion} disabled={subiendo || confirmando}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            {subiendo ? 'Subiendo foto…' : confirmando ? 'Confirmando…' : 'Confirmar despacho'}
          </button>
        </div>
      </main>

      {/* Modal confirmación */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-scale-in">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">¿Confirmar despacho?</h2>
            <p className="text-sm text-gray-500 mb-1">SOLPED <strong>{id}</strong></p>
            <p className="text-sm text-gray-500 mb-6">Esta acción es irreversible — la SOLPED quedará marcada como despachada.</p>
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
