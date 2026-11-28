import 'package:material_ui/material_ui.dart';

import '../../../../nucleo/componentes/boton_principal.dart';
import '../../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../../nucleo/componentes/marco_de_formulario.dart';
import '../../dominio/configuracion_dian.dart';
import '../../dominio/lo_que_se_escribe.dart';
import '../controlador_de_configuracion_dian.dart';
import 'campo.dart';

/// El software que el negocio registró en el portal de la DIAN para una clase de documento. El PIN nunca se
/// vuelve a mostrar: se ve su último carácter y, para cambiarlo, se escribe completo.
class FormularioSoftware extends StatefulWidget {
  const FormularioSoftware({
    super.key,
    required this.controlador,
    required this.clase,
    required this.actual,
    required this.modoContador,
  });

  final ControladorDeConfiguracionDian controlador;
  final ClaseDeDocumento clase;
  final SoftwareGuardado? actual;
  final bool modoContador;

  @override
  State<FormularioSoftware> createState() => _FormularioSoftwareState();
}

class _FormularioSoftwareState extends State<FormularioSoftware> {
  late final _idSoftware = TextEditingController(text: widget.actual?.idSoftware);
  late final _testSetId = TextEditingController(text: widget.actual?.testSetId);
  late final _fabricante = TextEditingController(text: widget.actual?.fabricante?.nombre);
  late final _fabricanteRazon = TextEditingController(text: widget.actual?.fabricante?.razonSocial);
  final _pin = TextEditingController();
  String? _aviso;

  bool get _esPos => widget.clase == ClaseDeDocumento.pos;

  @override
  void dispose() {
    for (final c in [_idSoftware, _testSetId, _fabricante, _fabricanteRazon, _pin]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _guardar() async {
    final (idSoftware, testSetId, pin) = (escrito(_idSoftware), escrito(_testSetId), escrito(_pin));
    if (idSoftware == null || testSetId == null || (pin == null && widget.actual == null)) {
      return setState(() => _aviso = 'Escribe el identificador del software, su PIN y el TestSetId.');
    }
    final (nombre, razon) = (escrito(_fabricante), escrito(_fabricanteRazon));
    if (_esPos && (nombre == null || razon == null)) {
      return setState(() => _aviso = 'Escribe quién hizo el software del POS: su nombre y su razón social.');
    }
    setState(() => _aviso = null);
    final software = SoftwareNuevo(
      idSoftware: idSoftware.toLowerCase(),
      testSetId: testSetId.toLowerCase(),
      pin: pin,
      fabricante: _esPos ? Fabricante(nombre: nombre!, razonSocial: razon!) : null,
    );
    final guardado = await widget.controlador.guardarSoftware(widget.clase, software);
    // El PIN no se queda en la pantalla, se haya guardado o no.
    _pin.clear();
    if (guardado && mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.controlador,
    builder: (context, _) {
      final aviso = _aviso ?? widget.controlador.aviso;
      final actual = widget.actual;
      return MarcoDeFormulario(
        titulo: _esPos ? 'Software del POS' : 'Software de factura',
        explicacion: 'Es el software que registraste en el portal de habilitación de la DIAN.',
        contenido: [
          Campo(controlador: _idSoftware, etiqueta: 'Identificador del software'),
          Campo(
            controlador: _pin,
            etiqueta: actual == null ? 'PIN del software' : 'PIN nuevo (opcional)',
            ayuda: actual == null
                ? 'Se guarda protegido y no se vuelve a mostrar.'
                : 'Guardado: ${actual.pinTapado}. Déjalo vacío para conservarlo.',
            secreto: true,
          ),
          if (_esPos) ...[
            Campo(controlador: _fabricante, etiqueta: 'Quién hizo el software (nombre)'),
            Campo(controlador: _fabricanteRazon, etiqueta: 'Razón social de quien lo hizo'),
          ],
          DatosDeLaDian(
            abierto: widget.modoContador || actual == null,
            campos: [Campo(controlador: _testSetId, etiqueta: 'TestSetId del set de pruebas')],
          ),
          if (aviso != null) FranjaDeAviso(aviso),
        ],
        accionPrincipal: BotonPrincipal(texto: 'Guardar', ocupado: widget.controlador.ocupado, alTocar: _guardar),
      );
    },
  );
}
