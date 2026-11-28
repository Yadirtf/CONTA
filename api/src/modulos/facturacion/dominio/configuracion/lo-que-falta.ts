/** Qué tiene guardado la empresa, visto desde lo que necesita para facturar (HU-07.04). */
export interface LoGuardado {
  readonly datosFiscales: boolean;
  readonly resolucionDeFacturaVigente: boolean;
  readonly softwareDeFactura: boolean;
  readonly resolucionPosVigente: boolean;
  readonly softwareDePos: boolean;
  readonly siempreFactura: boolean;
}

export interface LoQueFalta {
  /** Con esto ya sale la factura electrónica (falta solo el certificado, que llega con HU-07.02). */
  readonly puedeFacturar: boolean;
  /** El tiquete POS es opcional: sale solo si está completo y el negocio no pidió «siempre factura». */
  readonly posActivo: boolean;
  /** Lo que falta para facturar, en el orden en que se recomienda llenarlo. */
  readonly pendientes: readonly ('datos-fiscales' | 'resolucion-factura' | 'software-factura')[];
}

/** La lista de «lo que falta para facturar» de la pantalla; HU-07.01 la usará como evidencia de los pasos. */
export function loQueFalta(g: LoGuardado): LoQueFalta {
  const pendientes = [
    ...(g.datosFiscales ? [] : (['datos-fiscales'] as const)),
    ...(g.resolucionDeFacturaVigente ? [] : (['resolucion-factura'] as const)),
    ...(g.softwareDeFactura ? [] : (['software-factura'] as const)),
  ];
  const puedeFacturar = pendientes.length === 0;
  return { puedeFacturar, posActivo: puedeFacturar && g.resolucionPosVigente && g.softwareDePos && !g.siempreFactura, pendientes };
}
