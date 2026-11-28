import type { ContextoEmpresa, UnidadDeTrabajo } from '../../../../src/compartido/aplicacion/index.js';
import type {
  CambioDeConfiguracion,
  RepositoriosDeConfiguracion,
  ResolucionGuardada,
  ResultadoDeAgregar,
  SoftwareGuardado,
} from '../../../../src/modulos/facturacion/aplicacion/puertos/repositorios-de-configuracion.js';
import type { ClaseDeDocumento, Participante, ResolucionNueva } from '../../../../src/modulos/facturacion/dominio/index.js';

/** Doble de la configuración DIAN guardada (HU-07.04). Guarda lo que recibe tal cual, para mirarlo en las pruebas. */
export class ConfiguracionEnMemoria implements UnidadDeTrabajo<RepositoriosDeConfiguracion> {
  datosFiscales: Participante | null = null;
  hayVentas = false;
  readonly resoluciones = new Map<string, { nueva: ResolucionNueva; claveCifrada: string | null; huella: string }>();
  readonly software = new Map<ClaseDeDocumento, SoftwareGuardado>();
  siempreFactura = false;
  readonly bitacora: CambioDeConfiguracion[] = [];
  respuestaDeAgregar: ResultadoDeAgregar | null = null;

  ejecutar<T>(_contexto: ContextoEmpresa, trabajo: (r: RepositoriosDeConfiguracion) => Promise<T>): Promise<T> {
    return trabajo({
      datosFiscales: {
        leer: () => Promise.resolve(this.datosFiscales),
        guardar: (d) => Promise.resolve(void (this.datosFiscales = d)).then(() => 'guardados' as const),
        hayVentas: () => Promise.resolve(this.hayVentas),
      },
      resoluciones: {
        listar: () =>
          Promise.resolve(
            [...this.resoluciones].map(
              ([id, r]): ResolucionGuardada => ({ id, resolucion: r.nueva.resolucion, siguiente: r.nueva.primerNumero, conClaveTecnica: r.claveCifrada !== null }),
            ),
          ),
        agregar: (id, nueva, claveCifrada, huella) => {
          if (this.respuestaDeAgregar) return Promise.resolve(this.respuestaDeAgregar);
          const previa = this.resoluciones.get(id);
          if (previa) return Promise.resolve(previa.huella === huella ? 'ya-existia' : 'id-en-uso');
          this.resoluciones.set(id, { nueva, claveCifrada, huella });
          return Promise.resolve('agregada');
        },
      },
      software: {
        de: (clase) => Promise.resolve(this.software.get(clase) ?? null),
        guardar: ({ pin, ...s }) => {
          // Como la base: sin PIN nuevo queda el guardado.
          const previo = this.software.get(s.clase);
          const conPin = pin ?? (previo && { pinCifrado: previo.pinCifrado, finalDelPin: previo.finalDelPin });
          if (!conPin) return Promise.reject(new Error('Software sin PIN'));
          this.software.set(s.clase, { ...s, ...conPin, actualizadoEn: new Date('2026-11-27T15:00:00Z') });
          return Promise.resolve();
        },
      },
      preferencias: {
        siempreFactura: () => Promise.resolve(this.siempreFactura),
        guardar: (siempre) => Promise.resolve(void (this.siempreFactura = siempre)),
      },
      bitacora: {
        anotar: (seccion, hechoPor) => Promise.resolve(void this.bitacora.push({ seccion, hechoPor, hechoEn: new Date() })),
        recientes: (n) => Promise.resolve(this.bitacora.slice(-n).reverse()),
      },
    });
  }
}
