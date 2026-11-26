import { BadRequestException } from '@nestjs/common';
import { documentoDe } from '../../../src/modulos/catalogo/presentacion/http/cuerpo-de-busqueda.js';
import { clienteNuevoDe } from '../../../src/modulos/catalogo/presentacion/http/lectura-de-cliente.js';

const valido = {
  id: '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  tipoDocumento: '31',
  numero: '800197268',
  digitoVerificacion: 4,
  nombre: 'Ferretería El Tornillo',
  tipoDePersona: 'juridica',
};

const campoRechazado = (cuerpo: unknown): string | undefined => {
  try {
    clienteNuevoDe(cuerpo);
  } catch (error) {
    if (error instanceof BadRequestException) return (error.getResponse() as { mensaje: string }).mensaje;
    throw error;
  }
  return undefined;
};

describe('lectura del cuerpo de POST /clientes', () => {
  it('lee lo mínimo y completa lo opcional', () => {
    expect(clienteNuevoDe(valido)).toMatchObject({
      tipoDeIdentificacion: '31',
      digitoEscrito: 4,
      responsabilidadesFiscales: [],
      responsableDeIva: false,
      correo: null,
      direccion: null,
    });
  });

  it.each([
    [null, 'id'],
    [[], 'id'],
    [{ ...valido, id: 'no-es-uuid' }, 'id'],
    [{ ...valido, id: valido.id.toUpperCase() }, 'id'],
    [{ ...valido, tipoDocumento: '99' }, 'tipoDocumento'],
    [{ ...valido, tipoDocumento: 'constructor' }, 'tipoDocumento'],
    [{ ...valido, numero: 800197268 }, 'numero'],
    [{ ...valido, numero: '1'.repeat(31) }, 'numero'],
    [{ ...valido, nombre: { $ne: '' } }, 'nombre'],
    [{ ...valido, tipoDePersona: 'empresa' }, 'tipoDePersona'],
    [{ ...valido, digitoVerificacion: '4' }, 'digitoVerificacion'],
    [{ ...valido, digitoVerificacion: 10 }, 'digitoVerificacion'],
    [{ ...valido, responsabilidadesFiscales: 'O-13' }, 'responsabilidadesFiscales'],
    [{ ...valido, responsabilidadesFiscales: Array(11).fill('O-13') }, 'responsabilidadesFiscales'],
    [{ ...valido, responsableDeIva: 'si' }, 'responsableDeIva'],
    [{ ...valido, correo: ['a@b.co'] }, 'correo'],
    [{ ...valido, direccion: { codigoMunicipio: '11001' } }, 'direccion'],
  ])('rechaza %j', (cuerpo, campo) => {
    expect(campoRechazado(cuerpo)).toBe(`Revisa el campo ${campo}`);
  });

  it('el documento a buscar es un texto corto', () => {
    expect(documentoDe({ documento: '800' })).toBe('800');
    expect(() => documentoDe({ documento: ['800'] })).toThrow(BadRequestException);
    expect(() => documentoDe({ documento: '8'.repeat(41) })).toThrow(BadRequestException);
    expect(() => documentoDe(undefined)).toThrow(BadRequestException);
  });
});
