import '../dominio/configuracion_dian.dart';

// Lo guardado de cada paso en una línea, con palabras de la calle.

String resumenDeDatosFiscales(DatosFiscales? d) =>
    d == null ? 'Tu NIT, razón social y dirección, como en el RUT' : 'NIT ${d.nit}-${d.digitoVerificacion} · ${d.razonSocial}';

String resumenDeResoluciones(List<Resolucion> resoluciones) {
  final vigente = resoluciones.where((r) => r.disponible).firstOrNull;
  if (vigente != null) return 'Va en el ${vigente.prefijo}${vigente.siguiente}, hasta el ${vigente.prefijo}${vigente.hasta}';
  return resoluciones.isEmpty ? 'El rango de números que te autorizó la DIAN' : 'Ninguna vigente: agrega la nueva';
}

String resumenDeSoftware(SoftwareGuardado? s) =>
    s == null ? 'El software y el PIN que registraste en la DIAN' : 'PIN guardado ${s.pinTapado}';

String resumenDelPos(ConfiguracionDian c) {
  if (c.loQueFalta.posActivo) return 'Activo para ventas pequeñas a consumidor final';
  if (c.siempreFactura) return 'Apagado: pediste siempre factura';
  return 'Para vender sin pedir datos al comprador';
}
