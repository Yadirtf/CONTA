import { urlBaseDeDatos } from './base-de-datos.js';

describe('urlBaseDeDatos', () => {
  const env = { DATABASE_URL: 'postgres://develop', DATABASE_URL_PREVIEW: 'postgres://preview' };

  it('usa la rama develop de Neon fuera de las vistas previas', () => {
    expect(urlBaseDeDatos(env)).toBe('postgres://develop');
  });

  it('usa la rama preview de Neon en una vista previa de Render', () => {
    expect(urlBaseDeDatos({ ...env, IS_PULL_REQUEST: 'true' })).toBe('postgres://preview');
  });

  it('no cae en la base de develop si a la vista previa le falta DATABASE_URL_PREVIEW', () => {
    expect(urlBaseDeDatos({ DATABASE_URL: 'postgres://develop', IS_PULL_REQUEST: 'true' })).toBeUndefined();
  });

  it('trata una cadena vacía como ausente', () => {
    expect(urlBaseDeDatos({ DATABASE_URL: ' ' })).toBeUndefined();
  });
});
