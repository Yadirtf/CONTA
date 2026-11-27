import { BadRequestException } from '@nestjs/common';
import { MAXIMO_DE_LINEAS, pedidoDeVenta, type PedidoDeVenta } from '../../../dominio/index.js';

// Solo la forma de la petición; las reglas las aplica el dominio. Un campo que no se espera (un precio, un IVA, un
// total) se rechaza: la venta nunca toma montos de la app (hallazgo B del contrapunto).
const CAMPOS_DE_LA_VENTA = new Set(['id', 'lineas', 'compradorId', 'medioDePago', 'documento']);
const CAMPOS_DE_LA_LINEA = new Set(['productoId', 'cantidad']);
const LARGO_MAXIMO_CORTO = 40;

const campoInvalido = (campo: string) =>
  new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: `Revisa el campo ${campo}` });

function objetoCon(valor: unknown, permitidos: ReadonlySet<string>, campo: string): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) throw campoInvalido(campo);
  const extra = Object.keys(valor).find((k) => !permitidos.has(k));
  if (extra !== undefined) throw campoInvalido(campo === 'cuerpo' ? extra.slice(0, LARGO_MAXIMO_CORTO) : campo);
  return valor as Record<string, unknown>;
}

const textoCorto = (valor: unknown): valor is string => typeof valor === 'string' && valor.length <= LARGO_MAXIMO_CORTO;

/** Lee el cuerpo de POST /ventas. La cantidad llega como texto: un number ya habría perdido precisión. */
export function pedidoDe(cuerpo: unknown): PedidoDeVenta {
  const campos = objetoCon(cuerpo, CAMPOS_DE_LA_VENTA, 'cuerpo');
  const { id, lineas, compradorId, medioDePago, documento } = campos;
  if (!textoCorto(id)) throw campoInvalido('id');
  if (!Array.isArray(lineas) || lineas.length > MAXIMO_DE_LINEAS) throw campoInvalido('lineas');
  if (compradorId !== undefined && compradorId !== null && !textoCorto(compradorId)) throw campoInvalido('compradorId');
  if (!textoCorto(medioDePago)) throw campoInvalido('medioDePago');
  if (documento !== undefined && !textoCorto(documento)) throw campoInvalido('documento');
  return pedidoDeVenta({
    id,
    lineas: lineas.map((linea: unknown) => {
      const l = objetoCon(linea, CAMPOS_DE_LA_LINEA, 'lineas');
      if (!textoCorto(l['productoId'])) throw campoInvalido('productoId');
      if (!textoCorto(l['cantidad'])) throw campoInvalido('cantidad');
      return { productoId: l['productoId'], cantidad: l['cantidad'] };
    }),
    compradorId: compradorId ?? null,
    medioDePago,
    documento,
  });
}
