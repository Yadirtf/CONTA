import { el, grupo, serializar } from './escritor-xml.js';

describe('escritor de XML', () => {
  it('escribe sin espacios, omite hijos vacíos y cierra elementos vacíos', () => {
    const xml = serializar(grupo('a', [el('b', 'uno', { x: '1' }), null, false, el('c', '')]));
    expect(xml).toBe('<?xml version="1.0" encoding="UTF-8" standalone="no"?><a><b x="1">uno</b><c/></a>');
  });

  it('escapa texto y atributos, así un dato no puede inyectar marcado', () => {
    const xml = serializar(el('a', '</a><b>&', { t: '"><x' }));
    expect(xml).toContain('<a t="&quot;&gt;&lt;x">&lt;/a&gt;&lt;b&gt;&amp;</a>');
  });

  it('rechaza caracteres que XML no admite y nombres inválidos', () => {
    expect(() => serializar(el('a', 'nulo\u0000'))).toThrow('caracteres');
    expect(() => serializar(el('a', '￿'))).toThrow('caracteres');
    expect(() => serializar(el('a b', 'x'))).toThrow('Nombre');
    expect(() => serializar(el('a', 'x', { 'on"x': '1' }))).toThrow('Nombre');
  });

  it('admite tildes, eñes y caracteres fuera del plano básico', () => {
    expect(serializar(el('a', 'Panadería Ñandú 😀'))).toContain('Panadería Ñandú 😀');
  });
});
