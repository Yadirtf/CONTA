import type { UnidadDeTrabajo } from '../../../../src/compartido/aplicacion/index.js';
import { IdEmpresa } from '../../../../src/compartido/dominio/index.js';
import { ProcesarEnvioDian } from '../../../../src/modulos/facturacion/aplicacion/comandos/procesar-envio-dian.js';
import { ProcesarTrabajosVencidos } from '../../../../src/modulos/facturacion/aplicacion/comandos/procesar-trabajos-vencidos.js';
import { AccesoDianNoConfigurado } from '../../../../src/modulos/facturacion/aplicacion/envio/acceso-dian-no-configurado.js';
import { FallaDeComunicacionDian } from '../../../../src/modulos/facturacion/aplicacion/envio/falla-de-comunicacion-dian.js';
import { CertificadoDeFirma } from '../../../../src/modulos/facturacion/aplicacion/firma/certificado-de-firma.js';
import type { IntentoDeEnvio } from '../../../../src/modulos/facturacion/aplicacion/puertos/registro-de-intentos.js';
import type { RepositoriosDeEnvio } from '../../../../src/modulos/facturacion/aplicacion/puertos/repositorios-de-envio.js';
import type { ServicioWebDian } from '../../../../src/modulos/facturacion/aplicacion/puertos/servicio-web-dian.js';
import { EnvioDian, esperaTrasFalla, RespuestaDeLaDian } from '../../../../src/modulos/facturacion/dominio/index.js';

// Casos de uso del envío con dobles en memoria: sin red ni base de datos.

const T0 = new Date('2026-11-23T15:00:00Z');
const empresaId = IdEmpresa.de('00000000-0000-4000-8000-000000000001');
const TEST_SET_ID = 'set-de-pruebas-reservado';

function memoria() {
  const envio = EnvioDian.solicitar('e1', 'a'.repeat(96), 'SETP1', T0);
  const intentos: IntentoDeEnvio[] = [];
  const cola: { encolados: Date[]; completados: number } = { encolados: [], completados: 0 };
  const avisados: string[] = [];
  const repositorios: RepositoriosDeEnvio = {
    envios: {
      buscar: () => Promise.resolve(EnvioDian.reconstituir(envio.instantanea())),
      buscarPorCufe: () => Promise.resolve(null),
      documentoDe: () => Promise.resolve({ xmlFirmado: '<Invoice/>', nitEmisor: '900373076', anio: 2026, consecutivo: 1 }),
      siguienteConsecutivo: () => Promise.resolve(1),
      crear: () => Promise.resolve(),
      actualizar: (nuevo) => {
        Object.assign(envio, EnvioDian.reconstituir(nuevo.instantanea()));
        return Promise.resolve(true);
      },
    },
    intentos: { agregar: (i) => Promise.resolve(void intentos.push(i)) },
    cola: {
      encolar: (_t, cuando) => Promise.resolve(void cola.encolados.push(cuando)),
      completar: () => Promise.resolve(void (cola.completados += 1)),
    },
    avisos: {
      documentoAceptado: (id) => {
        avisados.push(id);
        return Promise.resolve(false);
      },
    },
  };
  const uow: UnidadDeTrabajo<RepositoriosDeEnvio> = { ejecutar: (_c, trabajo) => trabajo(repositorios) };
  return { envio, intentos, cola, uow, avisados };
}

const accesoValido = { para: () => Promise.resolve({ certificado: CertificadoDeFirma.de(new Uint8Array([1]), 'clave-secreta'), testSetId: TEST_SET_ID }) };
const reloj = { ahora: () => T0 };

function procesador(servicio: Partial<ServicioWebDian>, acceso = accesoValido) {
  const m = memoria();
  const despertador = { programar: vi.fn() };
  const completo: ServicioWebDian = {
    enviarSetDePruebas: () => Promise.reject(new Error('no se esperaba')),
    consultarValidacion: () => Promise.reject(new Error('no se esperaba')),
    ...servicio,
  };
  return { ...m, despertador, procesar: new ProcesarEnvioDian(m.uow, completo, acceso, reloj, despertador) };
}

describe('ProcesarEnvioDian (HU-02.03)', () => {
  it('con acuse de recibo guarda el ZipKey, registra el intento y programa la consulta', async () => {
    const p = procesador({ enviarSetDePruebas: () => Promise.resolve({ tipo: 'recibido', zipKey: 'zip-1' }) });
    await p.procesar.ejecutar({ empresaId, envioId: 'e1' });
    expect(p.envio.estado).toBe('en-validacion');
    expect(p.intentos).toEqual([expect.objectContaining({ numero: 1, operacion: 'SendTestSetAsync', resultado: 'recibido' })]);
    expect(p.cola.encolados).toHaveLength(1);
    expect(p.despertador.programar).toHaveBeenCalledWith(p.envio.proximoIntentoEn);
  });

  it('al aceptarse avisa en la misma transacción (HU-06.08: correo al comprador)', async () => {
    const p = procesador({ enviarSetDePruebas: () => Promise.resolve({ tipo: 'recibido', zipKey: 'zip-1' }) });
    await p.procesar.ejecutar({ empresaId, envioId: 'e1' });
    expect(p.avisados).toEqual([]);
    const aceptada = RespuestaDeLaDian.de({ valida: true, codigo: '00', descripcion: 'ok', mensajes: [] });
    const q = procesador({ consultarValidacion: () => Promise.resolve(aceptada) });
    q.envio.recibido('zip-1', T0);
    Object.assign(q.envio, EnvioDian.reconstituir({ ...q.envio.instantanea(), proximoIntentoEn: T0 }));
    await q.procesar.ejecutar({ empresaId, envioId: 'e1' });
    expect(q.envio.estado).toBe('aceptado');
    expect(q.avisados).toEqual(['e1']);
  });

  it('una falla de comunicación cuenta como intento y se reintenta más tarde', async () => {
    const p = procesador({ enviarSetDePruebas: () => Promise.reject(new FallaDeComunicacionDian('tiempo de espera agotado')) });
    await p.procesar.ejecutar({ empresaId, envioId: 'e1' });
    expect(p.envio.estado).toBe('pendiente');
    expect(p.envio.proximoIntentoEn).toEqual(new Date(T0.getTime() + esperaTrasFalla(1)));
    expect(p.intentos[0]).toMatchObject({ resultado: 'falla-de-comunicacion', detalle: expect.stringContaining('tiempo de espera') });
  });

  it('sin acceso configurado registra el motivo y no expone datos reservados', async () => {
    const p = procesador({}, { para: () => Promise.reject(new AccesoDianNoConfigurado()) });
    await p.procesar.ejecutar({ empresaId, envioId: 'e1' });
    expect(p.intentos[0]?.detalle).toMatch(/no tiene configurado el acceso/);
  });

  it('el detalle de un error ajeno solo dice su tipo: nunca su mensaje, que podría traer secretos', async () => {
    const p = procesador({ enviarSetDePruebas: () => Promise.reject(new TypeError(`fallo con ${TEST_SET_ID} y clave-secreta`)) });
    await p.procesar.ejecutar({ empresaId, envioId: 'e1' });
    expect(p.intentos[0]?.detalle).toBe('Error inesperado (TypeError)');
  });

  it('un envío terminado sale de la cola sin llamar a la DIAN', async () => {
    const p = procesador({ consultarValidacion: vi.fn() });
    p.envio.recibido('zip', T0);
    p.envio.respondido(RespuestaDeLaDian.de({ valida: true, codigo: '00', descripcion: '', mensajes: [] }), T0);
    await p.procesar.ejecutar({ empresaId, envioId: 'e1' });
    expect(p.cola.completados).toBe(1);
    expect(p.intentos).toEqual([]);
  });
});

describe('ProcesarTrabajosVencidos (HU-02.03)', () => {
  it('sigue con el lote aunque un trabajo falle', async () => {
    const trabajos = [1, 2, 3].map((n) => ({ empresaId, envioId: `e${n}` }));
    const procesar = { ejecutar: vi.fn((t: { envioId: string }) => (t.envioId === 'e2' ? Promise.reject(new Error('x')) : Promise.resolve())) };
    const lote = new ProcesarTrabajosVencidos({ tomarVencidos: () => Promise.resolve(trabajos) }, procesar, reloj);
    expect(await lote.ejecutar()).toEqual({ tomados: 3, conError: 1 });
    expect(procesar.ejecutar).toHaveBeenCalledTimes(3);
  });
});
