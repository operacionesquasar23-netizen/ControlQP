// app/devolucion/[id]/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerSesion } from '@/lib/sesion';
import {
  obtenerDevolucionParaConfirmar,
  subirFotoDevolucion,
  confirmarDevolucion,
  formatearFecha,
  type DevolucionPendiente,
} from '@/lib/api';

export default function ConfirmarDevolucionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [codigoAlmacen, setCodigoAlmacen] = useState('');
  const [nombreAlmacen, setNombreAlmacen] = useState('');
  const [listo, setListo] = useState(false);

  const [devolucion, setDevolucion] = useState<DevolucionPendiente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [observaciones, setObservaciones] = useState('');
  const [foto, setFoto] = useState<{
    preview: string; base64: string; mimeType: string; nombre: string;
  } | null>(null);

  const [subiendo, setSubiendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [confirmado, setConfirmado] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const inputFotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'almacen') { router.replace('/'); return; }
    setCodigoAlmacen(sesion.codigo);
    setNombreAlmacen(sesion.nombre);
    setListo(true);
    obtenerDevolucionParaConfirmar(params.id)
      .then(setDevolucion)
      .catch((err) => setErrorCarga(err instanceof Error ? err.message : 'Error cargando devolución.'))
      .finally(() => setCargando(false));
  }, [router, params.id]);

  function manejarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setFoto({
        preview : dataUrl,
        base64  : dataUrl.split(',')[1],
        mimeType: archivo.type,
        nombre  : `devolucion_${params.id}_${Date.now()}.${archivo.type.split('/')[1]}`,
      });
    };
    reader.readAsDataURL(archivo);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  function validar(): string[] {
    const errs: string[] = [];
    if (!foto) errs.push('La foto de la devolución es obligatoria.');
    return errs;
  }

  async function manejarConfirmar() {
    const errs = validar();
    setErrores(errs);
    if (errs.length > 0) return;

    setSubiendo(true);
    let urlFoto = '';
    try {
      urlFoto = await subirFotoDevolucion(
        params.id,
        devolucion!.cabecera.codigo_campaña,
        foto!.base64,
        foto!.mimeType,
        foto!.nombre
      );
    } catch (err) {
      setErrores(['Error al subir la foto: ' + (err instanceof Error ? err.message : 'Error desconocido.')]);
      setSubiendo(false);
      return;
    }
    setSubiendo(false);

    setConfirmando(true);
    try {
      await confirmarDevolucion({
        id_devolucion : params.id,
        codigo_almacen: codigoAlmacen,
        url_foto      : urlFoto,
        observaciones : observaciones.trim(),
      });
      setConfirmado(true);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error al confirmar devolución.']);
    } finally {
      setConfirmando(false);
    }
  }

  if (!listo || cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando…</p>
      </div>
    );
  }

  if (errorCarga || !devolucion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-sm text-red-600 mb-4">{errorCarga}</p>
          <button onClick={() => router.push('/devolucion')} className="text-xs text-gray-400 hover:text-blue-700">
            ← Volver a devoluciones
          </button>
        </div>
      </div>
    );
  }

  if (confirmado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center animate-scale-in">
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Devolución confirmada</h1>
          <p className="text-sm text-gray-500 mb-2"><strong>{params.id}</strong></p>
          <p className="text-sm text-gray-500 mb-6">
            Campaña <strong>{devolucion.cabecera.codigo_campaña}</strong> · {devolucion.cabecera.cliente}
          </p>
          <button
            onClick={() => { setSaliendo(true); setTimeout(() => router.push('/almacen'), 250); }}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Agrupar por lugar
  const lugares = devolucion.detalle.reduce((acc, l) => {
    if (!acc[l.nombre_lugar]) acc[l.nombre_lugar] = [];
    acc[l.nombre_lugar].push(l);
    return acc;
  }, {} as Record<string, typeof devolucion.detalle>);

  return (
    <div className={`min-h-screen bg-slate-50 transition-opacity duration-250 ${saliendo ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-brand text-white px-6 py-5 animate-fade-slide-down">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => { setSaliendo(true); setTimeout(() => router.push('/devolucion'), 250); }}
            className="text-white/80 hover:text-white text-sm"
          >← Devoluciones</button>
          <span className="text-white/80 text-sm">{nombreAlmacen}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 animate-fade-slide-up">Confirmar devolución</h1>
        <p className="text-sm text-gray-500 mb-6 animate-fade-slide-up delay-75">
          {params.id} · {devolucion.cabecera.cliente} · {devolucion.cabecera.codigo_campaña}
        </p>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">
              {errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}
            </ul>
          </div>
        )}

        {/* Detalle */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 animate-fade-slide-up delay-75">
          <p className="text-sm font-semibold text-gray-900 mb-1">Productos a recibir</p>
          <p className="text-xs text-gray-400 mb-4">
            Solicitado el {formatearFecha(String(devolucion.cabecera.fecha_solicitud))} · Despacho {devolucion.cabecera.id_despacho}
          </p>
          <div className="space-y-5">
            {Object.entries(lugares).map(([lugar, lineas]) => (
              <div key={lugar}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{lugar}</p>
                <div className="space-y-1">
                  {lineas.map((l, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                      <p className="text-sm text-gray-900">{l.nombre_producto}</p>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-xs text-gray-400">de {l.cantidad_despachada}</span>
                        <span className="text-sm font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-lg">
                          {l.cantidad_devuelta}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Observaciones */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 animate-fade-slide-up delay-150">
          <p className="text-sm font-semibold text-gray-900 mb-3">Observaciones (opcional)</p>
          <input
            type="text"
            placeholder="Ej: Un elemento con daño leve"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </section>

        {/* Foto */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 animate-fade-slide-up delay-225">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Foto de la devolución <span className="text-red-500">*</span></p>
              <p className="text-xs text-gray-400 mt-0.5">Foto general de los elementos recibidos</p>
            </div>
            {foto && (
              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
              >📷 Cambiar</button>
            )}
          </div>

          {!foto ? (
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors"
            >
              <p className="text-3xl mb-2">📷</p>
              <p className="text-sm text-gray-400">Toca para tomar o seleccionar una foto</p>
            </button>
          ) : (
            <div className="relative">
              <img src={foto.preview} alt="Foto devolución" className="w-full max-h-64 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => setFoto(null)}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              >✕</button>
            </div>
          )}

          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" onChange={manejarFoto} className="hidden" />
        </section>

        <div className="flex justify-end">
          <button
            onClick={manejarConfirmar}
            disabled={subiendo || confirmando}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {subiendo ? <span className="animate-pulse-soft">Subiendo foto…</span>
              : confirmando ? <span className="animate-pulse-soft">Confirmando…</span>
              : 'Confirmar devolución'}
          </button>
        </div>
      </main>
    </div>
  );
}
