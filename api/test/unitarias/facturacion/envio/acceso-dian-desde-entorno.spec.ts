import { IdEmpresa } from '../../../../src/compartido/dominio/index.js';
import { AccesoDianNoConfigurado } from '../../../../src/modulos/facturacion/aplicacion/envio/acceso-dian-no-configurado.js';
import { AccesoDianDesdeEntorno } from '../../../../src/modulos/facturacion/infraestructura/acceso-dian/acceso-dian-desde-entorno.js';
import { CONTRASENA_DE_PRUEBA, juegoDeCertificados } from '../../../recursos/firma/certificados-de-prueba.js';

const propia = IdEmpresa.de('00000000-0000-4000-8000-000000000001');
const ajena = IdEmpresa.de('00000000-0000-4000-8000-000000000002');
const entorno = {
  DIAN_HAB_EMPRESA_ID: propia.valor.toUpperCase(),
  DIAN_HAB_P12_BASE64: Buffer.from(juegoDeCertificados().p12).toString('base64'),
  DIAN_HAB_P12_CONTRASENA: CONTRASENA_DE_PRUEBA,
  DIAN_HAB_TEST_SET_ID: 'set-1',
  DIAN_HAB_POS_TEST_SET_ID: 'set-pos',
};

describe('AccesoDianDesdeEntorno (HU-02.03)', () => {
  it('entrega certificado y testSetId solo a la empresa configurada', async () => {
    const acceso = await new AccesoDianDesdeEntorno(entorno).para({ empresaId: propia }, 'factura');
    expect(acceso.testSetId).toBe('set-1');
    await expect(new AccesoDianDesdeEntorno(entorno).para({ empresaId: ajena }, 'factura')).rejects.toBeInstanceOf(AccesoDianNoConfigurado);
  });

  it('HU-06.02: el tiquete POS usa su propio set de pruebas, con el mismo certificado', async () => {
    const acceso = await new AccesoDianDesdeEntorno(entorno).para({ empresaId: propia }, 'pos');
    expect(acceso.testSetId).toBe('set-pos');
    const { DIAN_HAB_POS_TEST_SET_ID: _, ...sinPos } = entorno;
    await expect(new AccesoDianDesdeEntorno(sinPos).para({ empresaId: propia }, 'pos')).rejects.toBeInstanceOf(AccesoDianNoConfigurado);
  });

  it('si falta una variable, el acceso no está configurado', async () => {
    const { DIAN_HAB_TEST_SET_ID: _, ...incompleto } = entorno;
    await expect(new AccesoDianDesdeEntorno(incompleto).para({ empresaId: propia }, 'factura')).rejects.toBeInstanceOf(AccesoDianNoConfigurado);
  });
});
