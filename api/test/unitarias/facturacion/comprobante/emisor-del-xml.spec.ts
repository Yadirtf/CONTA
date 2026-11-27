import { Factura, participante } from '../../../../src/modulos/facturacion/dominio/index.js';
import { emisorDelXml } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/ubl/emisor-del-xml.js';
import { GeneradorUblDian } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/ubl/generador-ubl-dian.js';
import { configuracionDePrueba, emisorDePrueba, facturaConDosLineas } from '../datos-de-prueba.js';

// H1 de la prueba de ataque de HU-06.08: el comprobante lee al emisor del XML firmado, no de la configuración de hoy.
describe('emisorDelXml (HU-06.08)', () => {
  const generador = new GeneradorUblDian();

  it('devuelve el mismo emisor que se escribió en la factura', () => {
    const { xml } = generador.generar(facturaConDosLineas(), configuracionDePrueba());
    expect(emisorDelXml(xml)).toEqual(emisorDePrueba());
  });

  it('lee también un emisor sin correo y no responsable de IVA', () => {
    const emisor = participante({ ...emisorDePrueba(), correo: null, responsableDeIva: false });
    const base = facturaConDosLineas();
    const factura = Factura.emitir({
      numero: base.numero,
      emision: base.emision,
      resolucion: base.resolucion,
      emisor,
      adquirente: base.adquirente,
      lineas: base.lineas,
      formaDePago: base.formaDePago,
    });
    const { xml } = generador.generar(factura, configuracionDePrueba());
    expect(emisorDelXml(xml)).toEqual(emisor);
  });

  it('no lee un XML con DTD ni uno sin emisor', () => {
    expect(() => emisorDelXml('<!DOCTYPE x [<!ENTITY e "a">]><Invoice/>')).toThrow(/DTD/);
    expect(() => emisorDelXml('<Invoice/>')).toThrow(/AccountingSupplierParty/);
  });
});
