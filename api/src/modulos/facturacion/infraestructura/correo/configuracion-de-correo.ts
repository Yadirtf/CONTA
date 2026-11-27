/** Configuración del proveedor de correo, desde el entorno. La llave nunca se muestra en JSON ni en logs. */
export interface ConfiguracionDeCorreo {
  readonly llave: string;
  /** Dirección verificada en el proveedor desde la que sale el correo (por ejemplo facturas@tu-dominio.co). */
  readonly remitente: string;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * CORREO_BREVO_LLAVE y CORREO_REMITENTE. Sin las dos, no hay proveedor: los correos esperan en su cola hasta que se
 * configure (cada intento queda registrado como «correo.sin-configurar»).
 */
export function configuracionDeCorreoDesde(entorno: NodeJS.ProcessEnv): ConfiguracionDeCorreo | null {
  const llave = entorno.CORREO_BREVO_LLAVE?.trim();
  const remitente = entorno.CORREO_REMITENTE?.trim();
  if (!llave || !remitente || !CORREO.test(remitente)) return null;
  return { llave, remitente };
}
