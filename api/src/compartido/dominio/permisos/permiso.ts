/**
 * Acciones que se autorizan una por una (HU-04.03, ADR-0012). Un endpoint o caso de uso pide un permiso,
 * nunca un rol: así, agregar un rol solo toca la matriz de permisos-por-rol.ts.
 */
export const Permiso = {
  /** Ver los datos de la empresa en la que trabaja. */
  VerEmpresa: 'ver-empresa',
  /** Emitir facturas y documentos POS. */
  Vender: 'vender',
  /** Abrir informes (ganancias, balance, estado de resultados). */
  VerInformes: 'ver-informes',
  /** Anular documentos (nota crédito sobre un documento ya enviado a la DIAN). */
  AnularDocumentos: 'anular-documentos',
  /** Invitar, cambiar el rol o el modo y retirar a las personas de la empresa. */
  GestionarMiembros: 'gestionar-miembros',
  /** Trabajar en modo contador. Solo habilita la interfaz técnica: no abre ningún otro permiso. */
  UsarModoContador: 'usar-modo-contador',
} as const;

export type Permiso = (typeof Permiso)[keyof typeof Permiso];
