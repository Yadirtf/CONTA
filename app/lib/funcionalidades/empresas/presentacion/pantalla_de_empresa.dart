import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/empresas.dart';

/// Inicio dentro de un negocio. El nombre de arriba lo confirma la API pidiéndolo dentro de esa empresa:
/// si la persona ya no pertenece, se ve el aviso y no los datos.
class PantallaDeEmpresa extends StatefulWidget {
  const PantallaDeEmpresa({
    super.key,
    required this.empresa,
    required this.repositorio,
    required this.alCambiar,
    required this.contenido,
    this.alSalir,
  });

  final Empresa empresa;
  final RepositorioDeEmpresas repositorio;
  final VoidCallback alCambiar;
  final Widget contenido;

  /// Cerrar sesión. Llega desde la composición (app.dart): empresas no conoce el acceso.
  final VoidCallback? alSalir;

  @override
  State<PantallaDeEmpresa> createState() => _PantallaDeEmpresaState();
}

class _PantallaDeEmpresaState extends State<PantallaDeEmpresa> {
  late final _datos = widget.repositorio.datosDe(widget.empresa.id);

  @override
  Widget build(BuildContext context) => FutureBuilder<Respuesta<Empresa>>(
    future: _datos,
    builder: (context, foto) {
      final respuesta = foto.data;
      return Scaffold(
        appBar: AppBar(
          title: Text(respuesta is Exito<Empresa> ? respuesta.valor.razonSocial : widget.empresa.razonSocial),
          actions: [
            IconButton(onPressed: widget.alCambiar, tooltip: 'Cambiar de negocio', icon: const Icon(Icons.swap_horiz)),
            if (widget.alSalir != null)
              IconButton(onPressed: widget.alSalir, tooltip: 'Salir', icon: const Icon(Icons.logout)),
          ],
        ),
        body: Padding(
          padding: const EdgeInsets.all(EspacioConta.s4),
          child: switch (respuesta) {
            null => const Center(child: CircularProgressIndicator()),
            Exito() => widget.contenido,
            Rechazo(:final mensaje) => FranjaDeAviso(mensaje),
          },
        ),
      );
    },
  );
}
