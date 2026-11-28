import { RepositorioDeCorreosPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/correos/repositorio-de-correos-postgres.js';
import { IdEmpresa, IdUsuario } from '../../../src/compartido/dominio/index.js';
import type { ContextoDeMiembro } from '../../../src/compartido/aplicacion/index.js';
import type { BaseDeDatos } from '../../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../../src/compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { ObtenerParaVender } from '../../../src/modulos/catalogo/index.js';
import { RepositorioClientesPostgres } from '../../../src/modulos/catalogo/infraestructura/persistencia/repositorio-clientes-postgres.js';
import { RepositorioProductosPostgres } from '../../../src/modulos/catalogo/infraestructura/persistencia/repositorio-productos-postgres.js';
import { Producto } from '../../../src/modulos/catalogo/dominio/productos/index.js';
import type { RepositoriosDeCatalogo } from '../../../src/modulos/catalogo/aplicacion/puertos/repositorios-de-catalogo.js';
import { CompletarEmisionesPendientes } from '../../../src/modulos/facturacion/aplicacion/comandos/completar-emisiones-pendientes.js';
import { EmitirVenta } from '../../../src/modulos/facturacion/aplicacion/comandos/emitir-venta.js';
import { FirmarDocumentoElectronico } from '../../../src/modulos/facturacion/aplicacion/comandos/firmar-documento-electronico.js';
import { GenerarXmlFactura } from '../../../src/modulos/facturacion/aplicacion/comandos/generar-xml-factura.js';
import { RegistrarVenta } from '../../../src/modulos/facturacion/aplicacion/comandos/registrar-venta.js';
import { SolicitarEnvioDian } from '../../../src/modulos/facturacion/aplicacion/comandos/solicitar-envio-dian.js';
import { ConsultarVenta } from '../../../src/modulos/facturacion/aplicacion/consultas/consultar-venta.js';
import { CertificadoDeFirma } from '../../../src/modulos/facturacion/aplicacion/firma/certificado-de-firma.js';
import { AccesoDianNoConfigurado } from '../../../src/modulos/facturacion/aplicacion/envio/acceso-dian-no-configurado.js';
import type { ProveedorDeAccesoDian } from '../../../src/modulos/facturacion/aplicacion/puertos/proveedor-de-acceso-dian.js';
import type { ProveedorDeConfiguracionDian } from '../../../src/modulos/facturacion/aplicacion/puertos/proveedor-de-configuracion-dian.js';
import type { ClaseDeDocumento } from '../../../src/modulos/facturacion/dominio/index.js';
import type { RepositoriosDeVenta } from '../../../src/modulos/facturacion/aplicacion/puertos/repositorios-de-venta.js';
import { CatalogoDeVentaConCatalogo } from '../../../src/modulos/facturacion/infraestructura/catalogo/catalogo-de-venta-con-catalogo.js';
import { FirmadorXadesDian } from '../../../src/modulos/facturacion/infraestructura/dian-directa/firma/firmador-xades-dian.js';
import { GeneradorUblDian } from '../../../src/modulos/facturacion/infraestructura/dian-directa/ubl/generador-ubl-dian.js';
import { ColaDeEmisionesPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/ventas/cola-de-emisiones-postgres.js';
import { EmisionesPendientesPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/ventas/emisiones-pendientes-postgres.js';
import { NumeracionPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/ventas/numeracion-postgres.js';
import { RepositorioDeVentasPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/ventas/repositorio-de-ventas-postgres.js';
import { PreferenciasPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/configuracion/preferencias-postgres.js';
import { CustodiaAesGcm } from '../../../src/modulos/facturacion/infraestructura/custodia/custodia-aes-gcm.js';

import { conexionDelDueno, nuevoId } from '../aislamiento/base-de-pruebas.js';
import { crearDatosFiscales, crearResolucion, crearUsuario } from '../aislamiento/fabricas.js';
import { RelojDePrueba, unidadDeTrabajoDeEnvios } from '../envio-dian/apoyo.js';
import { CONTRASENA_DE_PRUEBA, juegoDeCertificados } from '../../recursos/firma/certificados-de-prueba.js';

/** Custodia con una clave desechable, solo de pruebas (HU-07.04). */
export const CUSTODIA_DE_PRUEBA = new CustodiaAesGcm('clave-desechable-de-pruebas-de-la-configuracion-dian');

// Piezas reales para probar las ventas contra PostgreSQL: persistencia, catálogo, UBL y firma XAdES con un
// certificado de prueba creado en memoria. Solo la configuración DIAN y el acceso son dobles.

export const NIT_DE_PRUEBA = '900373076';
const juego = juegoDeCertificados();

/** El software de factura siempre; el del tiquete POS (HU-06.02) solo si `posHabilitado`. */
export class ConfiguracionDePrueba implements ProveedorDeConfiguracionDian {
  posHabilitado = false;
  para(_contexto: unknown, clase: ClaseDeDocumento) {
    if (clase === 'pos' && !this.posHabilitado) return Promise.reject(new AccesoDianNoConfigurado());
    return Promise.resolve({
      configuracion: {
        ambiente: 'habilitacion' as const,
        claveTecnica: clase === 'factura' ? 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c' : '',
        idSoftware: clase === 'factura' ? 'software-de-prueba' : 'software-pos-de-prueba',
        pinSoftware: clase === 'factura' ? '12345' : '67890',
        nitProveedorSoftware: NIT_DE_PRUEBA,
        fabricante: clase === 'pos' ? { nombre: 'Equipo CONTA', razonSocial: 'CONTA S.A.S.', nombreDelSoftware: 'CONTA' } : null,
      },
      nitDelFacturador: NIT_DE_PRUEBA,
    });
  }
}

export const configuracionDePrueba = new ConfiguracionDePrueba();

/** Acceso que se puede apagar para simular que la firma falla. */
export class AccesoDePrueba implements ProveedorDeAccesoDian {
  falla = false;
  para() {
    if (this.falla) return Promise.reject(new Error('Sin certificado por ahora'));
    return Promise.resolve({ certificado: CertificadoDeFirma.de(juego.p12, CONTRASENA_DE_PRUEBA), testSetId: 'set-de-prueba' });
  }
}

export interface Escenario {
  readonly miembro: ContextoDeMiembro;
  readonly registrar: RegistrarVenta;
  readonly consultar: ConsultarVenta;
  readonly reparador: CompletarEmisionesPendientes;
  readonly acceso: AccesoDePrueba;
  /** HU-06.02: se enciende `posHabilitado` para vender con tiquete POS. */
  readonly configuracion: ConfiguracionDePrueba;
  readonly reloj: RelojDePrueba;
  readonly productos: readonly string[];
  readonly uow: UnidadDeTrabajoPostgres<RepositoriosDeVenta>;
  readonly empresaId: string;
}

/** Una empresa nueva, sembrada por el dueño con datos fiscales y una resolución, y dos productos del catálogo. */
export async function escenario(baseDeDatos: BaseDeDatos, rango = { desde: 990000000, hasta: 995000000 }): Promise<Escenario> {
  const empresaId = nuevoId();
  const dueno = await conexionDelDueno();
  let usuarioId: string;
  try {
    await dueno.query('INSERT INTO conta.empresas (id, razon_social) VALUES ($1, $2)', [empresaId, 'Tienda de prueba']);
    await crearDatosFiscales(dueno, empresaId);
    await crearResolucion(dueno, empresaId, rango.desde, rango.hasta);
    usuarioId = await crearUsuario(dueno);
    await dueno.query(
      `INSERT INTO conta.membresias (id, empresa_id, usuario_id, rol, modo, aceptada_en) VALUES ($1, $2, $3, 'cajero', 'simple', now())`,
      [nuevoId(), empresaId, usuarioId],
    );
  } finally {
    await dueno.end();
  }
  const miembro: ContextoDeMiembro = { empresaId: IdEmpresa.de(empresaId), usuarioId: IdUsuario.de(usuarioId), rol: 'cajero', modo: 'simple' };
  // La base exige que la venta se emita con la hora actual: el reloj de prueba arranca en «ahora».
  const reloj = new RelojDePrueba(new Date());
  const uow = new UnidadDeTrabajoPostgres<RepositoriosDeVenta>(baseDeDatos, (e) => ({
    ventas: new RepositorioDeVentasPostgres(e),
    numeracion: new NumeracionPostgres(e, CUSTODIA_DE_PRUEBA),
    emisiones: new ColaDeEmisionesPostgres(e),
    correos: new RepositorioDeCorreosPostgres(e),
    preferencias: new PreferenciasPostgres(e),
  }));
  const deCatalogo = new UnidadDeTrabajoPostgres<RepositoriosDeCatalogo>(baseDeDatos, (e) => ({ clientes: new RepositorioClientesPostgres(e), productos: new RepositorioProductosPostgres(e) }));
  const productos = await sembrarProductos(deCatalogo, miembro, reloj.ahora());
  const acceso = new AccesoDePrueba();
  const configuracion = new ConfiguracionDePrueba();
  const despertador = { programar: () => undefined };
  const emitir = new EmitirVenta(
    uow,
    configuracion,
    acceso,
    new GenerarXmlFactura(new GeneradorUblDian()),
    new FirmarDocumentoElectronico(new FirmadorXadesDian(reloj)),
    new SolicitarEnvioDian(unidadDeTrabajoDeEnvios(baseDeDatos), reloj, despertador),
    reloj,
  );
  const catalogo = new CatalogoDeVentaConCatalogo(new ObtenerParaVender(deCatalogo));
  return {
    miembro,
    registrar: new RegistrarVenta(uow, catalogo, configuracion, emitir, reloj, despertador),
    consultar: new ConsultarVenta(uow),
    reparador: new CompletarEmisionesPendientes(new EmisionesPendientesPostgres(baseDeDatos), emitir, reloj),
    acceso,
    configuracion,
    reloj,
    productos,
    uow,
    empresaId,
  };
}

async function sembrarProductos(
  deCatalogo: UnidadDeTrabajoPostgres<RepositoriosDeCatalogo>,
  miembro: ContextoDeMiembro,
  ahora: Date,
): Promise<string[]> {
  const nuevos = [
    { nombre: 'Gaseosa 400 ml', precio: '2500', tipoDeIva: 'gravado' as const, tarifaIva: '19' },
    { nombre: 'Arroz 500 g', precio: '3200', tipoDeIva: 'excluido' as const, tarifaIva: null },
  ].map((p) =>
    Producto.crear({ id: nuevoId(), codigo: null, unidad: null, precioIncluyeIva: true, ...p }, miembro.usuarioId.valor, ahora),
  );
  await deCatalogo.ejecutar(miembro, async ({ productos }) => {
    for (const p of nuevos) await productos.agregarSiNoExiste(p);
  });
  return nuevos.map((p) => p.id);
}

export const pedido = (productos: readonly string[], cambios: { id?: string; cantidad?: string } = {}) => ({
  id: cambios.id ?? nuevoId(),
  lineas: [
    { productoId: productos[0] as string, cantidad: cambios.cantidad ?? '3' },
    { productoId: productos[1] as string, cantidad: '1' },
  ],
  compradorId: null,
  medioDePago: 'efectivo' as const,
});
