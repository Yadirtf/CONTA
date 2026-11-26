import {
  exigirPermiso,
  modoPermitido,
  modoPorDefecto,
  Permiso,
  permisosDe,
  type Rol,
  ROLES,
  tienePermiso,
} from '../../../src/compartido/dominio/index.js';

// Matriz de permisos de HU-04.03 (ADR-0012), en las dos direcciones: lo permitido y lo negado.
const ESPERADO: Readonly<Record<Rol, readonly Permiso[]>> = {
  dueno: Object.values(Permiso),
  contador: [Permiso.VerEmpresa, Permiso.Vender, Permiso.GestionarProductos, Permiso.VerInformes, Permiso.AnularDocumentos, Permiso.UsarModoContador],
  cajero: [Permiso.VerEmpresa, Permiso.Vender],
};

describe('permisos por rol', () => {
  it.each(ROLES.flatMap((rol) => Object.values(Permiso).map((permiso) => [rol, permiso] as const)))(
    '%s · %s',
    (rol, permiso) => {
      expect(tienePermiso(rol, permiso)).toBe(ESPERADO[rol].includes(permiso));
    },
  );

  it('el cajero vende, pero no crea productos, no abre informes, no anula documentos ni gestiona personas', () => {
    expect(tienePermiso('cajero', Permiso.Vender)).toBe(true);
    for (const negado of [Permiso.GestionarProductos, Permiso.VerInformes, Permiso.AnularDocumentos, Permiso.GestionarMiembros, Permiso.UsarModoContador]) {
      expect(() => exigirPermiso('cajero', negado)).toThrow(expect.objectContaining({ codigo: 'permiso.denegado', message: 'No tienes permiso' }));
    }
  });

  it('solo el dueño gestiona personas', () => {
    expect(ROLES.filter((rol) => tienePermiso(rol, Permiso.GestionarMiembros))).toEqual(['dueno']);
  });

  it('permisosDe da la lista en el orden en que se declaran', () => {
    expect(permisosDe('cajero')).toEqual(['ver-empresa', 'vender']);
    expect(permisosDe('dueno')).toEqual(Object.values(Permiso));
  });
});

describe('modo', () => {
  it('el modo simple siempre se puede; el contador, solo con su permiso', () => {
    expect(ROLES.every((rol) => modoPermitido(rol, 'simple'))).toBe(true);
    expect(ROLES.filter((rol) => modoPermitido(rol, 'contador'))).toEqual(['dueno', 'contador']);
  });

  it('el contador empieza en modo contador; el dueño y el cajero, en simple', () => {
    expect(ROLES.map(modoPorDefecto)).toEqual(['simple', 'contador', 'simple']);
  });
});
