import { ErrorDominio, Identificacion, Nit, textoLimpio } from '../../../../compartido/dominio/index.js';
import { participante, type Participante } from '../objetos-valor/participante.js';

/** Responsabilidades del RUT (casilla 53) que acepta la factura; las mismas que la tabla datos_fiscales. */
export const RESPONSABILIDADES_DEL_FACTURADOR = ['O-13', 'O-15', 'O-23', 'O-47', 'R-99-PN'] as const;

/** Códigos DANE de los 32 departamentos y Bogotá: los dos primeros dígitos de un municipio real. */
const DEPARTAMENTOS_DANE = new Set([
  '05', '08', '11', '13', '15', '17', '18', '19', '20', '23', '25', '27', '41', '44', '47', '50', '52',
  '54', '63', '66', '68', '70', '73', '76', '81', '85', '86', '88', '91', '94', '95', '97', '99',
]);

/**
 * NIT genéricos que la DIAN reserva para el comprador (consumidor final, extranjeros sin NIT): nunca son de quien
 * factura (hallazgo M2). Un NIT de facturador tiene de 5 a 10 dígitos (NIT de empresa o cédula de persona).
 */
function exigirNitDeFacturador(numero: string): void {
  if (numero.length < 5 || numero.length > 10 || /^2{5,}$/.test(numero) || numero.startsWith('444444')) {
    throw new ErrorDominio('configuracion.nit-generico', 'Ese NIT no es el de un facturador: escribe el NIT de tu RUT');
  }
}

export interface DatosFiscalesEscritos {
  /** Sin puntos ni dígito de verificación. */
  readonly nit: string;
  /** Si el dueño lo escribe, debe ser el que corresponde al NIT: así se detecta un NIT mal copiado. */
  readonly digitoVerificacion: number | null;
  readonly razonSocial: string;
  readonly tipoDePersona: 'juridica' | 'natural';
  readonly responsabilidadesFiscales: readonly string[];
  readonly responsableDeIva: boolean;
  readonly direccion: { codigoMunicipio: string; ciudad: string; departamento: string; linea: string };
  readonly correo: string | null;
}

/**
 * HU-07.04: los datos del facturador como van en la factura, revisados antes de guardarse. Usa las mismas reglas que
 * el emisor de la factura (participante) y además las de la tabla: responsabilidades conocidas, sin repetir, hasta 4, y
 * un municipio real (el código DANE no termina en 000). Los textos se limpian de caracteres invisibles (van al XML).
 */
export function datosFiscalesDelFacturador(d: DatosFiscalesEscritos): Participante {
  const nit = Nit.de(d.nit);
  exigirNitDeFacturador(nit.numero);
  if (d.digitoVerificacion !== null && d.digitoVerificacion !== nit.digitoVerificacion) {
    throw new ErrorDominio('configuracion.digito-no-coincide', 'El dígito de verificación no corresponde a ese NIT');
  }
  const responsabilidades = [...new Set(d.responsabilidadesFiscales)];
  if (
    responsabilidades.length > 4 ||
    !responsabilidades.every((r) => (RESPONSABILIDADES_DEL_FACTURADOR as readonly string[]).includes(r))
  ) {
    throw new ErrorDominio('configuracion.responsabilidad-invalida', 'Elige de 1 a 4 responsabilidades del RUT: O-13, O-15, O-23, O-47 o R-99-PN');
  }
  if (responsabilidades.includes('R-99-PN') && responsabilidades.length > 1) {
    throw new ErrorDominio('configuracion.responsabilidad-invalida', 'R-99-PN (no responsable) no va junto con otras responsabilidades');
  }
  const municipio = d.direccion.codigoMunicipio;
  if (!/^\d{5}$/.test(municipio) || !DEPARTAMENTOS_DANE.has(municipio.slice(0, 2))) {
    throw new ErrorDominio('factura.direccion-invalida', 'El código DANE del municipio no existe: son 5 números, como 11001 para Bogotá');
  }
  if (municipio.endsWith('000')) {
    throw new ErrorDominio('factura.direccion-invalida', 'El código DANE es el de un municipio, no el de un departamento');
  }
  const limpio = (texto: string, largo: number, campo: string): string => {
    const t = textoLimpio(texto);
    if (t.length === 0 || t.length > largo) throw new ErrorDominio('configuracion.texto-invalido', `Revisa ${campo}`);
    return t;
  };
  return participante({
    identificacion: Identificacion.nit(nit),
    razonSocial: limpio(d.razonSocial, 450, 'la razón social'),
    tipoDePersona: d.tipoDePersona,
    responsabilidadesFiscales: responsabilidades,
    responsableDeIva: d.responsableDeIva,
    direccion: {
      codigoMunicipio: d.direccion.codigoMunicipio,
      ciudad: limpio(d.direccion.ciudad, 200, 'la ciudad'),
      departamento: limpio(d.direccion.departamento, 200, 'el departamento'),
      linea: limpio(d.direccion.linea, 200, 'la dirección'),
    },
    correo: d.correo === null ? null : limpioCorreo(d.correo),
  });
}

function limpioCorreo(correo: string): string {
  const c = correo.trim();
  if (c.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(c)) {
    throw new ErrorDominio('factura.correo-invalido', 'El correo no es válido');
  }
  return c;
}
