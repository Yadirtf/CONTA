import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Comprueba que las reglas de .dependency-cruiser.cjs atrapan cada violación de la arquitectura
// (HU-01.02), usando los ejemplos de ./ejemplos, que las rompen a propósito.
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

function cruzar(carpeta: string): { codigo: number | null; mensaje: string; violaciones: Violacion[] } {
  const salida = JSON.parse(depcruise(carpeta, 'json').stdout) as { summary: { violations: Violacion[] } };
  // El formato err-long es el que corre en CI: su código de salida hace fallar el pipeline.
  const ci = depcruise(carpeta, 'err-long');
  return { codigo: ci.status, mensaje: ci.stdout, violaciones: salida.summary.violations };
}

describe('reglas de dependencia', () => {
  const { codigo, mensaje, violaciones } = cruzar('test/arquitectura/ejemplos/src');
  const reglas = (de: string) =>
    violaciones.filter((v) => v.from.includes(de)).map((v) => `${v.rule.name} → ${v.to.replace(/^.*node_modules\//, '')}`);

  it('hace fallar el pipeline con un mensaje que nombra la regla', () => {
    expect(codigo).not.toBe(0);
    expect(mensaje).toContain('error dominio-sin-frameworks');
    expect(mensaje).toContain('El dominio no importa paquetes externos');
  });

  it('prohíbe @nestjs/* y módulos de Node en el dominio, y que el dominio use otras capas', () => {
    const encontradas = reglas('ventas/dominio/factura.ts');
    expect(encontradas).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^dominio-sin-frameworks → @nestjs\/common/),
        'dominio-sin-node → fs',
        expect.stringMatching(/^dominio-sin-otras-capas → .*aplicacion\/repositorio-facturas\.ts$/),
      ]),
    );
  });

  it('prohíbe SDKs e infraestructura en la aplicación y el dominio interno de otro módulo', () => {
    const encontradas = reglas('ventas/aplicacion/repositorio-facturas.ts');
    expect(encontradas).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^aplicacion-sin-frameworks → pg\//),
        expect.stringMatching(/^aplicacion-sin-infraestructura-ni-presentacion → /),
        expect.stringMatching(/^modulos-solo-por-su-index → .*caja\/dominio\/caja\.ts$/),
      ]),
    );
  });

  it('prohíbe que presentación e infraestructura se importen entre sí', () => {
    expect(violaciones.map((v) => v.rule.name)).toEqual(
      expect.arrayContaining(['presentacion-sin-infraestructura', 'infraestructura-sin-presentacion', 'sin-ciclos']),
    );
  });

  it('el código real de src/ cumple todas las reglas', () => {
    const real = cruzar('src');
    expect(real.violaciones).toEqual([]);
    expect(real.codigo).toBe(0);
  });
});
