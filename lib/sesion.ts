// lib/sesion.ts
// Helper para manejar la sesión del usuario en sessionStorage.
// Solo dura mientras la pestaña esté abierta.

export type RolSesion = 'comercial' | 'almacen';

export interface Sesion {
  rol: RolSesion;
  codigo: string;
  nombre: string;
}

const CLAVE = 'qp_sesion';

export function guardarSesion(sesion: Sesion): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
}

export function obtenerSesion(): Sesion | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CLAVE);
    if (!raw) return null;
    return JSON.parse(raw) as Sesion;
  } catch {
    return null;
  }
}

export function cerrarSesion(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CLAVE);
}
