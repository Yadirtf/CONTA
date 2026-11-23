import { randomUUID } from 'node:crypto';

/** Ids de los elementos de una firma. Son únicos por firma para que dos firmas nunca choquen. */
export interface IdentificadoresDeFirma {
  readonly firma: string;
  readonly referenciaAlDocumento: string;
  readonly keyInfo: string;
  readonly objeto: string;
  readonly propiedadesCalificantes: string;
  readonly propiedadesFirmadas: string;
}

export function nuevosIdentificadores(unico: () => string = randomUUID): IdentificadoresDeFirma {
  const firma = `xmldsig-${unico()}`;
  return {
    firma,
    referenciaAlDocumento: `${firma}-ref0`,
    keyInfo: `${firma}-keyinfo`,
    objeto: `XadesObjectId-${unico()}`,
    propiedadesCalificantes: `QualifyingProperties-${unico()}`,
    propiedadesFirmadas: `${firma}-signedprops`,
  };
}
