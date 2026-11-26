import { DecimalExacto, Dinero } from '../dinero/index.js';
import { porcentajeDe } from './tarifa-iva.js';
import { cobraIva, type TratamientoDeIva } from './tratamiento-de-iva.js';

/** Un valor separado en base gravable e IVA, en pesos con 2 decimales. Siempre base + iva = total, exacto. */
export interface Desglose {
  /** Valor sin IVA. En un producto excluido no es base gravable: la factura no lo suma al IVA. */
  readonly base: Dinero;
  readonly iva: Dinero;
  readonly total: Dinero;
}

const CIEN = DecimalExacto.desde('100');

/**
 * Separa un valor que ya trae el IVA incluido (HU-05.02): lo que paga el comprador queda igual, al centavo.
 * La base se redondea una sola vez (mitad al par, anexo técnico 1.9, sección 5.2.1) y el IVA es lo que falta
 * para llegar al total, así nunca aparece ni se pierde un centavo. Ese IVA difiere de base × tarifa en menos de
 * un centavo (|iva − base × t| ≤ 0,006), dentro de la tolerancia de la DIAN. Con cantidad, se separa el total
 * de la línea ya redondeado (precio × cantidad), nunca el precio unitario: así el comprador paga lo anunciado.
 */
export function desglosarDesdeTotal(total: Dinero, tratamiento: TratamientoDeIva): Desglose {
  const cobrado = total.redondear();
  if (!cobraIva(tratamiento)) return sinIva(cobrado);
  // base = total / (1 + t/100) = total × 100 / (100 + t), redondeada una sola vez y directo a 2 decimales.
  const divisor = CIEN.sumar(porcentajeDe(tratamiento.tarifa));
  const base = Dinero.de(cobrado.monto.multiplicar(CIEN).dividir(divisor, 2), cobrado.moneda);
  return { base, iva: cobrado.restar(base), total: cobrado };
}

/** Separa un valor sin IVA: el IVA es base × tarifa redondeado y el total, su suma. */
export function desglosarDesdeBase(base: Dinero, tratamiento: TratamientoDeIva): Desglose {
  const gravable = base.redondear();
  if (!cobraIva(tratamiento)) return sinIva(gravable);
  const iva = gravable.porcentaje(porcentajeDe(tratamiento.tarifa)).redondear();
  return { base: gravable, iva, total: gravable.sumar(iva) };
}

const sinIva = (valor: Dinero): Desglose => ({ base: valor, iva: Dinero.cero(valor.moneda), total: valor });
