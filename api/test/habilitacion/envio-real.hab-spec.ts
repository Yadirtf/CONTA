import { CertificadoDeFirma } from '../../src/modulos/facturacion/aplicacion/firma/certificado-de-firma.js';
import { FirmadorXadesDian } from '../../src/modulos/facturacion/infraestructura/dian-directa/firma/firmador-xades-dian.js';
import { ServicioWebDianDirecto } from '../../src/modulos/facturacion/infraestructura/dian-directa/servicio-web/servicio-web-dian-directo.js';
import { GeneradorUblDian } from '../../src/modulos/facturacion/infraestructura/dian-directa/ubl/generador-ubl-dian.js';
import type { RespuestaDeLaDian } from '../../src/modulos/facturacion/dominio/index.js';
import { configuracionDeHabilitacion, datosDeHabilitacion, facturaDeHabilitacion } from './datos-de-habilitacion.js';

// Prueba REAL contra el ambiente de habilitación de la DIAN (HU-02.03). Solo corre desde el workflow
// «Habilitación DIAN» con el entorno SECRETOS; en cualquier otro lado se omite. Imprime solo datos públicos:
// número, CUFE, ZipKey y la respuesta de la DIAN. Nunca el certificado ni su contraseña.

const datos = datosDeHabilitacion();
const reloj = { ahora: () => new Date() };
const ESPERA_MS = 5_000;
const CONSULTAS = 24;

describe.runIf(datos !== null)('envío real al set de pruebas de habilitación (HU-02.03)', () => {
  it('la DIAN recibe la factura firmada y la valida como aceptada', async () => {
    if (!datos) return;
    const acceso = {
      certificado: CertificadoDeFirma.de(Buffer.from(datos.DIAN_HAB_P12_BASE64, 'base64'), datos.DIAN_HAB_P12_CONTRASENA),
      testSetId: datos.DIAN_HAB_TEST_SET_ID,
    };
    const ahora = reloj.ahora();
    const factura = facturaDeHabilitacion(datos.DIAN_HAB_NIT, ahora);
    const documento = new GeneradorUblDian().generar(factura, configuracionDeHabilitacion(datos));
    const xmlFirmado = new FirmadorXadesDian(reloj).firmar(documento.xml, acceso.certificado);
    console.warn(`factura ${factura.numero.aTexto()} · CUFE ${documento.cufe}`);

    const servicio = new ServicioWebDianDirecto(reloj);
    const acuse = await servicio.enviarSetDePruebas(
      { xmlFirmado, nitEmisor: datos.DIAN_HAB_NIT, anio: ahora.getUTCFullYear(), consecutivo: Math.floor(Math.random() * 0xffffff) + 1 },
      acceso,
    );
    if (acuse.tipo === 'rechazado') {
      imprimir(acuse.respuesta);
      expect.fail('la DIAN no recibió el paquete');
    }
    console.warn(`recibido · ZipKey ${acuse.zipKey}`);

    let respuesta = await servicio.consultarValidacion(acuse.zipKey, acceso);
    for (let i = 1; i < CONSULTAS && respuesta.resultado === 'en-proceso'; i++) {
      await new Promise((r) => setTimeout(r, ESPERA_MS));
      respuesta = await servicio.consultarValidacion(acuse.zipKey, acceso);
    }
    imprimir(respuesta);
    expect(respuesta.resultado).toBe('aceptado');
  }, 180_000);
});

function imprimir(r: RespuestaDeLaDian): void {
  console.warn(`DIAN ${r.codigo || '(sin código)'} · ${r.resultado} · ${r.descripcion}`);
  for (const m of r.mensajes) console.warn(`  - ${m}`);
}
