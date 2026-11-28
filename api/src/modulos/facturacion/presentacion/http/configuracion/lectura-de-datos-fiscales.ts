import type { DatosFiscalesEscritos } from '../../../dominio/index.js';
import { campoInvalido, camposDe, siNo, texto, textoONulo } from './lectura-comun.js';

const MAXIMO_DE_RESPONSABILIDADES = 10;

/** Lee el cuerpo de PUT /configuracion-dian/datos-fiscales. */
export function datosFiscalesDe(cuerpo: unknown): DatosFiscalesEscritos {
  const c = camposDe(cuerpo);
  const direccion = camposDe(c['direccion']);
  const tipoDePersona = c['tipoDePersona'];
  if (tipoDePersona !== 'juridica' && tipoDePersona !== 'natural') throw campoInvalido('tipoDePersona');
  const responsabilidades = c['responsabilidadesFiscales'];
  if (
    !Array.isArray(responsabilidades) ||
    responsabilidades.length === 0 ||
    responsabilidades.length > MAXIMO_DE_RESPONSABILIDADES ||
    !responsabilidades.every((r) => typeof r === 'string' && r.length <= 10)
  ) {
    throw campoInvalido('responsabilidadesFiscales');
  }
  return {
    nit: texto(c['nit'], 'nit', 20),
    digitoVerificacion: digitoDe(c['digitoVerificacion']),
    razonSocial: texto(c['razonSocial'], 'razonSocial', 600),
    tipoDePersona,
    responsabilidadesFiscales: responsabilidades as string[],
    responsableDeIva: siNo(c['responsableDeIva'], 'responsableDeIva'),
    direccion: {
      codigoMunicipio: texto(direccion['codigoMunicipio'], 'direccion.codigoMunicipio', 5),
      ciudad: texto(direccion['ciudad'], 'direccion.ciudad', 300),
      departamento: texto(direccion['departamento'], 'direccion.departamento', 300),
      linea: texto(direccion['linea'], 'direccion.linea', 300),
    },
    correo: textoONulo(c['correo'], 'correo', 300),
  };
}

function digitoDe(valor: unknown): number | null {
  if (valor === undefined || valor === null) return null;
  if (!Number.isInteger(valor) || (valor as number) < 0 || (valor as number) > 9) throw campoInvalido('digitoVerificacion');
  return valor as number;
}
