import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/boton_principal.dart';
import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/componentes/marco_de_formulario.dart';
import '../../../nucleo/tema/tema_conta.dart';
import 'controlador_de_empresas.dart';

/// Crear un negocio: solo el nombre. Quien lo crea entra a él enseguida.
class PantallaCrearEmpresa extends StatefulWidget {
  const PantallaCrearEmpresa({super.key, required this.controlador});

  final ControladorDeEmpresas controlador;

  @override
  State<PantallaCrearEmpresa> createState() => _PantallaCrearEmpresaState();
}

class _PantallaCrearEmpresaState extends State<PantallaCrearEmpresa> {
  final _campo = TextEditingController();

  @override
  void dispose() {
    _campo.dispose();
    super.dispose();
  }

  void _crear() => widget.controlador.crear(_campo.text);

  @override
  Widget build(BuildContext context) {
    final c = widget.controlador;
    final primera = c.empresas.isEmpty;
    return MarcoDeFormulario(
      titulo: primera ? 'Crea tu negocio' : 'Agrega otro negocio',
      explicacion: 'Escribe el nombre como aparece en el RUT. Lo puedes completar después.',
      contenido: [
        TextField(
          controller: _campo,
          autofocus: true,
          maxLength: 450,
          textCapitalization: TextCapitalization.words,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _crear(),
          style: const TextStyle(fontSize: TextoConta.subtitulo),
          decoration: const InputDecoration(labelText: 'Nombre del negocio', hintText: 'Tienda Doña Rosa'),
        ),
        if (c.aviso != null) ...[const SizedBox(height: EspacioConta.s4), FranjaDeAviso(c.aviso!)],
        if (!primera) TextButton(onPressed: c.cambiar, child: const Text('Volver a mis negocios')),
      ],
      accionPrincipal: BotonPrincipal(texto: 'Crear y entrar', ocupado: c.ocupado, alTocar: _crear),
    );
  }
}
