// Revisa el texto de un archivo contra las reglas de estilos sueltos. Función pura: no lee el disco.
import { EXCEPCION, REGLAS } from './reglas.mjs';

const LENGUAJE_POR_EXTENSION = { '.dart': 'dart', '.css': 'css', '.ts': 'ts', '.tsx': 'ts', '.js': 'ts', '.jsx': 'ts' };

/** Lenguaje de una ruta según su extensión, o null si no se revisa. */
export function lenguajeDe(ruta) {
  const extension = ruta.slice(ruta.lastIndexOf('.'));
  return LENGUAJE_POR_EXTENSION[extension] ?? null;
}

/** Quita los comentarios de línea para no marcar un color citado en la documentación. */
function sinComentario(linea, lenguaje) {
  const marcador = lenguaje === 'css' ? null : linea.indexOf('//');
  const recortada = marcador !== null && marcador >= 0 && !/https?:$/.test(linea.slice(0, marcador)) ? linea.slice(0, marcador) : linea;
  return recortada.replace(/\/\*.*?\*\//g, '');
}

/** Devuelve [{ruta, linea, regla, texto, usa}] por cada estilo suelto del archivo. */
export function revisarTexto(ruta, texto) {
  const lenguaje = lenguajeDe(ruta);
  if (!lenguaje) return [];
  const reglas = REGLAS.filter((r) => r.lenguajes.includes(lenguaje));
  const hallazgos = [];
  texto.split('\n').forEach((original, indice) => {
    if (EXCEPCION.test(original)) return;
    const linea = sinComentario(original, lenguaje);
    for (const regla of reglas) {
      if (regla.patron.test(linea)) {
        hallazgos.push({ ruta, linea: indice + 1, regla: regla.id, texto: original.trim(), usa: regla.usa });
      }
    }
  });
  return hallazgos;
}
