import { BaseDeDatos } from '../../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { ProcesarEnvioDian } from '../../../src/modulos/facturacion/aplicacion/comandos/procesar-envio-dian.js';
import { SolicitarEnvioDian } from '../../../src/modulos/facturacion/aplicacion/comandos/solicitar-envio-dian.js';
import { CertificadoDeFirma } from '../../../src/modulos/facturacion/aplicacion/firma/certificado-de-firma.js';
import type { AcuseDeRecibo, ServicioWebDian } from '../../../src/modulos/facturacion/aplicacion/puertos/servicio-web-dian.js';
import { RespuestaDeLaDian } from '../../../src/modulos/facturacion/dominio/index.js';
import { TrabajosVencidosPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/trabajos-vencidos-postgres.js';
import { comoEmpresa, enTransaccionDeshecha, errorDe, hayBase } from '../aislamiento/base-de-pruebas.js';
import { cufeAlAzar, nuevaEmpresa, RelojDePrueba, unidadDeTrabajoDeEnvios } from './apoyo.js';

// HU-02.03 de punta a punta contra PostgreSQL real, con una DIAN falsa: se guarda la respuesta, el estado
// llega a «aceptado» o «rechazado» con sus mensajes, cada llamada queda registrada y nada se envía dos veces.

const ACEPTADA = RespuestaDeLaDian.de({ valida: true, codigo: '00', descripcion: 'Procesado Correctamente.', mensajes: [] });
const RECHAZADA = RespuestaDeLaDian.de({
  valida: false,
  codigo: '99',
  descripcion: 'Validación contiene errores en campos mandatorios.',
  mensajes: ['Regla: FAD06, Rechazo: Valor del tributo no coincide'],
});

function dianFalsa(respuesta: RespuestaDeLaDian, acuse: AcuseDeRecibo = { tipo: 'recibido', zipKey: 'zip-de-prueba' }) {
  const llamadas = { envios: 0, consultas: 0 };
  const servicio: ServicioWebDian = {
    enviarSetDePruebas: async () => {
      llamadas.envios += 1;
      await new Promise((r) => setTimeout(r, 20));
      return acuse;
    },
    consultarValidacion: () => {
      llamadas.consultas += 1;
      return Promise.resolve(respuesta);
    },
  };
  return { servicio, llamadas };
}

describe.skipIf(!hayBase)('envío a la DIAN con cola durable (integración)', () => {
  let baseDeDatos: BaseDeDatos;
  const acceso = { para: () => Promise.resolve({ certificado: CertificadoDeFirma.de(new Uint8Array([1]), 'x'), testSetId: 'set' }) };
  const despertador = { programar: vi.fn() };

  beforeAll(() => {
    baseDeDatos = new BaseDeDatos(process.env, 3);
  });
  afterAll(async () => {
    await baseDeDatos?.cerrar();
  });

  async function escenario(respuesta: RespuestaDeLaDian, acuse?: AcuseDeRecibo) {
    const empresaId = await nuevaEmpresa(baseDeDatos);
    const reloj = new RelojDePrueba();
    const uow = unidadDeTrabajoDeEnvios(baseDeDatos);
    const dian = dianFalsa(respuesta, acuse);
    const solicitar = new SolicitarEnvioDian(uow, reloj, despertador);
    const procesar = new ProcesarEnvioDian(uow, dian.servicio, acceso, reloj, despertador);
    const cufe = cufeAlAzar();
    const documento = { xml: '<Invoice/>', cufe };
    const { envioId } = await solicitar.ejecutar({ empresaId }, { documento, numero: 'SETP990000001', nitEmisor: '900373076' });
    const trabajo = { empresaId, envioId };
    return { empresaId, reloj, uow, dian, solicitar, procesar, trabajo, cufe, documento, envioId };
  }

  async function filaDelEnvio(e: Awaited<ReturnType<typeof escenario>>) {
    return e.uow.ejecutar({ empresaId: e.empresaId }, ({ envios }) => envios.buscar(e.envioId));
  }

  it('una factura válida termina «aceptada», con la respuesta guardada y cada intento registrado', async () => {
    const e = await escenario(ACEPTADA);
    await e.procesar.ejecutar(e.trabajo);
    expect((await filaDelEnvio(e))?.estado).toBe('en-validacion');

    e.reloj.adelantar(60_000);
    await e.procesar.ejecutar(e.trabajo);
    const envio = await filaDelEnvio(e);
    expect(envio?.estado).toBe('aceptado');
    expect(envio?.respuesta?.codigo).toBe('00');
    expect(envio?.zipKey).toBe('zip-de-prueba');
    expect(e.dian.llamadas).toEqual({ envios: 1, consultas: 1 });
  });

  it('una factura con error termina «rechazada» con sus códigos de rechazo legibles', async () => {
    const e = await escenario(RECHAZADA);
    await e.procesar.ejecutar(e.trabajo);
    e.reloj.adelantar(60_000);
    await e.procesar.ejecutar(e.trabajo);
    const envio = await filaDelEnvio(e);
    expect(envio?.estado).toBe('rechazado');
    expect(envio?.respuesta?.mensajes).toEqual(['Regla: FAD06, Rechazo: Valor del tributo no coincide']);
  });

  it('pedir dos veces el mismo documento no crea otro envío', async () => {
    const e = await escenario(ACEPTADA);
    const otra = await e.solicitar.ejecutar({ empresaId: e.empresaId }, { documento: e.documento, numero: 'SETP990000001', nitEmisor: '900373076' });
    expect(otra).toEqual({ envioId: e.envioId, estado: 'pendiente', nuevo: false });
  });

  it('dos procesadores a la vez llaman a la DIAN una sola vez con efecto', async () => {
    const e = await escenario(ACEPTADA);
    await Promise.all([e.procesar.ejecutar(e.trabajo), e.procesar.ejecutar(e.trabajo)]);
    const envio = await filaDelEnvio(e);
    expect(envio?.estado).toBe('en-validacion');
    expect(envio?.intentos).toBe(1);
  });

  it('la fuente de vencidos entrega el trabajo una sola vez mientras está reservado', async () => {
    const e = await escenario(ACEPTADA);
    const fuente = new TrabajosVencidosPostgres(baseDeDatos);
    const propios = (t: { envioId: string }[]) => t.filter((x) => x.envioId === e.envioId);
    const futuro = new Date(e.reloj.ahora().getTime() + 1000);
    expect(propios(await fuente.tomarVencidos(futuro, 1000))).toHaveLength(1);
    expect(propios(await fuente.tomarVencidos(futuro, 1000))).toHaveLength(0);
  });

  it('los intentos quedan registrados y el envío no deja cambiar su documento ni borrarse', async () => {
    const e = await escenario(ACEPTADA);
    await e.procesar.ejecutar(e.trabajo);
    await enTransaccionDeshecha(async (cliente) => {
      await comoEmpresa(cliente, e.empresaId.valor);
      const intentos = await cliente.query('SELECT operacion, resultado, numero FROM conta.intentos_envio_dian WHERE envio_id = $1', [e.envioId]);
      expect(intentos.rows).toEqual([{ operacion: 'SendTestSetAsync', resultado: 'recibido', numero: 1 }]);
      const cambiar = await errorDe(cliente, `UPDATE conta.envios_dian SET xml_firmado = '<otro/>' WHERE id = $1`, [e.envioId]);
      expect(cambiar?.message).toMatch(/permission denied/);
      const borrar = await errorDe(cliente, 'DELETE FROM conta.envios_dian WHERE id = $1', [e.envioId]);
      expect(borrar?.message).toMatch(/permission denied/);
      const borrarIntento = await errorDe(cliente, 'DELETE FROM conta.intentos_envio_dian WHERE envio_id = $1', [e.envioId]);
      expect(borrarIntento?.message).toMatch(/permission denied/);
    });
  });

  it('una empresa no puede encolar trabajos a nombre de otra', async () => {
    const e = await escenario(ACEPTADA);
    const otra = await nuevaEmpresa(baseDeDatos);
    const intento = e.uow.ejecutar({ empresaId: otra }, ({ cola }) => cola.encolar(e.trabajo, new Date()));
    await expect(intento).rejects.toThrow();
  });
});
