import { exigirSegundoFactor } from '../../../../src/compartido/dominio/index.js';
import { datosFiscalesDelFacturador, loQueFalta, resolucionNueva, softwareDian } from '../../../../src/modulos/facturacion/dominio/index.js';
import { codigoDe } from '../ventas/apoyo.js';
import { datosEscritos, resolucionEscrita, softwareEscrito } from './datos-de-configuracion.js';

// HU-07.04: reglas de lo que el dueño carga en la configuración DIAN.

describe('Datos fiscales del facturador', () => {
  it('calcula el NIT con su dígito y limpia los textos que van al XML', () => {
    const datos = datosFiscalesDelFacturador(datosEscritos({ razonSocial: '  Tienda‮ Don\u0007Pepe  ', digitoVerificacion: null }));
    expect(datos.identificacion.digitoVerificacion).toBe(4);
    expect(datos.razonSocial).toBe('Tienda Don Pepe');
  });

  it('rechaza un dígito que no corresponde, un NIT mal escrito y responsabilidades desconocidas', () => {
    expect(codigoDe(() => datosFiscalesDelFacturador(datosEscritos({ digitoVerificacion: 5 })))).toBe('configuracion.digito-no-coincide');
    expect(codigoDe(() => datosFiscalesDelFacturador(datosEscritos({ nit: '900.373.076' })))).toBe('nit.invalido');
    expect(codigoDe(() => datosFiscalesDelFacturador(datosEscritos({ responsabilidadesFiscales: ['O-99'] })))).toBe(
      'configuracion.responsabilidad-invalida',
    );
    expect(
      codigoDe(() => datosFiscalesDelFacturador(datosEscritos({ responsabilidadesFiscales: ['O-13', 'O-15', 'O-23', 'O-47', 'R-99-PN'] }))),
    ).toBe('configuracion.responsabilidad-invalida');
  });

  it('rechaza los NIT genéricos del comprador y los que no son de un facturador (hallazgo M2)', () => {
    for (const nit of ['222222222222', '444444001', '100', '12345678901']) {
      expect(codigoDe(() => datosFiscalesDelFacturador(datosEscritos({ nit, digitoVerificacion: null })))).toBe('configuracion.nit-generico');
    }
  });

  it('R-99-PN no va con otras responsabilidades (hallazgo B4)', () => {
    expect(codigoDe(() => datosFiscalesDelFacturador(datosEscritos({ responsabilidadesFiscales: ['R-99-PN', 'O-13'] })))).toBe(
      'configuracion.responsabilidad-invalida',
    );
  });

  it('el código DANE empieza con un departamento real (hallazgo B4)', () => {
    for (const codigoMunicipio of ['00001', '30001', '1100', '1100a']) {
      const direccion = { codigoMunicipio, ciudad: 'Bogotá', departamento: 'Bogotá', linea: 'Calle 1' };
      expect(codigoDe(() => datosFiscalesDelFacturador(datosEscritos({ direccion })))).toBe('factura.direccion-invalida');
    }
  });

  it('el municipio es real y los textos no quedan vacíos', () => {
    const direccion = { codigoMunicipio: '11000', ciudad: 'Bogotá', departamento: 'Bogotá', linea: 'Calle 1' };
    expect(codigoDe(() => datosFiscalesDelFacturador(datosEscritos({ direccion })))).toBe('factura.direccion-invalida');
    expect(codigoDe(() => datosFiscalesDelFacturador(datosEscritos({ razonSocial: '​​' })))).toBe('configuracion.texto-invalido');
    expect(codigoDe(() => datosFiscalesDelFacturador(datosEscritos({ correo: 'no es correo' })))).toBe('factura.correo-invalido');
  });
});

describe('Resolución nueva', () => {
  it('empieza en el primer número del rango, o en el que diga el dueño si está dentro', () => {
    expect(resolucionNueva(resolucionEscrita()).primerNumero).toBe(990000000);
    expect(resolucionNueva(resolucionEscrita({ primerNumero: 990000500 })).primerNumero).toBe(990000500);
    expect(codigoDe(() => resolucionNueva(resolucionEscrita({ primerNumero: 995000001 })))).toBe('resolucion.primer-numero-invalido');
  });

  it('rechaza prefijos raros, rangos al revés, fechas imposibles y la clave técnica en el POS', () => {
    expect(codigoDe(() => resolucionNueva(resolucionEscrita({ prefijo: 'setp' })))).toBe('resolucion.prefijo-invalido');
    expect(codigoDe(() => resolucionNueva(resolucionEscrita({ prefijo: "S'--" })))).toBe('resolucion.prefijo-invalido');
    expect(codigoDe(() => resolucionNueva(resolucionEscrita({ desde: 10, hasta: 5 })))).toBe('resolucion.rango-invalido');
    expect(codigoDe(() => resolucionNueva(resolucionEscrita({ vigenteHasta: '2030-02-30' })))).toBe('resolucion.vigencia-invalida');
    // El año 0000 llegaba a PostgreSQL y daba 500 (hallazgo B1); fuera de 2000-2099 no hay resoluciones (B4).
    for (const [vigenteDesde, vigenteHasta] of [['0000-01-01', '2030-01-01'], ['1999-12-31', '2030-01-01'], ['2019-01-19', '9999-12-31']]) {
      expect(codigoDe(() => resolucionNueva(resolucionEscrita({ vigenteDesde, vigenteHasta })))).toBe('resolucion.vigencia-invalida');
    }
    expect(codigoDe(() => resolucionNueva(resolucionEscrita({ clase: 'pos', claveTecnica: 'abc' })))).toBe('resolucion.clave-tecnica-sobra');
    expect(codigoDe(() => resolucionNueva(resolucionEscrita({ claveTecnica: 'con espacios' })))).toBe('resolucion.clave-tecnica-invalida');
  });
});

describe('Software DIAN', () => {
  it('la factura no lleva fabricante; el POS lo exige', () => {
    expect(softwareDian(softwareEscrito(), false).fabricante).toBeNull();
    expect(codigoDe(() => softwareDian(softwareEscrito({ fabricante: { nombre: 'a', razonSocial: 'b' } }), false))).toBe('software.fabricante-sobra');
    expect(codigoDe(() => softwareDian(softwareEscrito({ clase: 'pos' }), false))).toBe('software.falta-fabricante');
    const pos = softwareDian(softwareEscrito({ clase: 'pos', fabricante: { nombre: ' Pepe\u0000 ', razonSocial: 'Don Pepe' } }), false);
    expect(pos.fabricante).toEqual({ nombre: 'Pepe', razonSocial: 'Don Pepe' });
  });

  it('sin PIN guardado exige el PIN; con uno guardado se puede dejar igual', () => {
    expect(codigoDe(() => softwareDian(softwareEscrito({ pin: null }), false))).toBe('software.falta-pin');
    expect(softwareDian(softwareEscrito({ pin: null }), true).pin).toBeNull();
    expect(codigoDe(() => softwareDian(softwareEscrito({ pin: '12 45' }), true))).toBe('software.pin-invalido');
  });

  it('los identificadores son uuid', () => {
    expect(codigoDe(() => softwareDian(softwareEscrito({ idSoftware: "x' or 1=1" }), false))).toBe('software.id-invalido');
    expect(codigoDe(() => softwareDian(softwareEscrito({ testSetId: 'set-1' }), false))).toBe('software.test-set-invalido');
    expect(softwareDian(softwareEscrito({ idSoftware: '56F2AE4E-9812-4FAD-9255-08FCFCD5CCB0' }), false).idSoftware).toBe(
      '56f2ae4e-9812-4fad-9255-08fcfcd5ccb0',
    );
  });
});

describe('Lo que falta para facturar', () => {
  const todo = {
    datosFiscales: true,
    resolucionDeFacturaVigente: true,
    softwareDeFactura: true,
    resolucionPosVigente: true,
    softwareDePos: true,
    siempreFactura: false,
  };

  it('lista lo pendiente en orden y el POS solo cuenta completo y sin «siempre factura»', () => {
    expect(loQueFalta(todo)).toEqual({ puedeFacturar: true, posActivo: true, pendientes: [] });
    expect(loQueFalta({ ...todo, siempreFactura: true }).posActivo).toBe(false);
    expect(loQueFalta({ ...todo, datosFiscales: false, softwareDeFactura: false })).toEqual({
      puedeFacturar: false,
      posActivo: false,
      pendientes: ['datos-fiscales', 'software-factura'],
    });
  });
});

describe('Nivel del segundo factor', () => {
  it('reciente cubre vigente; vigente no cubre reciente; sin dato se niega', () => {
    expect(() => exigirSegundoFactor('reciente', 'vigente')).not.toThrow();
    expect(codigoDe(() => exigirSegundoFactor('vigente', 'reciente'))).toBe('acceso.segundo-factor-reciente-requerido');
    expect(codigoDe(() => exigirSegundoFactor('sin-verificar', 'vigente'))).toBe('acceso.segundo-factor-requerido');
    expect(codigoDe(() => exigirSegundoFactor(undefined, 'vigente'))).toBe('acceso.segundo-factor-requerido');
  });
});
