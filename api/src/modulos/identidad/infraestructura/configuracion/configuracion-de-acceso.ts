import { Celular } from '../../dominio/index.js';

type Entorno = Readonly<Record<string, string | undefined>>;

export interface ConfiguracionDeWhatsApp {
  readonly token: string;
  readonly idDelNumero: string;
  readonly plantilla: string;
  readonly idioma: string;
}

export interface ConfiguracionDeAcceso {
  /** Clave del HMAC de los códigos. Sin ella se usa una al azar por proceso (los códigos pendientes mueren al reiniciar). */
  readonly secretoDeCodigos: string | null;
  readonly whatsapp: ConfiguracionDeWhatsApp | null;
  /** Celular (E.164) → código fijo. Solo con CONTA_ENTORNO=pruebas: no se envía nada a esos números. */
  readonly celularesDePrueba: ReadonlyMap<string, string>;
  /** Tope de mensajes por hora para todo CONTA: corta el bombeo de mensajes aunque esquive los otros límites. */
  readonly enviosPorHora: number;
}

const LARGO_MINIMO_DEL_SECRETO = 32;

/**
 * Lee la configuración del acceso desde el entorno (Docs/despliegue/entorno-de-pruebas.md). Falla al arrancar si
 * algo es inseguro: un secreto corto o celulares de prueba fuera del entorno de pruebas, que serían una puerta trasera.
 */
export function configuracionDeAcceso(env: Entorno = process.env): ConfiguracionDeAcceso {
  const secreto = env['SECRETO_CODIGOS_ACCESO']?.trim() || null;
  if (secreto && secreto.length < LARGO_MINIMO_DEL_SECRETO) {
    throw new Error(`SECRETO_CODIGOS_ACCESO debe tener al menos ${LARGO_MINIMO_DEL_SECRETO} caracteres`);
  }
  return {
    secretoDeCodigos: secreto,
    whatsapp: whatsappDe(env),
    celularesDePrueba: celularesDePruebaDe(env),
    enviosPorHora: Number.parseInt(env['ACCESO_ENVIOS_POR_HORA'] ?? '', 10) || 200,
  };
}

function whatsappDe(env: Entorno): ConfiguracionDeWhatsApp | null {
  const token = env['WHATSAPP_TOKEN']?.trim();
  const idDelNumero = env['WHATSAPP_ID_NUMERO']?.trim();
  if (!token || !idDelNumero) return null;
  if (!/^\d+$/.test(idDelNumero)) throw new Error('WHATSAPP_ID_NUMERO debe ser el id numérico del número en Meta');
  return {
    token,
    idDelNumero,
    plantilla: env['WHATSAPP_PLANTILLA_CODIGO']?.trim() || 'codigo_de_acceso',
    idioma: env['WHATSAPP_IDIOMA']?.trim() || 'es',
  };
}

function celularesDePruebaDe(env: Entorno): ReadonlyMap<string, string> {
  const texto = env['CELULARES_DE_PRUEBA']?.trim();
  if (!texto) return new Map();
  if (env['CONTA_ENTORNO'] !== 'pruebas') {
    throw new Error('CELULARES_DE_PRUEBA solo se admite con CONTA_ENTORNO=pruebas: en producción sería una puerta trasera');
  }
  return new Map(
    texto.split(',').map((par) => {
      const [numero = '', codigo = ''] = par.split(':').map((p) => p.trim());
      if (!/^\d{6}$/.test(codigo)) throw new Error('CELULARES_DE_PRUEBA: cada código de prueba lleva 6 dígitos');
      return [Celular.de(numero).e164, codigo] as const;
    }),
  );
}
