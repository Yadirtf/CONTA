import { eq } from 'drizzle-orm';
import type { IdEmpresa } from '../../../../compartido/dominio/index.js';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import { empresas } from '../../../../compartido/infraestructura/persistencia/esquema.js';
import type { RepositorioEmpresas } from '../../aplicacion/puertos/repositorio-empresas.js';
import type { Empresa } from '../../dominio/empresa.js';
import { empresaDeFila } from './empresa-de-fila.js';

// No filtra por empresa a mano: la transacción ya la fijó y RLS la impone. Un filtro de más aquí
// escondería un error de la política en vez de mostrarlo en las pruebas de aislamiento.
export class RepositorioEmpresasPostgres implements RepositorioEmpresas {
  constructor(private readonly ejecutor: Ejecutor) {}

  async buscar(id: IdEmpresa): Promise<Empresa | null> {
    const [fila] = await this.ejecutor
      .select({ id: empresas.id, razonSocial: empresas.razonSocial })
      .from(empresas)
      .where(eq(empresas.id, id.valor))
      .limit(1);
    return fila ? empresaDeFila(fila) : null;
  }

  async agregar(empresa: Empresa): Promise<void> {
    await this.ejecutor.insert(empresas).values({ id: empresa.id.valor, razonSocial: empresa.razonSocial });
  }

  async guardar(empresa: Empresa): Promise<void> {
    await this.ejecutor
      .insert(empresas)
      .values({ id: empresa.id.valor, razonSocial: empresa.razonSocial })
      .onConflictDoUpdate({ target: empresas.id, set: { razonSocial: empresa.razonSocial } });
  }
}
