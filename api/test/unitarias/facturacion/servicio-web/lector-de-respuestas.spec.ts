import { FallaDeComunicacionDian } from '../../../../src/modulos/facturacion/aplicacion/envio/falla-de-comunicacion-dian.js';
import {
  leerAcuseDeRecibo,
  leerRespuestaDeValidacion,
} from '../../../../src/modulos/facturacion/infraestructura/dian-directa/servicio-web/lector-de-respuestas.js';
import * as grabadas from './respuestas-grabadas.js';

describe('lectura de las respuestas de la DIAN (HU-02.03)', () => {
  it('toma el ZipKey del acuse de recibo', () => {
    expect(leerAcuseDeRecibo(grabadas.ACUSE_RECIBIDO)).toEqual({ tipo: 'recibido', zipKey: '3f2a6b1c-0000-4000-8000-000000000abc' });
  });

  it('un acuse sin ZipKey es un rechazo con los mensajes de la DIAN', () => {
    const acuse = leerAcuseDeRecibo(grabadas.ACUSE_RECHAZADO);
    expect(acuse.tipo).toBe('rechazado');
    if (acuse.tipo === 'rechazado') expect(acuse.respuesta.mensajes).toEqual(['El set de pruebas no existe o ya fue aceptado']);
  });

  it('lee una validación aceptada', () => {
    const r = leerRespuestaDeValidacion(grabadas.VALIDACION_ACEPTADA);
    expect(r).toMatchObject({ valida: true, codigo: '00', mensajes: [] });
    expect(r.resultado).toBe('aceptado');
    expect(r.descripcion).toContain('ha sido autorizada');
    // HU-06.08: el ApplicationResponse se conserva para el contenedor que se entrega al comprador.
    expect(r.documento).toBe('PEFwcGxpY2F0aW9uUmVzcG9uc2UvPg==');
  });

  it('lee los códigos de rechazo legibles', () => {
    const r = leerRespuestaDeValidacion(grabadas.VALIDACION_RECHAZADA);
    expect(r.resultado).toBe('rechazado');
    expect(r.mensajes).toEqual([
      'Regla: FAD06, Rechazo: Valor del tributo no coincide con la base por la tarifa',
      'Regla: FAK24, Rechazo: No fue informado el elemento',
    ]);
  });

  it('una validación sin código sigue en proceso', () => {
    expect(leerRespuestaDeValidacion(grabadas.VALIDACION_EN_PROCESO).resultado).toBe('en-proceso');
  });

  it('un SOAP Fault, un XML roto o con DTD son fallas de comunicación', () => {
    expect(() => leerRespuestaDeValidacion(grabadas.FALLA_DE_SEGURIDAD)).toThrow(/verifying security/);
    expect(() => leerAcuseDeRecibo('<s:Envelope')).toThrow(FallaDeComunicacionDian);
    expect(() => leerAcuseDeRecibo('<!DOCTYPE x [<!ENTITY a "b">]><x/>')).toThrow(FallaDeComunicacionDian);
    expect(() => leerRespuestaDeValidacion(grabadas.ACUSE_RECIBIDO)).toThrow(/DianResponse/);
  });
});
