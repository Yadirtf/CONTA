import { desglosarDesdeTotal, Dinero, ErrorDominio } from '../../../src/compartido/dominio/index.js';
import { Factura, LineaDeFactura, MomentoDeEmision, NumeroDeFactura, ResolucionDeNumeracion } from '../../../src/modulos/facturacion/dominio/index.js';
import { GeneradorUblDian } from '../../../src/modulos/facturacion/infraestructura/dian-directa/ubl/generador-ubl-dian.js';
import { erroresContraUblInvoice } from '../../recursos/dian/validador-xsd.js';
import { adquirenteDePrueba, configuracionDePrueba, emisorDePrueba } from './datos-de-prueba.js';

// HU-06.01: la línea se arma desde lo que paga el comprador, ya separado por el catálogo (HU-05.02), sin recalcular.

const gravada = (total: string, cantidad = '1') =>
  LineaDeFactura.desdeDesglose({
    descripcion: 'Gaseosa',
    cantidad,
    desglose: desglosarDesdeTotal(Dinero.de(total), { tipo: 'gravado', tarifa: '19' }),
    tarifaIva: '19',
  });

const excluida = (total: string) =>
  LineaDeFactura.desdeDesglose({
    descripcion: 'Arroz',
    cantidad: '1',
    desglose: desglosarDesdeTotal(Dinero.de(total), { tipo: 'excluido', tarifa: null }),
    tarifaIva: null,
  });

const codigo = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErrorDominio ? e.codigo : 'otro';
  }
  return 'ninguno';
};

const factura = (...lineas: LineaDeFactura[]) =>
  Factura.emitir({
    numero: NumeroDeFactura.de('SETP', 990000001),
    emision: MomentoDeEmision.desde(new Date('2026-11-27T15:00:00Z')),
    resolucion: ResolucionDeNumeracion.crear({ numero: '18760000001', prefijo: 'SETP', desde: 990000000, hasta: 995000000, vigenteDesde: '2019-01-19', vigenteHasta: '2030-01-19' }),
    emisor: emisorDePrueba(),
    adquirente: adquirenteDePrueba(),
    lineas,
    formaDePago: { metodo: 'contado', medio: '10', vence: null },
  });

describe('Línea de factura desde el total con IVA (HU-06.01)', () => {
  it('conserva el total anunciado al centavo: base + IVA = lo que se cobra', () => {
    const linea = gravada('7500', '3');
    expect(linea.total.aTexto()).toBe('7500.00');
    expect(linea.valor.aTexto()).toBe('6302.52');
    expect(linea.iva.aTexto()).toBe('1197.48');
    // El precio sin IVA de una unidad lleva hasta 6 decimales.
    expect(linea.precioUnitario.monto.aTexto()).toBe('2100.84');
  });

  it('una línea excluida no lleva tarifa ni IVA', () => {
    const linea = excluida('3200');
    expect(linea.tarifaIva).toBeNull();
    expect(linea.iva.esCero()).toBe(true);
  });

  it('rechaza un desglose que no suma o una línea excluida con IVA', () => {
    const roto = { base: Dinero.de('10'), iva: Dinero.de('2'), total: Dinero.de('11') };
    expect(codigo(() => LineaDeFactura.desdeDesglose({ descripcion: 'x', cantidad: '1', desglose: roto, tarifaIva: '19' }))).toBe('factura.desglose-invalido');
    const conIva = { base: Dinero.de('10'), iva: Dinero.de('1'), total: Dinero.de('11') };
    expect(codigo(() => LineaDeFactura.desdeDesglose({ descripcion: 'x', cantidad: '1', desglose: conIva, tarifaIva: null }))).toBe('factura.desglose-invalido');
  });

  it('lo excluido suma al total pero no a la base gravable ni al IVA de la factura', () => {
    const f = factura(gravada('11900'), excluida('3200'));
    expect(f.total.aTexto()).toBe('15100.00');
    expect(f.totalBruto.aTexto()).toBe('13200.00');
    expect(f.baseGravable.aTexto()).toBe('10000.00');
    expect(f.subtotalesIva.map((s) => s.tarifa)).toEqual(['19']);
  });

  it('en el XML la línea excluida no lleva TaxTotal y TaxExclusiveAmount es solo la base gravable', async () => {
    const { xml } = new GeneradorUblDian().generar(factura(gravada('11900'), excluida('3200')), configuracionDePrueba());
    expect(await erroresContraUblInvoice(xml)).toEqual([]);
    const lineas = xml.split('<cac:InvoiceLine>').slice(1);
    expect(lineas[0]).toContain('<cac:TaxTotal>');
    expect(lineas[1]).not.toContain('<cac:TaxTotal>');
    expect(xml).toContain('<cbc:TaxExclusiveAmount currencyID="COP">10000.00</cbc:TaxExclusiveAmount>');
    expect(xml).toContain('<cbc:PayableAmount currencyID="COP">15100.00</cbc:PayableAmount>');
  });

  it('una factura solo con lo excluido no lleva TaxTotal de IVA y sigue validando', async () => {
    const { xml } = new GeneradorUblDian().generar(factura(excluida('3200')), configuracionDePrueba());
    expect(xml).not.toContain('<cac:TaxTotal>');
    expect(await erroresContraUblInvoice(xml)).toEqual([]);
  });
});
