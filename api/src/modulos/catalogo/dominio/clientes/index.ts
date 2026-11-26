export { Cliente, type DatosDeCliente, type DatosDeClienteNuevo } from './cliente.js';
export { type Direccion } from './contacto.js';
export { CONSUMIDOR_FINAL, esConsumidorFinal } from './consumidor-final.js';
export {
  esTipoDePersona,
  RESPONSABILIDADES_FISCALES,
  SIN_RESPONSABILIDADES,
  TIPOS_DE_PERSONA,
  type TipoDePersona,
} from './datos-tributarios.js';
export { comprobarQuePuedeCrear, MAXIMO_DE_CLIENTES_NUEVOS_POR_DIA, UN_DIA_EN_MS } from './limites-de-clientes.js';
export { digitoEscritoEn, numeroDeDocumentoLimpio } from './numero-de-documento.js';
export { MAXIMO_DE_RESULTADOS, MINIMO_DE_CARACTERES_PARA_BUSCAR, TerminoDeBusqueda } from './termino-de-busqueda.js';
