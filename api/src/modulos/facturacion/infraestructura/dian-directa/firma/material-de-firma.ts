import type { KeyObject, X509Certificate } from 'node:crypto';

/** Un atributo del nombre del emisor del certificado, en el orden en que viene en el certificado. */
export interface AtributoDeNombre {
  /** Nombre corto (CN, O, C...) o, si no lo tiene, el OID en notación de puntos. */
  readonly tipo: string;
  readonly valor: string;
}

/**
 * Lo que sale de abrir el .p12, ya en tipos de node:crypto. La llave es un KeyObject: no se puede leer
 * con JSON ni con util.inspect, y nunca se convierte a PEM ni se escribe en disco.
 */
export interface MaterialDeFirma {
  readonly llave: KeyObject;
  readonly certificado: X509Certificate;
  /** Certificados intermedios que venían en el .p12 (pueden ser ninguno). */
  readonly cadena: readonly X509Certificate[];
  readonly emisor: readonly AtributoDeNombre[];
  /** Key Usage del certificado; null si no trae la extensión. */
  readonly usos: {
    readonly firmaDigital: boolean;
    readonly noRepudio: boolean;
  } | null;
}
