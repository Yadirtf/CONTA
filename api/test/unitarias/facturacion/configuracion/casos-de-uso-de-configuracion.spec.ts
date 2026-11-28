import type { ContextoDeMiembro } from '../../../../src/compartido/aplicacion/index.js';
import { IdEmpresa, IdUsuario, type Rol, type SegundoFactorDeLaSesion } from '../../../../src/compartido/dominio/index.js';
import { AgregarResolucion } from '../../../../src/modulos/facturacion/aplicacion/configuracion/agregar-resolucion.js';
import { GuardarDatosFiscales } from '../../../../src/modulos/facturacion/aplicacion/configuracion/guardar-datos-fiscales.js';
import { GuardarPreferencias } from '../../../../src/modulos/facturacion/aplicacion/configuracion/guardar-preferencias.js';
import { GuardarSoftware } from '../../../../src/modulos/facturacion/aplicacion/configuracion/guardar-software.js';
import { ObtenerConfiguracionDian } from '../../../../src/modulos/facturacion/aplicacion/configuracion/obtener-configuracion-dian.js';
import { asociadoAlSoftware } from '../../../../src/modulos/facturacion/aplicacion/puertos/custodia-de-secretos.js';
import { datosFiscalesDelFacturador } from '../../../../src/modulos/facturacion/dominio/index.js';
import { CustodiaAesGcm } from '../../../../src/modulos/facturacion/infraestructura/custodia/custodia-aes-gcm.js';
import { codigoDeAsync } from '../ventas/apoyo.js';
import { ConfiguracionEnMemoria } from './configuracion-en-memoria.js';
import { datosEscritos, resolucionEscrita, softwareEscrito } from './datos-de-configuracion.js';

// HU-07.04: casos de uso de la configuración DIAN. Solo el dueño, con verificación reciente para cambiar; el PIN y la
// clave técnica se guardan cifrados y nunca salen.

const EMPRESA = 'aaaaaaaa-0000-4000-8000-000000000001';
const quien = (rol: Rol = 'dueno', segundoFactor: SegundoFactorDeLaSesion = 'reciente'): ContextoDeMiembro => ({
  empresaId: IdEmpresa.de(EMPRESA),
  usuarioId: IdUsuario.de('bbbbbbbb-0000-4000-8000-000000000001'),
  rol,
  modo: 'simple',
  segundoFactor,
});

function montar() {
  const guardado = new ConfiguracionEnMemoria();
  const custodia = new CustodiaAesGcm('clave-desechable-de-pruebas-unitarias-de-la-dian');
  return {
    guardado,
    custodia,
    datos: new GuardarDatosFiscales(guardado),
    resolucion: new AgregarResolucion(guardado, custodia),
    software: new GuardarSoftware(guardado, custodia),
    preferencias: new GuardarPreferencias(guardado),
    obtener: new ObtenerConfiguracionDian(guardado, { ahora: () => new Date('2026-11-27T15:00:00Z') }),
  };
}

describe('Autorización de la configuración DIAN', () => {
  it('ni el contador ni el cajero la leen ni la cambian', async () => {
    const m = montar();
    for (const rol of ['contador', 'cajero'] as const) {
      expect(await codigoDeAsync(m.obtener.ejecutar(quien(rol)))).toBe('permiso.denegado');
      expect(await codigoDeAsync(m.datos.ejecutar(quien(rol), datosEscritos()))).toBe('permiso.denegado');
      expect(await codigoDeAsync(m.software.ejecutar(quien(rol), softwareEscrito()))).toBe('permiso.denegado');
    }
    expect(m.guardado.software.size).toBe(0);
  });

  it('leer pide la verificación de la jornada; cambiar, una reciente', async () => {
    const m = montar();
    expect(await codigoDeAsync(m.obtener.ejecutar(quien('dueno', 'sin-verificar')))).toBe('acceso.segundo-factor-requerido');
    await expect(m.obtener.ejecutar(quien('dueno', 'vigente'))).resolves.toBeDefined();
    for (const cambio of [
      m.datos.ejecutar(quien('dueno', 'vigente'), datosEscritos()),
      m.resolucion.ejecutar(quien('dueno', 'vigente'), 'cccccccc-0000-4000-8000-000000000001', resolucionEscrita()),
      m.software.ejecutar(quien('dueno', 'vigente'), softwareEscrito()),
      m.preferencias.ejecutar(quien('dueno', 'vigente'), true),
    ]) {
      expect(await codigoDeAsync(cambio)).toBe('acceso.segundo-factor-reciente-requerido');
    }
    expect(m.guardado.bitacora).toEqual([]);
  });
});

describe('Datos fiscales', () => {
  it('se guardan y se corrigen, y queda la huella en la bitácora', async () => {
    const m = montar();
    await m.datos.ejecutar(quien(), datosEscritos());
    await m.datos.ejecutar(quien(), datosEscritos({ correo: null }));
    expect(m.guardado.datosFiscales?.correo).toBeNull();
    expect(m.guardado.bitacora.map((c) => c.seccion)).toEqual(['datos-fiscales', 'datos-fiscales']);
  });

  it('el NIT no cambia si la empresa ya vendió; los demás datos sí', async () => {
    const m = montar();
    m.guardado.datosFiscales = datosFiscalesDelFacturador(datosEscritos());
    m.guardado.hayVentas = true;
    expect(await codigoDeAsync(m.datos.ejecutar(quien(), datosEscritos({ nit: '800197268', digitoVerificacion: null })))).toBe(
      'configuracion.nit-con-ventas',
    );
    await m.datos.ejecutar(quien(), datosEscritos({ razonSocial: 'Don Pepe Express S.A.S.' }));
    expect(m.guardado.datosFiscales.razonSocial).toBe('Don Pepe Express S.A.S.');
  });
});

describe('Resoluciones', () => {
  const id = 'cccccccc-0000-4000-8000-000000000001';

  it('se agregan una vez (un reintento no agrega otra) y la clave técnica queda cifrada', async () => {
    const m = montar();
    const conClave = resolucionEscrita({ claveTecnica: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c' });
    expect(await m.resolucion.ejecutar(quien(), id, conClave)).toBe(true);
    expect(await m.resolucion.ejecutar(quien(), id, conClave)).toBe(false);
    const cifrada = m.guardado.resoluciones.get(id)?.claveCifrada ?? '';
    expect(cifrada).toMatch(/^v1\./);
    expect(cifrada).not.toContain('fc8eac42');
    expect(m.guardado.bitacora.map((c) => c.seccion)).toEqual(['resolucion-factura']);
  });

  it('el mismo id con otra clave técnica u otro primer número no es un reintento: es 409 (hallazgo M1)', async () => {
    const m = montar();
    const conClave = resolucionEscrita({ claveTecnica: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c' });
    await m.resolucion.ejecutar(quien(), id, conClave);
    for (const otra of [
      resolucionEscrita({ claveTecnica: 'otra-clave-tecnica-del-rango' }),
      resolucionEscrita(),
      { ...conClave, primerNumero: conClave.desde + 5 },
    ]) {
      expect(await codigoDeAsync(m.resolucion.ejecutar(quien(), id, otra))).toBe('resolucion.id-en-uso');
    }
  });

  it('no deja pasar de 20 resoluciones por clase, pero sí reintentar una guardada (hallazgo B5)', async () => {
    const m = montar();
    const ids = Array.from({ length: 20 }, (_, i) => `dddddddd-0000-4000-8000-${String(i).padStart(12, '0')}`);
    for (const [i, otro] of ids.entries()) {
      await m.resolucion.ejecutar(quien(), otro, resolucionEscrita({ numero: String(1000 + i) }));
    }
    expect(await codigoDeAsync(m.resolucion.ejecutar(quien(), id, resolucionEscrita({ numero: '9999' })))).toBe('resolucion.demasiadas');
    expect(await m.resolucion.ejecutar(quien(), ids[0] as string, resolucionEscrita({ numero: '1000' }))).toBe(false);
  });

  it('dice con palabras si el id es de otra, si se repite o si el rango se cruza', async () => {
    const m = montar();
    for (const [respuesta, codigo] of [
      ['id-en-uso', 'resolucion.id-en-uso'],
      ['repetida', 'resolucion.repetida'],
      ['rango-cruzado', 'resolucion.rango-cruzado'],
    ] as const) {
      m.guardado.respuestaDeAgregar = respuesta;
      expect(await codigoDeAsync(m.resolucion.ejecutar(quien(), id, resolucionEscrita()))).toBe(codigo);
    }
  });
});

describe('Software', () => {
  it('el PIN se guarda cifrado y atado a la empresa y la clase; sin PIN nuevo queda el que estaba', async () => {
    const m = montar();
    await m.software.ejecutar(quien(), softwareEscrito({ pin: '98765' }));
    const primero = m.guardado.software.get('factura');
    expect(primero?.pinCifrado).not.toContain('98765');
    expect(primero?.finalDelPin).toBe('5');
    expect(m.custodia.descifrar(primero?.pinCifrado ?? '', asociadoAlSoftware(EMPRESA, 'factura'))).toBe('98765');
    // Copiado a la otra clase (o a otra empresa) no abre.
    expect(() => m.custodia.descifrar(primero?.pinCifrado ?? '', asociadoAlSoftware(EMPRESA, 'pos'))).toThrow();

    await m.software.ejecutar(quien(), softwareEscrito({ pin: null, testSetId: '11111111-2222-4333-8444-555555555555' }));
    const segundo = m.guardado.software.get('factura');
    expect(segundo?.pinCifrado).toBe(primero?.pinCifrado);
    expect(segundo?.testSetId).toBe('11111111-2222-4333-8444-555555555555');
  });

  it('lo que se lee nunca trae el PIN ni la clave técnica', async () => {
    const m = montar();
    await m.datos.ejecutar(quien(), datosEscritos());
    await m.resolucion.ejecutar(quien(), 'cccccccc-0000-4000-8000-000000000001', resolucionEscrita({ claveTecnica: 'clave-secreta-del-rango' }));
    await m.software.ejecutar(quien(), softwareEscrito({ pin: 'pinsecreto99' }));
    const leida = await m.obtener.ejecutar(quien('dueno', 'vigente'));
    const texto = JSON.stringify(leida);
    expect(texto).not.toContain('pinsecreto99');
    expect(texto).not.toContain('clave-secreta-del-rango');
    expect(texto).not.toContain('v1.');
    expect(leida.software.factura?.finalDelPin).toBe('9');
    expect(leida.loQueFalta).toEqual({ puedeFacturar: true, posActivo: false, pendientes: [] });
  });
});

describe('Preferencias', () => {
  it('«siempre factura» se guarda y queda en la bitácora', async () => {
    const m = montar();
    await m.preferencias.ejecutar(quien(), true);
    expect(m.guardado.siempreFactura).toBe(true);
    expect(m.guardado.bitacora.map((c) => c.seccion)).toEqual(['preferencias']);
  });

  it('repetir el mismo valor no escribe ni llena la bitácora (hallazgo B5)', async () => {
    const m = montar();
    for (let i = 0; i < 5; i++) await m.preferencias.ejecutar(quien(), true);
    await m.preferencias.ejecutar(quien(), false);
    expect(m.guardado.bitacora.map((c) => c.seccion)).toEqual(['preferencias', 'preferencias']);
  });
});
