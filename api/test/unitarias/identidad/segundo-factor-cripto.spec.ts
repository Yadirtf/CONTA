import { IdUsuario } from '../../../src/modulos/identidad/dominio/index.js';
import { aBase32 } from '../../../src/modulos/identidad/infraestructura/segundo-factor/base32.js';
import { CifradorDeSecretos } from '../../../src/compartido/infraestructura/cifrado/cifrador-de-secretos.js';
import { CodigosDeRecuperacionNode } from '../../../src/modulos/identidad/infraestructura/segundo-factor/codigos-de-recuperacion.js';
import { SecretosDeSegundoFactorNode } from '../../../src/modulos/identidad/infraestructura/segundo-factor/secretos-de-segundo-factor-node.js';
import { codigoDelPaso, pasoDe, pasoQueCoincide } from '../../../src/modulos/identidad/infraestructura/segundo-factor/totp.js';
import { codigoDeLaApp } from '../../apoyo/app-autenticadora.js';

// Criptografía del segundo factor (HU-04.04, ADR-0013): TOTP con los vectores de RFC 6238, cifrado del secreto
// y códigos de recuperación.

const SECRETO_RFC = Buffer.from('12345678901234567890');

describe('TOTP (RFC 6238, SHA-1)', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('a los %i segundos el código es %s', (segundos, codigo) => {
    const instante = new Date(segundos * 1000);
    expect(codigoDelPaso(SECRETO_RFC, pasoDe(instante))).toBe(codigo);
    expect(pasoQueCoincide(SECRETO_RFC, codigo, instante)).toBe(pasoDe(instante));
  });

  it('acepta un paso de margen a cada lado y nada más', () => {
    const ahora = new Date(1111111111 * 1000);
    const paso = pasoDe(ahora);
    expect(pasoQueCoincide(SECRETO_RFC, codigoDelPaso(SECRETO_RFC, paso - 1), ahora)).toBe(paso - 1);
    expect(pasoQueCoincide(SECRETO_RFC, codigoDelPaso(SECRETO_RFC, paso + 1), ahora)).toBe(paso + 1);
    expect(pasoQueCoincide(SECRETO_RFC, codigoDelPaso(SECRETO_RFC, paso + 2), ahora)).toBeNull();
  });

  it('un texto que no son 6 números no coincide', () => {
    expect(pasoQueCoincide(SECRETO_RFC, '28708', new Date(59_000))).toBeNull();
    expect(pasoQueCoincide(SECRETO_RFC, 'abcdef', new Date(59_000))).toBeNull();
  });

  it('base32 de RFC 4648, sin relleno', () => {
    expect(aBase32(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
    expect(aBase32(SECRETO_RFC)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });
});

describe('CifradorDeSecretos', () => {
  const cifrador = new CifradorDeSecretos(Buffer.alloc(32, 7));

  it('cifra con un IV distinto cada vez y descifra solo para la misma persona', () => {
    const a = cifrador.cifrar(SECRETO_RFC, 'persona-a');
    expect(a).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(cifrador.cifrar(SECRETO_RFC, 'persona-a')).not.toBe(a);
    expect(cifrador.descifrar(a, 'persona-a')).toEqual(SECRETO_RFC);
    expect(() => cifrador.descifrar(a, 'persona-b')).toThrow();
  });

  it('rechaza un texto alterado o con otra clave', () => {
    const a = cifrador.cifrar(SECRETO_RFC, 'p');
    const partes = a.split('.');
    const alterado = [partes[0], partes[1], Buffer.from('x'.repeat(20)).toString('base64url'), partes[3]].join('.');
    expect(() => cifrador.descifrar(alterado, 'p')).toThrow();
    expect(() => new CifradorDeSecretos(Buffer.alloc(32, 8)).descifrar(a, 'p')).toThrow();
    expect(() => new CifradorDeSecretos(Buffer.alloc(16))).toThrow();
  });
});

describe('CodigosDeRecuperacionNode', () => {
  const codigos = new CodigosDeRecuperacionNode(Buffer.alloc(32, 3));

  it('da códigos legibles y distintos, y guarda solo huellas', () => {
    const { claros, huellas } = codigos.nuevos(10);
    expect(new Set(claros).size).toBe(10);
    for (const c of claros) expect(c).toMatch(/^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
    for (const h of huellas) expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(huellas.join()).not.toContain(claros[0]!.replace('-', ''));
  });

  it('encuentra el código escrito sin guion, con espacios o en minúsculas', () => {
    const { claros, huellas } = codigos.nuevos(3);
    const tercero = claros[2]!;
    expect(codigos.posicionDe(tercero, huellas)).toBe(2);
    expect(codigos.posicionDe(tercero.replace('-', ' ').toLowerCase(), huellas)).toBe(2);
    expect(codigos.posicionDe('AAAAA-AAAAA', huellas)).toBeNull();
    expect(codigos.posicionDe('corto', huellas)).toBeNull();
  });
});

describe('SecretosDeSegundoFactorNode', () => {
  const secretos = new SecretosDeSegundoFactorNode('k'.repeat(32));
  const persona = IdUsuario.de('55555555-5555-4555-8555-555555555555');

  it('el secreto cifrado verifica los códigos que da la clave mostrada a la persona', () => {
    const { claro, cifrado } = secretos.nuevoSecreto(persona);
    expect(claro).toMatch(/^[A-Z2-7]{32}$/);
    const ahora = new Date('2026-11-26T15:00:00Z');
    expect(secretos.pasoQueCoincide(persona, cifrado, codigoDeLaApp(claro, ahora), ahora)).toBe(pasoDe(ahora));
  });

  it('otra clave del entorno no reconoce los códigos de recuperación', () => {
    const { claros, huellas } = secretos.nuevosCodigosDeRecuperacion();
    expect(claros).toHaveLength(10);
    expect(secretos.recuperacionQueCoincide(claros[0]!, huellas)).toBe(0);
    expect(new SecretosDeSegundoFactorNode('j'.repeat(32)).recuperacionQueCoincide(claros[0]!, huellas)).toBeNull();
  });
});
