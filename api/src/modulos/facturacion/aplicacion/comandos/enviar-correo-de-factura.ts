import type { ContextoEmpresa, Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { armarComprobante, type ComprobanteArmado } from '../comprobante/armar-comprobante.js';
import { codigoDeFallaDeCorreo } from '../correo/falla-de-correo.js';
import { mensajeDeFactura } from '../correo/mensaje-de-factura.js';
import type { EnviadorDeCorreo } from '../puertos/enviador-de-correo.js';
import type { IntentoDeCorreo } from '../puertos/repositorio-de-correos.js';
import type { RenderizadorDeComprobante } from '../puertos/renderizador-de-comprobante.js';
import type { RepositoriosDeVenta } from '../puertos/repositorios-de-venta.js';

/**
 * HU-06.08: da un paso con el correo de una venta. Lee lo que va en el correo, lo manda fuera de toda transacción y
 * guarda el resultado y el intento juntos. Si otro procesador ya lo cambió, no escribe nada.
 */
export class EnviarCorreoDeFactura {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeVenta>,
    private readonly renderizador: RenderizadorDeComprobante,
    private readonly enviador: EnviadorDeCorreo,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(contexto: ContextoEmpresa, ventaId: string): Promise<void> {
    const leido = await this.unidadDeTrabajo.ejecutar(contexto, async (repositorios) => {
      const correo = await repositorios.correos.buscar(ventaId);
      if (!correo?.tocaEnviar(this.reloj.ahora())) return null;
      // Si el comprobante no se puede armar (datos fiscales quitados, por ejemplo) cuenta como una falla más:
      // así el correo no se retoma sin fin.
      const armado = await armarComprobante(repositorios, ventaId).catch(() => null);
      return { correo, armado };
    });
    if (!leido) return;

    const { correo, armado } = leido;
    const intentosLeidos = correo.intentos;
    const inicio = this.reloj.ahora();
    const resultado = await this.enviar(armado, `${contexto.empresaId.valor}:${ventaId}`);
    const fin = this.reloj.ahora();
    if (resultado.ok) correo.enviado();
    else correo.fallo(resultado.codigo, resultado.permanente, fin);

    const intento: IntentoDeCorreo = {
      ventaId,
      numero: correo.intentos,
      resultado: resultado.ok ? 'enviado' : resultado.permanente ? 'falla-permanente' : 'falla-pasajera',
      detalle: resultado.ok ? 'ok' : resultado.codigo,
      duracionMs: Math.max(0, fin.getTime() - inicio.getTime()),
      ocurridoEn: fin,
    };
    await this.unidadDeTrabajo.ejecutar(contexto, async ({ correos }) => {
      if (await correos.actualizar(correo, intentosLeidos)) await correos.registrarIntento(intento);
    });
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
