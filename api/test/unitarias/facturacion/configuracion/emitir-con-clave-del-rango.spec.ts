import type { ContextoDeMiembro } from '../../../../src/compartido/aplicacion/index.js';
import { IdEmpresa, IdUsuario } from '../../../../src/compartido/dominio/index.js';
import { EmitirVenta } from '../../../../src/modulos/facturacion/aplicacion/comandos/emitir-venta.js';
import { RegistrarVenta } from '../../../../src/modulos/facturacion/aplicacion/comandos/registrar-venta.js';
import type { ConfiguracionDian } from '../../../../src/modulos/facturacion/aplicacion/puertos/generador-de-documento-electronico.js';
import { pedidoDeVenta } from '../../../../src/modulos/facturacion/dominio/index.js';
import { configuracionDePrueba } from '../datos-de-prueba.js';
import { PRODUCTO_GRAVADO } from '../ventas/apoyo.js';
import { CatalogoEnMemoria, VentasEnMemoria } from '../ventas/ventas-en-memoria.js';

// HU-07.04: la DIAN da una clave técnica por rango de factura. La de la resolución de la venta entra al CUFE; sin
// ella, vale la del software.

const cajero: ContextoDeMiembro = {
  empresaId: IdEmpresa.de('aaaaaaaa-0000-4000-8000-000000000001'),
  usuarioId: IdUsuario.de('bbbbbbbb-0000-4000-8000-000000000001'),
  rol: 'cajero',
  modo: 'simple',
};

async function claveUsada(claveDelRango: string | null): Promise<string> {
  const ventas = new VentasEnMemoria();
  ventas.claveDelRango = claveDelRango;
  const configuracion = { para: () => Promise.resolve({ configuracion: configuracionDePrueba(), nitDelFacturador: '900373076' }) };
  const usadas: ConfiguracionDian[] = [];
  const emitir = new EmitirVenta(
    ventas,
    configuracion,
    { para: () => Promise.resolve({ certificado: {} as never, testSetId: 'set' }) },
    {
      ejecutar: (_f, c) => {
        usadas.push(c);
        return { xml: '<x/>', cufe: 'c' };
      },
    },
    { ejecutar: () => ({ xml: '<x/>', cufe: 'c' }) },
    { ejecutar: () => Promise.resolve({ envioId: 'envio-1', nuevo: true }) as never },
    { ahora: () => new Date('2026-11-27T15:00:00Z') },
  );
  const registrar = new RegistrarVenta(
    ventas,
    new CatalogoEnMemoria(),
    configuracion,
    { ejecutar: () => Promise.resolve() },
    { ahora: () => new Date('2026-11-27T15:00:00Z') },
    { programar: () => undefined },
  );
  const p = pedidoDeVenta({
    id: 'cccccccc-0000-4000-8000-000000000001',
    lineas: [{ productoId: PRODUCTO_GRAVADO, cantidad: '1' }],
    compradorId: null,
    medioDePago: 'efectivo',
    documento: 'factura',
  });
  await registrar.ejecutar(cajero, p);
  await emitir.ejecutar(cajero, p.id);
  return usadas[0]?.claveTecnica ?? 'ninguna';
}

describe('EmitirVenta con la clave técnica del rango (HU-07.04)', () => {
  it('usa la clave guardada con la resolución de la venta', async () => {
    expect(await claveUsada('clave-del-rango-1')).toBe('clave-del-rango-1');
  });

  it('sin clave en la resolución, usa la del software', async () => {
    expect(await claveUsada(null)).toBe(configuracionDePrueba().claveTecnica);
  });
});
