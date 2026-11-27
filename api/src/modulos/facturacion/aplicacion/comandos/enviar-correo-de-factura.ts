import type { ContextoEmpresa, Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import type { CorreoDeFactura } from '../../dominio/index.js';
import { armarComprobante, type ComprobanteArmado } from '../comprobante/armar-comprobante.js';
import { codigoDeFallaDeCorreo } from '../correo/falla-de-correo.js';
import { mensajeDeFactura } from '../correo/mensaje-de-factura.js';
import type { EnviadorDeCorreo } from '../puertos/enviador-de-correo.js';
import type { IntentoDeCorreo } from '../puertos/repositorio-de-correos.js';
import type { RenderizadorDeComprobante } from '../puertos/renderizador-de-comprobante.js';
import type { RepositoriosDeVenta } from '../puertos/repositorios-de-venta.js';

/**
 * HU-06.08: da un paso con el correo de una venta. Primero toma el intento en la base (ya cuenta y aplaza el próximo),
 * después manda fuera de toda transacción y al final cierra el intento con su resultado. Si otro procesador lo tomó
 * antes, no manda nada; si el proceso se cae tras mandar, el intento queda contado y se cierra en la próxima vuelta.
 */
export class EnviarCorreoDeFactura {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeVenta>,
    private readonly renderizador: RenderizadorDeComprobante,
    private readonly enviador: EnviadorDeCorreo,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(contexto: ContextoEmpresa, ventaId: string): Promise<void> {
    const tomado = await this.unidadDeTrabajo.ejecutar(contexto, (repositorios) => this.tomar(repositorios, ventaId));
    if (!tomado) return;

    const { correo, armado } = tomado;
    const leido = correo.instantanea();
    const inicio = this.reloj.ahora();
    const resultado = await this.enviar(armado, `${contexto.empresaId.valor}:${ventaId}`);
    const fin = this.reloj.ahora();
    if (resultado.ok) correo.enviado();
    else correo.fallo(resultado.codigo, resultado.permanente);
    const intento = intentoDe(correo, resultado.ok ? 'ok' : resultado.codigo, inicio, fin);
    await this.unidadDeTrabajo.ejecutar(contexto, async ({ correos }) => {
      if (await correos.actualizar(correo, leido)) await correos.registrarIntento(intento);
    });
  }

  /** Cierra un intento que quedó abierto, toma el siguiente y lee lo que va en el correo. */
  private async tomar(repositorios: RepositoriosDeVenta, ventaId: string): Promise<{ correo: CorreoDeFactura; armado: ComprobanteArmado | null } | null> {
    const { correos } = repositorios;
    const correo = await correos.buscar(ventaId);
    const ahora = this.reloj.ahora();
    if (!correo?.tocaEnviar(ahora)) return null;
    if (correo.intentoSinCerrar) {
      const leido = correo.instantanea();
      correo.fallo('correo.sin-confirmar', false);
      if (!(await correos.actualizar(correo, leido))) return null;
      await correos.registrarIntento(intentoDe(correo, 'correo.sin-confirmar', ahora, ahora));
      if (correo.estado !== 'pendiente') return null;
    }
    const leido = correo.instantanea();
    correo.iniciarIntento(ahora);
    if (!(await correos.actualizar(correo, leido))) return null;
    // Si el comprobante no se puede armar (falta la resolución, por ejemplo), el intento ya contó: no se retoma sin fin.
    const armado = await armarComprobante(repositorios, ventaId).catch(() => null);
    return { correo, armado };
  }

  private async enviar(
    armado: ComprobanteArmado | null,
    idempotencia: string,
  ): Promise<{ ok: true } | { ok: false; codigo: string; permanente: boolean }> {
    if (!armado) return { ok: false, codigo: 'correo.sin-comprobante', permanente: false };
    const para = armado.venta.datos.comprador.correo;
    if (!para) return { ok: false, codigo: 'correo.sin-destinatario', permanente: true };
    try {
      const pdf = await this.renderizador.pdf(armado.comprobante);
      await this.enviador.enviar(mensajeDeFactura(armado, para, pdf, idempotencia));
      return { ok: true };
    } catch (error) {
      return { ok: false, ...codigoDeFallaDeCorreo(error) };
    }
  }
}

function intentoDe(correo: CorreoDeFactura, detalle: string, inicio: Date, fin: Date): IntentoDeCorreo {
  const { estado } = correo;
  return {
    ventaId: correo.ventaId,
    numero: correo.intentos,
    resultado: estado === 'enviado' ? 'enviado' : estado === 'fallido' ? 'falla-permanente' : 'falla-pasajera',
    detalle,
    duracionMs: Math.max(0, fin.getTime() - inicio.getTime()),
    ocurridoEn: fin,
  };
}
