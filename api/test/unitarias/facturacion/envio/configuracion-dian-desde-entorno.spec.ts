import { IdEmpresa } from '../../../../src/compartido/dominio/index.js';
import { AccesoDianNoConfigurado } from '../../../../src/modulos/facturacion/aplicacion/envio/acceso-dian-no-configurado.js';
import { ConfiguracionDianDesdeEntorno } from '../../../../src/modulos/facturacion/infraestructura/acceso-dian/configuracion-dian-desde-entorno.js';

// HU-06.02: el software de cada clase de documento, desde el entorno de habilitación.

const empresa = { empresaId: IdEmpresa.de('00000000-0000-4000-8000-000000000001') };
const entorno = {
  DIAN_HAB_EMPRESA_ID: empresa.empresaId.valor,
  DIAN_HAB_NIT: '900373076',
  DIAN_HAB_ID_SOFTWARE: 'software-factura',
  DIAN_HAB_PIN: '12345',
  DIAN_HAB_POS_ID_SOFTWARE: 'software-pos',
  DIAN_HAB_POS_PIN: '67890',
  DIAN_HAB_POS_FABRICANTE_NOMBRE: 'Equipo CONTA',
  DIAN_HAB_POS_FABRICANTE_RAZON_SOCIAL: 'CONTA S.A.S.',
};
const para = (env: Record<string, string>, clase: 'factura' | 'pos') => new ConfiguracionDianDesdeEntorno(env).para(empresa, clase);

describe('ConfiguracionDianDesdeEntorno', () => {
  it('el tiquete POS usa su propio software y su PIN, sin clave técnica, con el fabricante', async () => {
    const { configuracion } = await para(entorno, 'pos');
    expect(configuracion).toMatchObject({ idSoftware: 'software-pos', pinSoftware: '67890', claveTecnica: '' });
    expect(configuracion.fabricante).toEqual({ nombre: 'Equipo CONTA', razonSocial: 'CONTA S.A.S.', nombreDelSoftware: 'CONTA' });
    expect((await para(entorno, 'factura')).configuracion).toMatchObject({ idSoftware: 'software-factura', fabricante: null });
  });

  it('una configuración POS que el generador rechazaría cuenta como no configurada (H3)', async () => {
    const invalidas = [
      { DIAN_HAB_POS_PIN: '12 34' },
      { DIAN_HAB_POS_ID_SOFTWARE: 'id con espacios' },
      { DIAN_HAB_POS_FABRICANTE_NOMBRE: 'x'.repeat(201) },
      { DIAN_HAB_POS_FABRICANTE_RAZON_SOCIAL: 'CONTA\u0001S.A.S.' },
      { DIAN_HAB_POS_FABRICANTE_NOMBRE: '   ' },
    ];
    for (const cambio of invalidas) {
      await expect(para({ ...entorno, ...cambio }, 'pos')).rejects.toBeInstanceOf(AccesoDianNoConfigurado);
    }
    // La factura sigue disponible: la venta sale con factura en vez de gastar un número POS que no se emite.
    await expect(para({ ...entorno, DIAN_HAB_POS_PIN: '12 34' }, 'factura')).resolves.toBeDefined();
  });

  it('sin las variables del POS, el POS no está configurado', async () => {
    const { DIAN_HAB_POS_FABRICANTE_NOMBRE: _, ...sinFabricante } = entorno;
    await expect(para(sinFabricante, 'pos')).rejects.toBeInstanceOf(AccesoDianNoConfigurado);
  });
});
