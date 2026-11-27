import type { UnidadDeTrabajo } from '../../../../src/compartido/aplicacion/index.js';
import { IdEmpresa } from '../../../../src/compartido/dominio/index.js';
import { EnviarCorreoDeFactura } from '../../../../src/modulos/facturacion/aplicacion/comandos/enviar-correo-de-factura.js';
import { EnviarCorreosPendientes } from '../../../../src/modulos/facturacion/aplicacion/comandos/enviar-correos-pendientes.js';
import { CorreoAlAceptar } from '../../../../src/modulos/facturacion/aplicacion/correo/correo-al-aceptar.js';
import { FallaDeCorreo } from '../../../../src/modulos/facturacion/aplicacion/correo/falla-de-correo.js';
import type { CorreoSaliente } from '../../../../src/modulos/facturacion/aplicacion/puertos/enviador-de-correo.js';
import type { RepositoriosDeVenta } from '../../../../src/modulos/facturacion/aplicacion/puertos/repositorios-de-venta.js';
import { CorreoDeFactura, MAXIMO_DE_INTENTOS_DE_CORREO } from '../../../../src/modulos/facturacion/dominio/index.js';
import { RelojDePrueba } from '../../../integracion/envio-dian/apoyo.js';
import { VentasEnMemoria } from '../ventas/ventas-en-memoria.js';
import { compradorConCorreo, CUFE, facturaAceptada, VENTA_ID, ventaDePrueba } from './apoyo.js';

const empresaId = IdEmpresa.de('00000000-0000-4000-8000-000000000001');
const PDF = new Uint8Array([37, 80, 68, 70]);

function preparar(falla?: Error) {
  const reloj = new RelojDePrueba(new Date('2026-11-27T15:10:00Z'));
  const memoria = new VentasEnMemoria();
  memoria.guardadas.set(VENTA_ID, ventaDePrueba(VENTA_ID, compradorConCorreo()));
  memoria.facturas.set(VENTA_ID, facturaAceptada());
  memoria.correos.set(VENTA_ID, CorreoDeFactura.solicitar(VENTA_ID, reloj.ahora()));
  const enviados: CorreoSaliente[] = [];
  const enviador = { enviar: (c: CorreoSaliente) => (falla ? Promise.reject(falla) : Promise.resolve(void enviados.push(c))) };
  const enviar = new EnviarCorreoDeFactura(memoria, { pdf: () => Promise.resolve(PDF) }, enviador, reloj);
  return { reloj, memoria, enviados, enviar };
}

describe('EnviarCorreoDeFactura (HU-06.08)', () => {
  it('manda el PDF y el XML al correo del comprador, responde al negocio y deja el intento', async () => {
    const { memoria, enviados, enviar } = preparar();
    await enviar.ejecutar({ empresaId }, VENTA_ID);
    const [correo] = enviados;
    expect(correo?.para).toBe('ana@ejemplo.test');
    expect(correo?.responderA).toBe('facturas@ejemplo.test');
    expect(correo?.asunto).toBe('Factura electrónica SETP990000001 de Ferretería & Cía. de Prueba S.A.S.');
    expect(correo?.texto).toContain(CUFE);
    expect(correo?.texto).toContain('$ 30.300,00');
    expect(correo?.adjuntos.map((a) => [a.nombre, a.tipo])).toEqual([
      ['factura-SETP990000001.pdf', 'application/pdf'],
      ['factura-SETP990000001.xml', 'application/xml'],
    ]);
    expect(correo?.idempotencia).toBe(`${empresaId.valor}:${VENTA_ID}`);
    expect(memoria.correos.get(VENTA_ID)?.instantanea().estado).toBe('enviado');
    expect(memoria.intentosDeCorreo).toEqual([expect.objectContaining({ numero: 1, resultado: 'enviado', detalle: 'ok' })]);
  });

  it('una falla pasajera queda registrada con su código y se reintenta después', async () => {
    const { memoria, enviar } = preparar(new FallaDeCorreo('correo.http-503', false));
    await enviar.ejecutar({ empresaId }, VENTA_ID);
    expect(memoria.correos.get(VENTA_ID)?.instantanea()).toMatchObject({ estado: 'pendiente', intentos: 1, ultimaFalla: 'correo.http-503' });
    expect(memoria.intentosDeCorreo[0]).toMatchObject({ resultado: 'falla-pasajera', detalle: 'correo.http-503' });
  });

  it('un error cualquiera no guarda su mensaje, que podría traer la dirección o la llave', async () => {
    const { memoria, enviar } = preparar(new Error('ana@ejemplo.test api-key=secreta'));
    await enviar.ejecutar({ empresaId }, VENTA_ID);
    expect(memoria.intentosDeCorreo[0]?.detalle).toBe('correo.error-interno');
  });

  it('una dirección rechazada termina el correo', async () => {
    const { memoria, enviar } = preparar(new FallaDeCorreo('correo.http-400', true));
    await enviar.ejecutar({ empresaId }, VENTA_ID);
    expect(memoria.correos.get(VENTA_ID)?.instantanea().estado).toBe('fallido');
  });

  it('no manda nada si todavía no toca o ya salió', async () => {
    const { memoria, enviados, enviar, reloj } = preparar();
    const correo = CorreoDeFactura.solicitar(VENTA_ID, new Date(reloj.ahora().getTime() + 60_000));
    memoria.correos.set(VENTA_ID, correo);
    await enviar.ejecutar({ empresaId }, VENTA_ID);
    expect(enviados).toHaveLength(0);
  });

  it('si el comprobante no se puede armar cuenta como falla y no se retoma sin fin', async () => {
    const { memoria, enviados, enviar } = preparar();
    memoria.resolucion = null;
    await enviar.ejecutar({ empresaId }, VENTA_ID);
    expect(enviados).toHaveLength(0);
    expect(memoria.correos.get(VENTA_ID)?.instantanea()).toMatchObject({ intentos: 1, ultimaFalla: 'correo.sin-comprobante' });
  });

  it('si el proceso se cae tras mandar, el intento ya contó: no se repite enseguida ni sin tope (H2 y H4)', async () => {
    const { reloj, memoria, enviados } = preparar();
    let transacciones = 0;
    const caida: UnidadDeTrabajo<RepositoriosDeVenta> = {
      ejecutar: (c, t) => (++transacciones === 2 ? Promise.reject(new Error('caída al guardar')) : memoria.ejecutar(c, t)),
    };
    const enviar = new EnviarCorreoDeFactura(caida, { pdf: () => Promise.resolve(PDF) }, { enviar: (c) => Promise.resolve(void enviados.push(c)) }, reloj);
    await expect(enviar.ejecutar({ empresaId }, VENTA_ID)).rejects.toThrow('caída al guardar');
    expect(enviados).toHaveLength(1);
    expect(memoria.correos.get(VENTA_ID)?.instantanea()).toMatchObject({ estado: 'pendiente', intentos: 1, ultimaFalla: 'correo.en-curso' });

    // Otro procesador, enseguida: el intento está tomado y no manda otra vez.
    await enviar.ejecutar({ empresaId }, VENTA_ID);
    expect(enviados).toHaveLength(1);

    // Pasada la espera, cierra el intento perdido con su registro y da el siguiente, que sí cuenta.
    reloj.adelantar(2 * 60_000);
    await enviar.ejecutar({ empresaId }, VENTA_ID);
    expect(memoria.correos.get(VENTA_ID)?.instantanea()).toMatchObject({ estado: 'enviado', intentos: 2 });
    expect(memoria.intentosDeCorreo.map((i) => [i.numero, i.detalle])).toEqual([
      [1, 'correo.sin-confirmar'],
      [2, 'ok'],
    ]);
  });

  it('el último intento fallido queda como falla permanente (H5)', async () => {
    const { reloj, memoria, enviar } = preparar(new FallaDeCorreo('correo.http-503', false));
    for (let i = 0; i < 12 && memoria.correos.get(VENTA_ID)?.instantanea().estado === 'pendiente'; i++) {
      await enviar.ejecutar({ empresaId }, VENTA_ID);
      reloj.adelantar(13 * 60 * 60_000);
    }
    expect(memoria.correos.get(VENTA_ID)?.instantanea()).toMatchObject({ estado: 'fallido', intentos: MAXIMO_DE_INTENTOS_DE_CORREO });
    expect(memoria.intentosDeCorreo.map((i) => i.resultado).at(-1)).toBe('falla-permanente');
    expect(memoria.intentosDeCorreo).toHaveLength(MAXIMO_DE_INTENTOS_DE_CORREO);
  });

  it('el lote sigue aunque un correo falle y deja rastro solo con ids y el tipo de error (H2)', async () => {
    const fuente = { tomarVencidos: () => Promise.resolve([{ empresaId, ventaId: 'a' }, { empresaId, ventaId: 'b' }]) };
    let llamadas = 0;
    const fallas: unknown[] = [];
    const lote = new EnviarCorreosPendientes(
      fuente,
      { ejecutar: () => (llamadas++ === 0 ? Promise.reject(new TypeError('ana@ejemplo.test')) : Promise.resolve()) },
      true,
      (f) => fallas.push(f),
    );
    expect(await lote.ejecutar()).toEqual({ tomados: 2, conError: 1 });
    expect(fallas).toEqual([{ empresaId: empresaId.valor, ventaId: 'a', tipo: 'TypeError' }]);
  });

  it('el rastro de un error de la base lleva su SQLSTATE, no su mensaje (O10)', async () => {
    const fuente = { tomarVencidos: () => Promise.resolve([{ empresaId, ventaId: 'a' }]) };
    const fallas: { tipo: string }[] = [];
    const deLaBase = Object.assign(new Error('duplicate key ana@ejemplo.test'), { code: '23505' });
    const lote = new EnviarCorreosPendientes(fuente, { ejecutar: () => Promise.reject(new Error('envuelto', { cause: deLaBase })) }, true, (f) => fallas.push(f));
    await lote.ejecutar();
    expect(fallas[0]?.tipo).toBe('Error:23505');
  });

  it('sin proveedor configurado no toma correos: esperan sin gastar intentos (H5)', async () => {
    let tomados = 0;
    const fuente = { tomarVencidos: () => Promise.resolve(void tomados++).then(() => []) };
    const lote = new EnviarCorreosPendientes(fuente, { ejecutar: () => Promise.resolve() }, false);
    expect(await lote.ejecutar()).toEqual({ tomados: 0, conError: 0 });
    expect(tomados).toBe(0);
  });
});

describe('CorreoAlAceptar (HU-06.08)', () => {
  it('pide el correo solo si el comprador tiene dirección', async () => {
    const memoria = new VentasEnMemoria();
    memoria.guardadas.set('con', ventaDePrueba('con', compradorConCorreo()));
    memoria.guardadas.set('sin', ventaDePrueba('sin'));
    const repositorios = await memoria.ejecutar({ empresaId }, (r) => Promise.resolve(r));
    const avisos = new CorreoAlAceptar(repositorios.ventas, repositorios.correos);
    const ahora = new Date();
    expect(await avisos.documentoAceptado('envio-con', ahora)).toBe(true);
    expect(await avisos.documentoAceptado('envio-sin', ahora)).toBe(false);
    expect(await avisos.documentoAceptado('envio-otro', ahora)).toBe(false);
    expect([...memoria.correos.keys()]).toEqual(['con']);
  });
});
