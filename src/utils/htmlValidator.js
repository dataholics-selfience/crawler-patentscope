// src/utils/htmlValidator.js

/**
 * Verifica se o HTML contém elementos esperados da página de resultados da WIPO Patentscope.
 * Retorna true se o HTML parece válido.
 */
export function validatePatentHTML(html) {
  if (!html || typeof html !== "string") return false;

  // Palavras-chave e padrões esperados em páginas de resultado da WIPO
  const patterns = [
    /patentscope\.wipo\.int/i,
    /Search Results/i,
    /resultTable/i,
    /publication number/i,
    /PCT/i,
  ];

  // Se pelo menos 2 padrões forem encontrados, consideramos válido
  let matches = patterns.filter((regex) => regex.test(html));
  return matches.length >= 2;
}
