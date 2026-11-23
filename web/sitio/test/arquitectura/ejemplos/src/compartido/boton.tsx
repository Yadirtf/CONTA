// Ejemplo que rompe las reglas a propósito: compartido/ conoce una funcionalidad.
import { pedirClientes } from '../funcionalidades/clientes/datos/pedir-clientes';

export function Boton() {
  return <button>{pedirClientes().length}</button>;
}
