/* =========================================================================
   Petit assistant de construction d'éléments.
   Évite la concaténation de chaînes HTML : pas d'innerHTML, donc pas de
   surprise d'échappement, et on garde une référence directe sur chaque
   élément à animer.
   ========================================================================= */

/**
 * el('div', { class: 'carte', onclick: fn, style: {...} }, ...enfants)
 * Les enfants peuvent être des éléments, des chaînes, ou null (ignoré).
 */
export function el(balise, props = {}, ...enfants) {
  const n = document.createElement(balise);

  for (const [cle, valeur] of Object.entries(props || {})) {
    if (valeur == null || valeur === false) continue;

    if (cle === 'class') n.className = valeur;
    else if (cle === 'style' && typeof valeur === 'object') Object.assign(n.style, valeur);
    else if (cle === 'dataset') Object.assign(n.dataset, valeur);
    else if (cle.startsWith('on') && typeof valeur === 'function') {
      n.addEventListener(cle.slice(2), valeur);
    }
    else if (cle in n && cle !== 'list') n[cle] = valeur;
    else n.setAttribute(cle, valeur);
  }

  for (const enfant of enfants.flat()) {
    if (enfant == null || enfant === false) continue;
    n.append(enfant.nodeType ? enfant : document.createTextNode(String(enfant)));
  }
  return n;
}

/** Insère un SVG décrit en chaîne (icônes internes uniquement, jamais d'entrée externe). */
export function svg(code, props = {}) {
  const gabarit = document.createElement('div');
  gabarit.innerHTML = code.trim();
  const n = gabarit.firstElementChild;
  for (const [cle, valeur] of Object.entries(props)) n.setAttribute(cle, valeur);
  return n;
}
