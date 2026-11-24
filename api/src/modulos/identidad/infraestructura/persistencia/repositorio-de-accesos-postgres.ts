import { eq } from 'drizzle-orm';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { RepositorioDeAccesos } from '../../aplicacion/puertos/repositorios-de-identidad.js';
import { AccesoPorCelular, Celular } from '../../dominio/index.js';
import { accesos } from './tablas-identidad.js';

export class RepositorioDeAccesosPostgres implements RepositorioDeAccesos {
  constructor(private readonly ejecutor: Ejecutor) {}

  /** Crea la fila si no existe y la bloquea (FOR UPDATE): los intentos al mismo celular van en fila. */
  async tomar(celular: Celular): Promise<AccesoPorCelular> {
    await this.ejecutor.insert(accesos).values({ celular: celular.e164, fallos: 0, codigosEnVentana: 0, actualizadoEn: new Date() }).onConflictDoNothing();
    const [fila] = await this.ejecutor.select().from(accesos).where(eq(accesos.celular, celular.e164)).for('update');
    if (!fila) throw new Error('El acceso del celular no quedó creado');
    return AccesoPorCelular.desde({
      celular,
      codigo: fila.huellaCodigo && fila.codigoVenceEn ? { huella: fila.huellaCodigo, venceEn: fila.codigoVenceEn } : null,
      fallos: fila.fallos,
      bloqueadoHasta: fila.bloqueadoHasta,
      ventanaDesde: fila.ventanaDesde,
      codigosEnVentana: fila.codigosEnVentana,
      ultimoCodigoEn: fila.ultimoCodigoEn,
    });
  }

  async guardar(acceso: AccesoPorCelular): Promise<void> {
    const e = acceso.foto;
    await this.ejecutor
      .update(accesos)
      .set({
        huellaCodigo: e.codigo?.huella ?? null,
        codigoVenceEn: e.codigo?.venceEn ?? null,
        fallos: e.fallos,
        bloqueadoHasta: e.bloqueadoHasta,
        ventanaDesde: e.ventanaDesde,
        codigosEnVentana: e.codigosEnVentana,
        ultimoCodigoEn: e.ultimoCodigoEn,
        actualizadoEn: new Date(),
      })
      .where(eq(accesos.celular, e.celular.e164));
  }
}
