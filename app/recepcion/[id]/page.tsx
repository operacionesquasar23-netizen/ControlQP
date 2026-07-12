// app/recepcion/[id]/page.tsx
//
// Confirmación de recepción de una ficha específica.
// Almacén ingresa cantidades reales recibidas (puede diferir de lo
// esperado), número de guía de remisión, y sube foto(s) como evidencia.

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
      .then((r) => {
        if (r.valido && r.nombre && r.codigo) setSesion({ codigo: r.codigo, nombre: r.nombre });
      })
      .finally(() => setVerificandoQuery(false));
  }, [codigoDesdeQuery]);

  if (verificandoQuery) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Verificando acceso…</p>
      </div>
    );
  }

  if (sesion) {
    return <FormularioRecepcion id={id} codigoAlmacen={sesion.codigo} nombreAlmacen={sesion.nombre} />;
  }

  return (
    <AccesoAlmacen titulo="Confirmar recepción" descripcion="Ingresa tu código de acceso de almacén.">
      {({ codigoAlmacen, nombreAlmacen }) => (
        <FormularioRecepcion id={id} codigoAlmacen={codigoAlmacen} nombreAlmacen={nombreAlmacen} />
      )}
    </AccesoAlmacen>
  );
}

function FormularioRecepcion({
  id,
  codigoAlmacen,
  nombreAlmacen,
}: {
  id: string;
  codigoAlmacen: string;
  nombreAlmacen: string;
}) {
  const [ficha, setFicha] = useState<FichaPendiente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [lineas, setLineas] = useState<LineaRecepcion[]>([]);
  const [guiaRemision, setGuiaRemision] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState<{ preview: string; base64: string; mimeType: string; nombre: string }[]>([]);

  const [subiendo, setSubiendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [recepcionConfirmada, setRecepcionConfirmada] = useState<string | null>(null);

  const inputFotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    obtenerFichaParaRecepcion(id)
      .then((f) => {
        setFicha(f);
        setLineas(f.detalle.map((d) => ({
          nombre_producto: d.nombre_producto,
          cantidad_esperada: Number(d.cantidad_esperada),
          cantidad_recibida: String(d.cantidad_esperada), // pre-rellena con lo esperado
        })));
      })
      .catch((err) => setErrorCarga(err instanceof Error ? err.message : 'Error cargando ficha.'))
      .finally(() => setCargando(false));
  }, [id]);

  function actualizarLinea(index: number, cantidad: string) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, cantidad_recibida: cantidad } : l)));
  }

  async function manejarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    if (archivos.length === 0) return;

    for (const archivo of archivos) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        setFotos((prev) => [...prev, {
          preview: dataUrl,
          base64,
          mimeType: archivo.type,
          nombre: `recepcion_${id}_${Date.now()}.${archivo.type.split('/')[1]}`
        }]);
      };
      reader.readAsDataURL(archivo);
    }
    // Reset input para permitir seleccionar la misma foto de nuevo
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  function eliminarFoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  function validar(): string[] {
    const errs: string[] = [];
    if (!guiaRemision.trim()) errs.push('El número de guía de remisión es obligatorio.');
    if (fotos.length === 0) errs.push('Debe adjuntar al menos una foto de la recepción.');
    lineas.forEach((l, i) => {
      const cant = Number(l.cantidad_recibida);
      if (!l.cantidad_recibida || isNaN(cant) || cant < 0) {
        errs.push(`Línea ${i + 1}: la cantidad recibida debe ser 0 o mayor.`);
      }
    });
    return errs;
  }

  async function manejarConfirmar() {
    const errs = validar();
    setErrores(errs);
    if (errs.length > 0) return;

    setSubiendo(true);
    let urlsFotos: string[] = [];
    try {
      // Sube las fotos primero
      urlsFotos = await Promise.all(
        fotos.map((foto) =>
          subirFotoRecepcion(
            id,
            ficha!.cabecera.codigo_campaña,
            foto.base64,
            foto.mimeType,
            foto.nombre
          )
        )
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
        id_ficha: id,
        codigo_almacen: codigoAlmacen,
        num_guia_remision: guiaRemision.trim(),
        urls_fotos: urlsFotos,
        observaciones: observaciones.trim(),
        lineas: lineas.map((l) => ({
          nombre_producto: l.nombre_producto,
          cantidad_esperada: l.cantidad_esperada,
          cantidad_recibida: Number(l.cantidad_recibida),
        })),
      });
      setRecepcionConfirmada(resultado.id_recepcion);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error al confirmar recepción.']);
    } finally {
      setConfirmando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando ficha…</p>
      </div>
    );
  }

  if (errorCarga || !ficha) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-sm text-red-600 mb-4">{errorCarga}</p>
          <Link href={`/recepcion?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`}
            className="text-xs text-gray-400 hover:text-blue-700">← Volver a fichas pendientes</Link>
        </div>
      </div>
    );
  }

  if (recepcionConfirmada) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Recepción confirmada</h1>
          <p className="text-sm text-gray-500 mb-2">
            <strong>{recepcionConfirmada}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Ficha <strong>{id}</strong> · Campaña <strong>{ficha.cabecera.codigo_campaña}</strong>
          </p>
          <Link
            href={`/recepcion?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Ver otras fichas pendientes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/recepcion?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`}
              className="text-white/80 hover:text-white text-sm">← Fichas pendientes</Link>
          </div>
          <span className="text-white/80 text-sm">{nombreAlmacen}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Confirmar recepción</h1>
        <p className="text-sm text-gray-500 mb-6">
          {ficha.cabecera.id_ficha} · {ficha.cabecera.codigo_campaña} · {ficha.cabecera.cliente}
        </p>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">
              {errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}
            </ul>
          </div>
        )}

        {/* Cantidades recibidas */}
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
                <input
                  type="number"
                  min="0"
                  value={linea.cantidad_recibida}
                  onChange={(e) => actualizarLinea(i, e.target.value)}
                  className={
                    'w-full h-9 rounded-lg border px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
                    (Number(linea.cantidad_recibida) < linea.cantidad_esperada
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-gray-200')
                  }
                />
              </div>
            ))}
          </div>
          {lineas.some((l) => Number(l.cantidad_recibida) < l.cantidad_esperada) && (
            <p className="text-xs text-amber-600 mt-3">
              ⚠️ Algunas cantidades son menores a las esperadas — quedará registrada la diferencia.
            </p>
          )}
        </section>

        {/* Guía de remisión */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-4">Datos de la recepción</p>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">N° de guía de remisión <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Ej: 001-000123"
                value={guiaRemision}
                onChange={(e) => setGuiaRemision(e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Observaciones (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Algunos empaques con golpes leves"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Fotos */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Fotos de evidencia <span className="text-red-500">*</span></p>
              <p className="text-xs text-gray-400 mt-0.5">Mínimo 1 foto obligatoria</p>
            </div>
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              📷 Agregar foto
            </button>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={manejarFoto}
              className="hidden"
            />
          </div>

          {fotos.length === 0 && (
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors"
            >
              <p className="text-3xl mb-2">📷</p>
              <p className="text-sm text-gray-400">Toca para tomar o seleccionar una foto</p>
            </button>
          )}

          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((foto, i) => (
                <div key={i} className="relative">
                  <img
                    src={foto.preview}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => eliminarFoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center hover:border-blue-300 transition-colors"
              >
                <span className="text-2xl text-gray-300">+</span>
              </button>
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <button
            onClick={manejarConfirmar}
            disabled={subiendo || confirmando}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {subiendo ? 'Subiendo fotos…' : confirmando ? 'Confirmando…' : 'Confirmar recepción'}
          </button>
        </div>
      </main>
    </div>
  );
}
