import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../../verificacion/dominio/verificacion.dart';
import '../dominio/configuracion_dian.dart';
import '../dominio/lo_que_se_escribe.dart';
import '../dominio/pasos_de_configuracion.dart';
import 'controlador_de_configuracion_dian.dart';
import 'dialogo_de_verificacion_reciente.dart';
import 'formularios/formulario_datos_fiscales.dart';
import 'formularios/formulario_resolucion.dart';
import 'formularios/formulario_software.dart';
import 'resumenes.dart';
import 'tarjeta_de_paso.dart';

/// Configuración DIAN del negocio (HU-07.04): tarjetas de «Lo que falta para facturar», en el orden en que se
/// llenan. Cada una abre un formulario corto que guarda solo su parte. Solo llega aquí el dueño; si no, la API
/// respondería «No tienes permiso».
class PantallaConfiguracionDian extends StatefulWidget {
  const PantallaConfiguracionDian({
    super.key,
    required this.repositorio,
    required this.verificacion,
    required this.empresaId,
    required this.modoContador,
  });

  final RepositorioDeConfiguracionDian repositorio;

  /// Para pedir otra vez el código cuando un cambio exige haberlo escrito hace poco.
  final RepositorioDeVerificacion verificacion;
  final String empresaId;

  /// En modo contador se ven de una vez los datos técnicos (TestSetId, clave técnica).
  final bool modoContador;

  @override
  State<PantallaConfiguracionDian> createState() => _PantallaConfiguracionDianState();
}

class _PantallaConfiguracionDianState extends State<PantallaConfiguracionDian> {
  late final _c = ControladorDeConfiguracionDian(
    widget.repositorio,
    widget.empresaId,
    verificarDeNuevo: () => pedirVerificacionReciente(context, widget.verificacion),
  );

  @override
  void initState() {
    super.initState();
    _c.cargar();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  void _abrir(Widget formulario) =>
      Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => formulario));

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Facturación electrónica')),
    body: SafeArea(
      child: ListenableBuilder(
        listenable: _c,
        builder: (context, _) {
          final configuracion = _c.configuracion;
          if (_c.cargando) return const Center(child: CircularProgressIndicator());
          if (configuracion == null) {
            return ListView(
              padding: const EdgeInsets.all(EspacioConta.s4),
              children: [
                FranjaDeAviso(_c.aviso ?? 'No pudimos leer tu configuración.'),
                const SizedBox(height: EspacioConta.s4),
                OutlinedButton(onPressed: _c.cargar, child: const Text('Intentar otra vez')),
              ],
            );
          }
          return RefreshIndicator(onRefresh: _c.cargar, child: _lista(configuracion));
        },
      ),
    ),
  );

  Widget _lista(ConfiguracionDian c) {
    EstadoDelPaso estado(PasoDeConfiguracion p) => estadoDe(p, c);
    final listo = c.loQueFalta.puedeFacturar;
    return ListView(
      padding: const EdgeInsets.all(EspacioConta.s4),
      children: [
        Text(
          listo ? 'Ya puedes facturar' : 'Lo que falta para facturar',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontSize: TextoConta.titulo),
        ),
        const SizedBox(height: EspacioConta.s2),
        Text(
          'Necesitas internet para guardar. Los datos salen de tu RUT y de lo que te dio la DIAN.',
          style: TextStyle(color: context.paleta.textoSuave),
        ),
        if (_c.aviso != null) ...[const SizedBox(height: EspacioConta.s4), FranjaDeAviso(_c.aviso!)],
        const SizedBox(height: EspacioConta.s6),
        TarjetaDePaso(
          titulo: 'Datos del RUT',
          estado: estado(PasoDeConfiguracion.datosFiscales),
          resumen: resumenDeDatosFiscales(c.datosFiscales),
          alTocar: () => _abrir(FormularioDatosFiscales(controlador: _c, actuales: c.datosFiscales)),
        ),
        TarjetaDePaso(
          titulo: 'Resolución de factura',
          estado: estado(PasoDeConfiguracion.resolucionFactura),
          resumen: resumenDeResoluciones(c.resolucionesDe(ClaseDeDocumento.factura)),
          alTocar: () => _abrir(_resolucion(c, ClaseDeDocumento.factura)),
        ),
        TarjetaDePaso(
          titulo: 'Software de factura',
          estado: estado(PasoDeConfiguracion.softwareFactura),
          resumen: resumenDeSoftware(c.softwareFactura),
          alTocar: () => _abrir(_software(c, ClaseDeDocumento.factura)),
        ),
        TarjetaDePaso(
          titulo: 'Tiquete POS',
          estado: estado(PasoDeConfiguracion.tiquetePos),
          resumen: resumenDelPos(c),
          alTocar: () => _abrir(_pos(c)),
        ),
        TarjetaDePaso(
          titulo: 'Siempre factura',
          estado: estado(PasoDeConfiguracion.siempreFactura),
          resumen: c.siempreFactura ? 'Nunca sale tiquete POS' : 'Sale tiquete POS cuando se puede',
          accion: Switch(
            value: c.siempreFactura,
            onChanged: _c.ocupado ? null : _c.guardarSiempreFactura,
          ),
        ),
      ],
    );
  }

  Widget _resolucion(ConfiguracionDian c, ClaseDeDocumento clase) => FormularioResolucion(
    controlador: _c,
    clase: clase,
    guardadas: c.resolucionesDe(clase),
    modoContador: widget.modoContador,
  );

  Widget _software(ConfiguracionDian c, ClaseDeDocumento clase) => FormularioSoftware(
    controlador: _c,
    clase: clase,
    actual: c.softwareDe(clase),
    modoContador: widget.modoContador,
  );

  /// El POS tiene su resolución y su software; se llenan desde una pantalla con las dos tarjetas.
  Widget _pos(ConfiguracionDian c) => Scaffold(
    appBar: AppBar(title: const Text('Tiquete POS')),
    body: ListenableBuilder(
      listenable: _c,
      builder: (context, _) {
        final actual = _c.configuracion ?? c;
        final resoluciones = actual.resolucionesDe(ClaseDeDocumento.pos);
        return ListView(
          padding: const EdgeInsets.all(EspacioConta.s4),
          children: [
            Text(
              'Opcional. Sirve para ventas pequeñas a consumidor final, sin pedir datos al comprador.',
              style: TextStyle(color: context.paleta.textoSuave),
            ),
            const SizedBox(height: EspacioConta.s4),
            TarjetaDePaso(
              titulo: 'Resolución del POS',
              estado: resoluciones.any((r) => r.disponible) ? EstadoDelPaso.listo : EstadoDelPaso.opcional,
              resumen: resumenDeResoluciones(resoluciones),
              alTocar: () => _abrir(_resolucion(actual, ClaseDeDocumento.pos)),
            ),
            TarjetaDePaso(
              titulo: 'Software del POS',
              estado: actual.softwarePos == null ? EstadoDelPaso.opcional : EstadoDelPaso.listo,
              resumen: resumenDeSoftware(actual.softwarePos),
              alTocar: () => _abrir(_software(actual, ClaseDeDocumento.pos)),
            ),
          ],
        );
      },
    ),
  );
}
