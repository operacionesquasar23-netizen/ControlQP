// app/despacho/[id]/page.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  validarAlmacen,
  obtenerSolpedParaDespacho,
  obtenerEstadoTiendasSolped,
  subirFotoDespacho,
  confirmarDespachoTienda,
  formatearFecha,
  type SolpedVigente,
  type TiendaDespacho,
  type LineaDespachoTienda,
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
  if (sesion) return <PantallaDespacho id={id} codigoAlmacen={sesion.codigo} nombreAlmacen={sesion.nombre} />;
  return (
    <AccesoAlmacen titulo="Confirmar despacho" descripcion="Ingresa tu código de acceso de almacén.">
      {({ codigoAlmacen, nombreAlmacen }) => <PantallaDespacho id={id} codigoAlmacen={codigoAlmacen} nombreAlmacen={nombreAlmacen} />}
    </AccesoAlmacen>
  );
}

function PantallaDespacho({ id, codigoAlmacen, nombreAlmacen }: { id: string; codigoAlmacen: string; nombreAlmacen: string }) {
  const [solped, setSolped] = useState<SolpedVigente | null>(null);
  const [tiendas, setTiendas] = useState<TiendaDespacho[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [busquedaTienda, setBusquedaTienda] = useState('');
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<TiendaDespacho | null>(null);

  async function cargarDatos() {
    setCargando(true);
    try {
      const [s, t] = await Promise.all([obtenerSolpedParaDespacho(id), obtenerEstadoTiendasSolped(id)]);
      setSolped(s);
      setTiendas(t);
    } catch (err) {
      setErrorCarga(err instanceof Error ? err.message : 'Error cargando SOLPED.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarDatos(); }, [id]);

  if (cargando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-gray-400">Cargando SOLPED…</p></div>;
  if (errorCarga || !solped) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <p className="text-sm text-red-600 mb-4">{errorCarga}</p>
        <Link href={`/despacho?codigo_almacen=${encodeURIComponent(codigoAlmacen)}`} className="text-xs text-gray-400 hover:text-blue-700">← Volver a SOLPEDs</Link>
      </div>
    </div>
  );

  if (tiendaSeleccionada) {
    return (
      <FormularioTienda
        id={id}
        solped={solped}
        codigoAlmacen={codigoAlmacen}
        nombreAlmacen={nombreAlmacen}
        tienda={tiendaSeleccionada}
        onVolver={() => setTiendaSeleccionada(null)}
        onConfirmado={() => { setTiendaSeleccionada(null); cargarDatos(); }}
      />
    );
  }

  const tiendasFiltradas = tiendas.filter((t) => t.nombre_lugar.toLowerCase().includes(busquedaTienda.trim().toLowerCase()));
  const totalTiendas = tiendas.length;
  const tiendasDespachadas = tiendas.filter((t) => t.estado === 'despachado').length;
  const todasDespachadas = totalTiendas > 0 && tiendasDespachadas === totalTiendas;

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
        <p className="text-sm text-gray-500 mb-1">{solped.cabecera.id_solped} · v{solped.cabecera.version} · {solped.cabecera.cliente} · {solped.cabecera.codigo_campaña}</p>
        <p className="text-sm text-gray-500 mb-6">
          <span className={todasDespachadas ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>
            {tiendasDespachadas} / {totalTiendas} tiendas despachadas
          </span>
        </p>

        {todasDespachadas ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mb-6">
            <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-3xl mb-4 mx-auto">✅</div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Todas las tiendas ya fueron despachadas</p>
            <p className="text-xs text-gray-400">Esta SOLPED quedó completamente atendida.</p>
          </div>
        ) : (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar tienda…"
              value={busquedaTienda}
              onChange={(e) => setBusquedaTienda(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="space-y-2">
          {tiendasFiltradas.length === 0 && !todasDespachadas && (
            <p className="text-sm text-gray-400 text-center py-4">No se encontró ninguna tienda con ese nombre.</p>
          )}
          {tiendasFiltradas.map((t) => (
            <button
              key={t.nombre_lugar}
              type="button"
              disabled={t.estado === 'despachado'}
              onClick={() => setTiendaSeleccionada(t)}
              className={`w-full flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors ${
                t.estado === 'despachado'
                  ? 'bg-gray-50 border-gray-100 cursor-default'
                  : 'bg-white border-gray-100 shadow-sm hover:border-blue-300'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{t.nombre_lugar}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.lineas.length} producto{t.lineas.length !== 1 ? 's' : ''}</p>
              </div>
              {t.estado === 'despachado' ? (
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg">✅ Despachado{t.fecha_despacho ? ` · ${formatearFecha(t.fecha_despacho)}` : ''}</span>
              ) : (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">Pendiente</span>
              )}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function FormularioTienda({
  id, solped, codigoAlmacen, nombreAlmacen, tienda, onVolver, onConfirmado,
}: {
  id: string;
  solped: SolpedVigente;
  codigoAlmacen: string;
  nombreAlmacen: string;
  tienda: TiendaDespacho;
  onVolver: () => void;
  onConfirmado: () => void;
}) {
  const [cantidades, setCantidades] = useState<Record<string, number>>(
    () => Object.fromEntries(tienda.lineas.map((l) => [l.nombre_producto, l.cantidad_solicitada]))
  );
  const [observaciones, setObservaciones] = useState('');
  const [foto, setFoto] = useState<{ preview: string; base64: string; mimeType: string; nombre: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  function manejarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setFoto({ preview: dataUrl, base64: dataUrl.split(',')[1], mimeType: archivo.type, nombre: `despacho_${id}_${tienda.nombre_lugar.replace(/\s+/g, '')}_${Date.now()}.${archivo.type.split('/')[1]}` });
    };
    reader.readAsDataURL(archivo);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  function cambiarCantidad(nombreProducto: string, valor: string, maximo: number) {
    let n = Number(valor);
    if (Number.isNaN(n) || n < 0) n = 0;
    if (n > maximo) n = maximo; // bloqueo: no se puede superar lo solicitado
    setCantidades((prev) => ({ ...prev, [nombreProducto]: n }));
  }

  function validar(): string[] {
    const errs: string[] = [];
    if (!foto) errs.push('La foto del despacho de esta tienda es obligatoria.');
    for (const l of tienda.lineas) {
      const cant = cantidades[l.nombre_producto] ?? 0;
      if (cant > l.cantidad_solicitada) errs.push(`"${l.nombre_producto}" supera lo solicitado (${l.cantidad_solicitada}).`);
    }
    return errs;
  }

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
      urlFoto = await subirFotoDespacho(id, solped.cabecera.codigo_campaña, foto!.base64, foto!.mimeType, foto!.nombre);
    } catch (err) {
      setErrores(['Error al subir la foto: ' + (err instanceof Error ? err.message : 'Error desconocido.')]);
      setSubiendo(false);
      return;
    }
    setSubiendo(false);
    setConfirmando(true);
    try {
      const lineas: LineaDespachoTienda[] = tienda.lineas.map((l) => ({
        nombre_producto     : l.nombre_producto,
        cantidad_solicitada : l.cantidad_solicitada,
        cantidad_despachada : cantidades[l.nombre_producto] ?? 0,
      }));
      await confirmarDespachoTienda({
        id_solped     : id,
        codigo_almacen: codigoAlmacen,
        nombre_lugar  : tienda.nombre_lugar,
        url_foto      : urlFoto,
        observaciones : observaciones.trim(),
        lineas,
      });
      onConfirmado();
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'Error al confirmar despacho.']);
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onVolver} className="text-white/80 hover:text-white text-sm">← Tiendas</button>
          <span className="text-white/80 text-sm">{nombreAlmacen}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{tienda.nombre_lugar}</h1>
        <p className="text-sm text-gray-500 mb-6">{solped.cabecera.id_solped} · {solped.cabecera.cliente} · {solped.cabecera.codigo_campaña}</p>

        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-800">
            <ul className="list-disc pl-5 space-y-0.5">{errores.map((e, i) => <li key={i} className="text-sm">{e}</li>)}</ul>
          </div>
        )}

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Cantidad real a despachar</p>
          <p className="text-xs text-gray-400 mb-4">Editable — no puede superar lo solicitado en la SOLPED.</p>
          <div className="space-y-3">
            {tienda.lineas.map((l) => (
              <div key={l.nombre_producto} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-900">{l.nombre_producto}</p>
                  <p className="text-xs text-gray-400">Solicitado: {l.cantidad_solicitada}</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={l.cantidad_solicitada}
                  value={cantidades[l.nombre_producto] ?? 0}
                  onChange={(e) => cambiarCantidad(l.nombre_producto, e.target.value, l.cantidad_solicitada)}
                  className="w-24 h-9 rounded-lg border border-gray-200 px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
              <p className="text-sm font-semibold text-gray-900">Foto del despacho de esta tienda <span className="text-red-500">*</span></p>
              <p className="text-xs text-gray-400 mt-0.5">Una foto de lo entregado a {tienda.nombre_lugar}</p>
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

        <div className="flex justify-end gap-3">
          <button onClick={onVolver} disabled={subiendo || confirmando} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={solicitarConfirmacion} disabled={subiendo || confirmando}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            {subiendo ? 'Subiendo foto…' : confirmando ? 'Confirmando…' : `Confirmar despacho de ${tienda.nombre_lugar}`}
          </button>
        </div>
      </main>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-scale-in">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">¿Confirmar despacho?</h2>
            <p className="text-sm text-gray-500 mb-1">{tienda.nombre_lugar} · SOLPED {id}</p>
            <p className="text-sm text-gray-500 mb-6">Esta acción es irreversible para esta tienda. Podrás seguir despachando las demás tiendas por separado.</p>
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
