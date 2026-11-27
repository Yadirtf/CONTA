import type { Provider } from '@nestjs/common';
import { RELOJ, type Reloj } from '../../compartido/aplicacion/index.js';
import { BaseDeDatos } from '../../compartido/infraestructura/persistencia/base-de-datos.js';
import { EnviarCorreoDeFactura } from './aplicacion/comandos/enviar-correo-de-factura.js';
import { EnviarCorreosPendientes } from './aplicacion/comandos/enviar-correos-pendientes.js';
import { ListarVentasRecientes } from './aplicacion/consultas/listar-ventas-recientes.js';
import { ObtenerComprobante } from './aplicacion/consultas/obtener-comprobante.js';
import { ENVIADOR_DE_CORREO, type EnviadorDeCorreo } from './aplicacion/puertos/enviador-de-correo.js';
import { RENDERIZADOR_DE_COMPROBANTE, type RenderizadorDeComprobante } from './aplicacion/puertos/renderizador-de-comprobante.js';
import { FUENTE_DE_CORREOS_PENDIENTES, type FuenteDeCorreosPendientes } from './aplicacion/puertos/repositorio-de-correos.js';
import { type DeVentas, UNIDAD_DE_TRABAJO_DE_VENTAS } from './composicion-ventas.js';
import { RenderizadorPdfkit } from './infraestructura/comprobante-pdf/renderizador-pdfkit.js';
import { configuracionDeCorreoDesde } from './infraestructura/correo/configuracion-de-correo.js';
import { EnviadorBrevo } from './infraestructura/correo/enviador-brevo.js';
import { EnviadorSinConfigurar } from './infraestructura/correo/enviador-sin-configurar.js';
import { CorreosPendientesPostgres } from './infraestructura/persistencia/correos/correos-pendientes-postgres.js';
import { LimiteDeComprobantes } from './presentacion/http/ventas/limite-de-comprobantes.js';

// Composición del comprobante y su correo (HU-06.08): el PDF lo dibuja pdfkit y el correo sale por Brevo si hay
// llave; sin ella, los correos esperan en su cola. Cambiar de proveedor es cambiar solo ENVIADOR_DE_CORREO.

export const PROVEEDORES_DE_COMPROBANTES: Provider[] = [
  LimiteDeComprobantes,
  { provide: RENDERIZADOR_DE_COMPROBANTE, useFactory: () => new RenderizadorPdfkit() },
  {
    provide: ENVIADOR_DE_CORREO,
    useFactory: (): EnviadorDeCorreo => {
      const configuracion = configuracionDeCorreoDesde(process.env);
      return configuracion ? new EnviadorBrevo(configuracion) : new EnviadorSinConfigurar();
    },
  },
  {
    provide: FUENTE_DE_CORREOS_PENDIENTES,
    useFactory: (baseDeDatos: BaseDeDatos) => new CorreosPendientesPostgres(baseDeDatos),
    inject: [BaseDeDatos],
  },
  {
    provide: ObtenerComprobante,
    useFactory: (uow: DeVentas, renderizador: RenderizadorDeComprobante) => new ObtenerComprobante(uow, renderizador),
    inject: [UNIDAD_DE_TRABAJO_DE_VENTAS, RENDERIZADOR_DE_COMPROBANTE],
  },
  {
    provide: ListarVentasRecientes,
    useFactory: (uow: DeVentas) => new ListarVentasRecientes(uow),
    inject: [UNIDAD_DE_TRABAJO_DE_VENTAS],
  },
  {
    provide: EnviarCorreoDeFactura,
    useFactory: (uow: DeVentas, renderizador: RenderizadorDeComprobante, enviador: EnviadorDeCorreo, reloj: Reloj) =>
      new EnviarCorreoDeFactura(uow, renderizador, enviador, reloj),
    inject: [UNIDAD_DE_TRABAJO_DE_VENTAS, RENDERIZADOR_DE_COMPROBANTE, ENVIADOR_DE_CORREO, RELOJ],
  },
  {
    provide: EnviarCorreosPendientes,
    useFactory: (fuente: FuenteDeCorreosPendientes, enviar: EnviarCorreoDeFactura) => new EnviarCorreosPendientes(fuente, enviar),
    inject: [FUENTE_DE_CORREOS_PENDIENTES, EnviarCorreoDeFactura],
  },
];
