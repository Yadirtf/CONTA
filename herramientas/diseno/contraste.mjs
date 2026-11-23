// Contraste WCAG 2.x entre dos colores hex (#rrggbb). Sin dependencias.

/** Luminancia relativa de un color #rrggbb, según WCAG 2.x. */
export function luminancia(hex) {
  const [r, g, b] = canales(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste entre dos colores, de 1 a 21. */
export function razonDeContraste(a, b) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Canales [r, g, b] de 0 a 255. Falla si el texto no es #rrggbb. */
export function canales(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`Color inválido: ${hex} (se espera #rrggbb)`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
