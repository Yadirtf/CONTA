import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Portada } from './portada';

describe('Portada', () => {
  it('presenta el producto en español', () => {
    const html = renderToStaticMarkup(<Portada />);
    expect(html).toContain('<h1>CONTA</h1>');
    expect(html).toContain('Factura electrónica');
  });
});
