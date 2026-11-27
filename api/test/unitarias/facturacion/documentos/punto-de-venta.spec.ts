import { configuracionPosDePrueba, emisorDePrueba } from '../datos-de-prueba.js';
import { codigoDe } from '../ventas/apoyo.js';
import { resolucionPos, ventaPos } from './datos-pos.js';
import { GeneradorUblDian } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/ubl/generador-ubl-dian.js';
import { participante, puntoDeVenta } from '../../../../src/modulos/facturacion/dominio/index.js';

// HU-06.02: los datos de la caja del tiquete POS (extensión PuntoVenta).

const caja = { placa: 'CONTA-APP', ubicacion: 'Calle 1', cajero: 'Usuario 1', tipo: 'Celular', codigoDeVenta: 'EPOS1' };
const mitadDeUnPar = /\p{Surrogate}/u;

describe('puntoDeVenta', () => {
  it('corta a 200 caracteres completos: un emoji en el corte no queda partido (H2)', () => {
    const ubicacion = puntoDeVenta({ ...caja, ubicacion: `${'a'.repeat(199)}😀😀x` }).ubicacion;
    expect(Array.from(ubicacion)).toHaveLength(200);
    expect(ubicacion.endsWith('😀')).toBe(true);
    expect(mitadDeUnPar.test(ubicacion)).toBe(false);
  });

  it('un dato vacío después de limpiar no arma la caja', () => {
    expect(codigoDe(() => puntoDeVenta({ ...caja, cajero: ' \u0001 ' }))).toBe('pos.punto-de-venta-incompleto');
  });

  it('una dirección larga con emoji en el corte deja armar y escribir el tiquete POS (H2)', () => {
    const base = emisorDePrueba();
    const direccion = { ...base.direccion!, linea: `${'b'.repeat(199)}😀 resto` };
    const emisor = participante({ ...base, direccion });
    const documento = ventaPos().aFactura(emisor, resolucionPos());
    expect(mitadDeUnPar.test(documento.puntoDeVenta!.ubicacion)).toBe(false);
    const { xml } = new GeneradorUblDian().generar(documento, configuracionPosDePrueba());
    expect(xml).toContain('😀');
  });
});
