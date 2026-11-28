import 'package:material_ui/material_ui.dart';

import '../../../../nucleo/componentes/boton_principal.dart';
import '../../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../../nucleo/componentes/marco_de_formulario.dart';
import '../../../../nucleo/tema/tema_conta.dart';
import '../../dominio/configuracion_dian.dart';
import '../../dominio/digito_de_verificacion.dart';
import '../../dominio/lo_que_se_escribe.dart';
import '../controlador_de_configuracion_dian.dart';
import 'campo.dart';

/// Responsabilidades del RUT (casilla 53) que acepta la factura, con palabras de la calle.
const _responsabilidades = {
  'R-99-PN': 'No responsable (R-99-PN)',
  'O-13': 'Gran contribuyente (O-13)',
  'O-15': 'Autorretenedor (O-15)',
  'O-23': 'Agente de retención de IVA (O-23)',
  'O-47': 'Régimen simple (O-47)',
};

/// Datos del RUT del negocio. El NIT no cambia después de la primera venta: la API lo impide.
class FormularioDatosFiscales extends StatefulWidget {
  const FormularioDatosFiscales({super.key, required this.controlador, required this.actuales});

  final ControladorDeConfiguracionDian controlador;
  final DatosFiscales? actuales;

  @override
  State<FormularioDatosFiscales> createState() => _FormularioDatosFiscalesState();
}

class _FormularioDatosFiscalesState extends State<FormularioDatosFiscales> {
  late final DatosFiscales? _a = widget.actuales;
  late final _nit = TextEditingController(text: _a?.nit);
  late final _razonSocial = TextEditingController(text: _a?.razonSocial);
  late final _municipio = TextEditingController(text: _a?.direccion.codigoMunicipio);
  late final _ciudad = TextEditingController(text: _a?.direccion.ciudad);
  late final _departamento = TextEditingController(text: _a?.direccion.departamento);
  late final _direccion = TextEditingController(text: _a?.direccion.linea);
  late final _correo = TextEditingController(text: _a?.correo);
  late bool _juridica = _a?.personaJuridica ?? false;
  late bool _responsableDeIva = _a?.responsableDeIva ?? false;
  late final Set<String> _elegidas = {...?_a?.responsabilidades};

  @override
  void dispose() {
    for (final c in [_nit, _razonSocial, _municipio, _ciudad, _departamento, _direccion, _correo]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _guardar() async {
    final datos = DatosFiscalesNuevos(
      nit: _nit.text.replaceAll(RegExp(r'[\s.]'), ''),
      razonSocial: _razonSocial.text.trim(),
      personaJuridica: _juridica,
      responsabilidades: _elegidas.isEmpty ? const ['R-99-PN'] : _elegidas.toList(),
      responsableDeIva: _responsableDeIva,
      direccion: Direccion(
        codigoMunicipio: _municipio.text.trim(),
        ciudad: _ciudad.text.trim(),
        departamento: _departamento.text.trim(),
        linea: _direccion.text.trim(),
      ),
      correo: escrito(_correo),
    );
    if (await widget.controlador.guardarDatosFiscales(datos) && mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.controlador,
    builder: (context, _) {
      final digito = digitoDeVerificacion(_nit.text);
      return MarcoDeFormulario(
        titulo: 'Datos del RUT',
        explicacion: 'Cópialos de tu RUT. Así salen en tus facturas.',
        contenido: [
          Campo(
            controlador: _nit,
            etiqueta: 'NIT, sin el dígito de verificación',
            teclado: TextInputType.number,
            ayuda: digito == null ? null : 'Dígito de verificación: $digito. Revisa que sea el de tu RUT.',
            alCambiar: (_) => setState(() {}),
          ),
          Campo(controlador: _razonSocial, etiqueta: 'Razón social o nombre'),
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: false, label: Text('Persona natural')),
              ButtonSegment(value: true, label: Text('Empresa')),
            ],
            selected: {_juridica},
            onSelectionChanged: (e) => setState(() => _juridica = e.single),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Cobro IVA'),
            subtitle: const Text('Si tu RUT dice responsable de IVA'),
            value: _responsableDeIva,
            onChanged: (v) => setState(() => _responsableDeIva = v),
          ),
          const SizedBox(height: EspacioConta.s2),
          const Text('Responsabilidades del RUT (casilla 53)'),
          Wrap(
            spacing: EspacioConta.s2,
            children: [
              for (final MapEntry(key: codigo, value: nombre) in _responsabilidades.entries)
                FilterChip(
                  label: Text(nombre),
                  selected: _elegidas.contains(codigo),
                  onSelected: (si) => setState(() => si ? _elegidas.add(codigo) : _elegidas.remove(codigo)),
                ),
            ],
          ),
          const SizedBox(height: EspacioConta.s4),
          Campo(
            controlador: _municipio,
            etiqueta: 'Código del municipio (DANE)',
            teclado: TextInputType.number,
            ayuda: '5 números. Bogotá es 11001.',
          ),
          Campo(controlador: _ciudad, etiqueta: 'Ciudad'),
          Campo(controlador: _departamento, etiqueta: 'Departamento'),
          Campo(controlador: _direccion, etiqueta: 'Dirección', teclado: TextInputType.streetAddress),
          Campo(controlador: _correo, etiqueta: 'Correo para facturas', teclado: TextInputType.emailAddress),
          if (widget.controlador.aviso != null) FranjaDeAviso(widget.controlador.aviso!),
        ],
        accionPrincipal: BotonPrincipal(texto: 'Guardar', ocupado: widget.controlador.ocupado, alTocar: _guardar),
      );
    },
  );
}
