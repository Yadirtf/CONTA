import type { Reloj } from '../../../../src/compartido/aplicacion/index.js';
import { CertificadoDeFirma } from '../../../../src/modulos/facturacion/aplicacion/firma/certificado-de-firma.js';
import { FirmadorXadesDian } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/firma/firmador-xades-dian.js';
import { GeneradorUblDian } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/ubl/generador-ubl-dian.js';
import {
  CONTRASENA_DE_PRUEBA,
  juegoDeCertificados,
  type JuegoDeCertificados,
} from '../../../recursos/firma/certificados-de-prueba.js';
import { configuracionDePrueba, facturaConDosLineas } from '../datos-de-prueba.js';

// Piezas comunes de las pruebas de firma: una factura sin firmar, un reloj fijo y el certificado de prueba.

export const AHORA = new Date();
export const relojFijo = (instante = AHORA): Reloj => ({
  ahora: () => instante,
});

export const facturaSinFirmar = () => new GeneradorUblDian().generar(facturaConDosLineas(), configuracionDePrueba());

export const certificadoDe = (juego: JuegoDeCertificados, contrasena = CONTRASENA_DE_PRUEBA) =>
  CertificadoDeFirma.de(juego.p12, contrasena);

export const firmador = (instante = AHORA) => new FirmadorXadesDian(relojFijo(instante));

export { juegoDeCertificados };
