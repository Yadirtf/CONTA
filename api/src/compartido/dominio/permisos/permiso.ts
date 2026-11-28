/**
 * Acciones que se autorizan una por una (HU-04.03, ADR-0012). Un endpoint o caso de uso pide un permiso,
 * nunca un rol: así, agregar un rol solo toca la matriz de permisos-por-rol.ts.
 */
export const Permiso = {
  /** Ver los datos de la empresa en la que trabaja. */
  VerEmpresa: 'ver-empresa',
  /** Emitir facturas y documentos POS. */
  Vender: 'vender',
  /**
   * Crear productos con su precio y su IVA (HU-05.02). Aparte de Vender: quien fija el precio y marca un
   * producto como excluido decide cuánto IVA se cobra, y eso no lo hace el cajero.
   */
  GestionarProductos: 'gestionar-productos',
  /** Abrir informes (ganancias, balance, estado de resultados). */
  VerInformes: 'ver-informes',
  /** Anular documentos (nota crédito sobre un documento ya enviado a la DIAN). */
  AnularDocumentos: 'anular-documentos',
  /** Invitar, cambiar el rol o el modo y retirar a las personas de la empresa. */
  GestionarMiembros: 'gestionar-miembros',
  /**
   * Cargar los datos que pide la DIAN para facturar: datos fiscales, resoluciones, software y su PIN (HU-07.04).
   * Solo el dueño: quien cambia el PIN o la resolución decide a nombre de quién y con qué números se factura.
   */
  ConfigurarFacturacion: 'configurar-facturacion',
  /** Trabajar en modo contador. Solo habilita la interfaz técnica: no abre ningún otro permiso. */
  UsarModoContador: 'usar-modo-contador',
} as const;

export type Permiso = (typeof Permiso)[keyof typeof Permiso];
