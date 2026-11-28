// Dominio de la funcionalidad: Dart puro.

import 'configuracion_dian.dart';

/// Las tarjetas de «Lo que falta para facturar», en el orden en que se llenan: RUT, resolución de factura,
/// software de factura, tiquete POS (opcional) y «siempre factura».
enum PasoDeConfiguracion { datosFiscales, resolucionFactura, softwareFactura, tiquetePos, siempreFactura }

enum EstadoDelPaso { listo, falta, opcional }

/// Estado de cada paso según lo guardado. Lo que falta para facturar lo decide la API ([LoQueFalta]).
EstadoDelPaso estadoDe(PasoDeConfiguracion paso, ConfiguracionDian c) => switch (paso) {
  PasoDeConfiguracion.datosFiscales => _segun(c, Pendiente.datosFiscales),
  PasoDeConfiguracion.resolucionFactura => _segun(c, Pendiente.resolucionFactura),
  PasoDeConfiguracion.softwareFactura => _segun(c, Pendiente.softwareFactura),
  PasoDeConfiguracion.tiquetePos => c.loQueFalta.posActivo ? EstadoDelPaso.listo : EstadoDelPaso.opcional,
  PasoDeConfiguracion.siempreFactura => EstadoDelPaso.opcional,
};

EstadoDelPaso _segun(ConfiguracionDian c, Pendiente pendiente) =>
    c.loQueFalta.pendientes.contains(pendiente) ? EstadoDelPaso.falta : EstadoDelPaso.listo;
