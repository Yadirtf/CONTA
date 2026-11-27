import type pg from 'pg';
import type { FabricaDeFilas } from './fabricas.js';
import { crearResolucion, insertarEnvioDian, insertarVenta } from './fabricas.js';

// Fábricas de las tablas de HU-06.08. Todas necesitan una venta aceptada por la DIAN con comprador con correo, que
// conta_api no puede fabricar (la aceptación la escribe el envío): se insertan como dueño.

const COMPRADOR_CON_CORREO = JSON.stringify({
  tipoIdentificacion: '13',
  numero: '1020304050',
  razonSocial: 'Ana Pérez',
  tipoDePersona: 'natural',
  correo: 'ana@ejemplo.test',
});

/** Empresa con una venta cuya factura la DIAN aceptó. Devuelve la venta y su envío. */
export async function ventaAceptada(dueno: pg.Client, empresaId: string): Promise<{ ventaId: string; envioId: string }> {
  await dueno.query('INSERT INTO conta.empresas (id, razon_social) VALUES ($1, $2)', [empresaId, `Empresa ${empresaId}`]);
  const ventaId = await insertarVenta(dueno, empresaId, await crearResolucion(dueno, empresaId), COMPRADOR_CON_CORREO);
  const envioId = await insertarEnvioDian(dueno, empresaId);
  await dueno.query(`UPDATE conta.envios_dian SET estado = 'aceptado' WHERE empresa_id = $1 AND id = $2`, [empresaId, envioId]);
  await dueno.query('INSERT INTO conta.emisiones_de_venta (empresa_id, venta_id, envio_id) VALUES ($1, $2, $3)', [empresaId, ventaId, envioId]);
  return { ventaId, envioId };
}

async function correoPedido(dueno: pg.Client, empresaId: string): Promise<string> {
  const { ventaId } = await ventaAceptada(dueno, empresaId);
  await dueno.query(
    `INSERT INTO conta.correos_de_factura (empresa_id, venta_id, estado, intentos, proximo_intento_en) VALUES ($1, $2, 'pendiente', 0, now())`,
    [empresaId, ventaId],
  );
  return ventaId;
}

const comun = { columnaEmpresa: 'empresa_id', empresaInmutable: true, delDueno: true } as const;

export const FABRICAS_DE_CORREOS: Readonly<Record<string, FabricaDeFilas>> = {
  'conta.respuestas_de_aceptacion': {
    ...comun,
    columnaId: 'envio_id',
    async insertar(dueno, empresaId) {
      const { envioId } = await ventaAceptada(dueno, empresaId);
      await dueno.query(`INSERT INTO conta.respuestas_de_aceptacion (empresa_id, envio_id, xml_base64) VALUES ($1, $2, 'PEE+')`, [empresaId, envioId]);
      return envioId;
    },
  },
  'conta.correos_de_factura': { ...comun, columnaId: 'venta_id', insertar: correoPedido },
  'conta.intentos_correo_de_factura': {
    ...comun,
    columnaId: 'venta_id',
    async insertar(dueno, empresaId) {
      const ventaId = await correoPedido(dueno, empresaId);
      await dueno.query(
        `INSERT INTO conta.intentos_correo_de_factura (empresa_id, venta_id, numero, resultado, detalle, duracion_ms, ocurrido_en)
         VALUES ($1, $2, 1, 'falla-pasajera', 'correo.http-503', 10, now())`,
        [empresaId, ventaId],
      );
      return ventaId;
    },
  },
};
