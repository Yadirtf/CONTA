import { IdEmpresa } from '../../../../src/compartido/dominio/index.js';
import { AccesoDianNoConfigurado } from '../../../../src/modulos/facturacion/aplicacion/envio/acceso-dian-no-configurado.js';
import { SecretosNoDisponibles } from '../../../../src/modulos/facturacion/aplicacion/configuracion/errores-de-configuracion.js';
import { asociadoAlSoftware } from '../../../../src/modulos/facturacion/aplicacion/puertos/custodia-de-secretos.js';
import { datosFiscalesDelFacturador } from '../../../../src/modulos/facturacion/dominio/index.js';
import { AccesoDianGuardado } from '../../../../src/modulos/facturacion/infraestructura/acceso-dian/acceso-dian-guardado.js';
import { ConfiguracionDianGuardada } from '../../../../src/modulos/facturacion/infraestructura/acceso-dian/configuracion-dian-guardada.js';
import { CustodiaAesGcm, custodiaDelEntorno } from '../../../../src/modulos/facturacion/infraestructura/custodia/custodia-aes-gcm.js';
import { CONTRASENA_DE_PRUEBA, juegoDeCertificados } from '../../../recursos/firma/certificados-de-prueba.js';
import { ConfiguracionEnMemoria } from './configuracion-en-memoria.js';
import { datosEscritos } from './datos-de-configuracion.js';

// HU-07.04: con el software guardado, la facturación usa SOLO lo guardado; sin él, el respaldo del entorno.

const EMPRESA = IdEmpresa.de('aaaaaaaa-0000-4000-8000-000000000001');
const custodia = new CustodiaAesGcm('clave-desechable-de-pruebas-unitarias-de-la-dian');
const ID_SOFTWARE = '56f2ae4e-9812-4fad-9255-08fcfcd5ccb0';
const TEST_SET = '3f2a8a2e-1b8c-4a7e-9b6f-2d9b1c0a7e11';

function conSoftware(clase: 'factura' | 'pos' = 'factura') {
  const guardado = new ConfiguracionEnMemoria();
  guardado.datosFiscales = datosFiscalesDelFacturador(datosEscritos());
  guardado.software.set(clase, {
    clase,
    idSoftware: ID_SOFTWARE,
    pinCifrado: custodia.cifrar('54321', asociadoAlSoftware(EMPRESA.valor, clase)),
    finalDelPin: '1',
    testSetId: TEST_SET,
    fabricante: clase === 'pos' ? { nombre: 'Pepe', razonSocial: 'Don Pepe' } : null,
    actualizadoEn: new Date(),
  });
  return guardado;
}

const respaldo = { para: vi.fn(() => Promise.resolve({ configuracion: {} as never, nitDelFacturador: 'del-entorno' })) };

describe('ConfiguracionDianGuardada', () => {
  it('con software guardado, usa el guardado con el NIT de los datos fiscales y nunca el entorno', async () => {
    respaldo.para.mockClear();
    const { configuracion, nitDelFacturador } = await new ConfiguracionDianGuardada(conSoftware(), custodia, respaldo).para({ empresaId: EMPRESA }, 'factura');
    expect(configuracion).toMatchObject({ idSoftware: ID_SOFTWARE, pinSoftware: '54321', nitProveedorSoftware: '900373076', fabricante: null });
    expect(nitDelFacturador).toBe('900373076');
    expect(respaldo.para).not.toHaveBeenCalled();
  });

  it('el POS lleva su fabricante y no lleva clave técnica', async () => {
    const { configuracion } = await new ConfiguracionDianGuardada(conSoftware('pos'), custodia, respaldo).para({ empresaId: EMPRESA }, 'pos');
    expect(configuracion).toMatchObject({ claveTecnica: '', fabricante: { nombre: 'Pepe', razonSocial: 'Don Pepe', nombreDelSoftware: 'CONTA' } });
  });

  it('sin software de esa clase pregunta al respaldo; sin datos fiscales no está configurada', async () => {
    const r = await new ConfiguracionDianGuardada(conSoftware('factura'), custodia, respaldo).para({ empresaId: EMPRESA }, 'pos');
    expect(r.nitDelFacturador).toBe('del-entorno');
    const sinDatos = conSoftware();
    sinDatos.datosFiscales = null;
    await expect(new ConfiguracionDianGuardada(sinDatos, custodia, respaldo).para({ empresaId: EMPRESA }, 'factura')).rejects.toBeInstanceOf(
      AccesoDianNoConfigurado,
    );
  });

  it('un PIN de otra empresa (fila copiada) no abre', async () => {
    const otra = IdEmpresa.de('aaaaaaaa-0000-4000-8000-000000000002');
    await expect(new ConfiguracionDianGuardada(conSoftware(), custodia, respaldo).para({ empresaId: otra }, 'factura')).rejects.toThrow();
  });
});

describe('AccesoDianGuardado', () => {
  const entorno = {
    DIAN_HAB_EMPRESA_ID: EMPRESA.valor,
    DIAN_HAB_P12_BASE64: Buffer.from(juegoDeCertificados().p12).toString('base64'),
    DIAN_HAB_P12_CONTRASENA: CONTRASENA_DE_PRUEBA,
  };

  it('el set de pruebas sale del software guardado y el certificado del entorno (hasta HU-07.02)', async () => {
    const acceso = await new AccesoDianGuardado(conSoftware(), { para: () => Promise.reject(new Error('no')) }, entorno).para({ empresaId: EMPRESA }, 'factura');
    expect(acceso.testSetId).toBe(TEST_SET);
  });

  it('otra empresa no firma con ese certificado aunque tenga software guardado', async () => {
    const otra = { ...entorno, DIAN_HAB_EMPRESA_ID: 'aaaaaaaa-0000-4000-8000-000000000009' };
    await expect(
      new AccesoDianGuardado(conSoftware(), { para: () => Promise.reject(new Error('no')) }, otra).para({ empresaId: EMPRESA }, 'factura'),
    ).rejects.toBeInstanceOf(AccesoDianNoConfigurado);
  });
});

describe('Custodia de secretos', () => {
  it('sin clave falla cerrado; con una corta no arranca', () => {
    expect(() => custodiaDelEntorno({}).cifrar('x', 'y')).toThrow(SecretosNoDisponibles);
    expect(() => custodiaDelEntorno({ SECRETO_CONFIGURACION_DIAN: 'corta' })).toThrow(/al menos 32/);
  });

  it('un texto alterado o con otra clave no abre', () => {
    const cifrado = custodia.cifrar('12345', 'a');
    const otra = new CustodiaAesGcm('otra-clave-desechable-de-pruebas-unitarias-dian');
    expect(() => otra.descifrar(cifrado, 'a')).toThrow();
    const partes = cifrado.split('.');
    partes[2] = Buffer.from('99999').toString('base64url');
    expect(() => custodia.descifrar(partes.join('.'), 'a')).toThrow();
    expect(() => custodia.descifrar(`${cifrado}.extra`, 'a')).toThrow();
  });
});
