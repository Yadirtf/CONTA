import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class PedirCodigo {
  @ApiProperty({ example: '300 123 4567', description: 'Celular de Colombia. Acepta espacios y +57.' })
  readonly celular!: string;
}

export class Entrar {
  @ApiProperty({ example: '300 123 4567' })
  readonly celular!: string;

  @ApiProperty({ example: '482913', pattern: '^\\d{6}$' })
  readonly codigo!: string;
}

/** Lee un campo de texto del cuerpo. Sin class-validator: dos campos no lo justifican. */
export function campoDeTexto(cuerpo: unknown, campo: string, maximo = 30): string {
  const valor = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>)[campo] : undefined;
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > maximo) {
    throw new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: `Falta el campo ${campo}` });
  }
  return valor;
}

/** El código son 6 dígitos. Uno mal formado no cuenta como intento: no pudo acertar. */
export function codigoDe(cuerpo: unknown): string {
  const codigo = campoDeTexto(cuerpo, 'codigo').trim();
  if (!/^\d{6}$/.test(codigo)) {
    throw new BadRequestException({ codigo: 'acceso.codigo-mal-escrito', mensaje: 'El código tiene 6 números' });
  }
  return codigo;
}
