import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Comprueba que .dependency-cruiser.cjs atrapa cada violación de la sección 4.3 de la arquitectura
// (HU-01.03), con los ejemplos de ./ejemplos, que las rompen a propósito.
const raiz = fileURLToPath(new URL('../..', import.meta.url));

interface Violacion {
  from: string;
  to: string;
  rule: { name: string };
}

function depcruise(carpeta: string, formato: 'json' | 'err-long') {
  return spawnSync(
    process.execPath,
    ['node_modules/dependency-cruiser/bin/dependency-cruiser.mjs', carpeta, '--config', '.dependency-cruiser.cjs', '--output-type', formato],
    { cwd: raiz, encoding: 'utf8' },
  );
}

describe('reglas de dependencia de web (sitio)', () => {
  const json = JSON.parse(depcruise('test/arquitectura/ejemplos/src', 'json').stdout) as {
    summary: { violations: Violacion[] };
  };
  const ci = depcruise('test/arquitectura/ejemplos/src', 'err-long');
  const reglas = (de: string) =>
    json.summary.violations
      .filter((v) => v.from.includes(de))
      .map((v) => `${v.rule.name} → ${v.to.replace(/^.*node_modules\//, '').replace(/^.*ejemplos\/src\//, '')}`)
      .sort();

  it('hace fallar el pipeline con un mensaje que nombra la regla', () => {
    expect(ci.status).not.toBe(0);
    expect(ci.stdout).toContain('error dominio-sin-frameworks');
    expect(ci.stdout).toContain('El dominio de una funcionalidad es TypeScript puro');
  });

  it('prohíbe react, módulos de Node y otras capas en el dominio', () => {
    expect(reglas('ventas/dominio/')).toEqual([
      'dominio-sin-frameworks → fs',
      'dominio-sin-frameworks → react/index.js',
      'dominio-sin-otras-capas → funcionalidades/ventas/datos/pedir-ventas.ts',
    ]);
  });

  it('prohíbe que datos/ use ui/', () => {
    expect(reglas('ventas/datos/')).toEqual(['datos-sin-ui → funcionalidades/ventas/ui/lista-de-ventas.tsx']);
  });

  it('prohíbe usar los datos/ o la ui/ de otra funcionalidad', () => {
    expect(reglas('ventas/ui/')).toEqual([
      'funcionalidad-sin-datos-ni-ui-ajenos → funcionalidades/clientes/datos/pedir-clientes.ts',
    ]);
  });

  it('prohíbe que compartido/ conozca las funcionalidades', () => {
    expect(reglas('compartido/')).toEqual([
      'compartido-sin-funcionalidades → funcionalidades/clientes/datos/pedir-clientes.ts',
    ]);
  });

  it('no marca el código real de src/', () => {
    const real = depcruise('src', 'err-long');
    expect(real.status, real.stdout).toBe(0);
  });
});
