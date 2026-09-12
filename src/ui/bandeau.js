/* =========================================================================
   Bandeau supérieur.

   Il vit au-dessus de la scène, hors du routeur : c'est ce qui permet au
   sablier de rester continu pendant que les activités défilent en dessous.
   Le remonter à chaque écran le ferait repartir de zéro visuellement.
   ========================================================================= */

import { el } from './dom.js';

function noeud() {
  return document.getElementById('bandeau');
}

/** Installe le contenu du bandeau et l'affiche. */
export function poser(...elements) {
  const b = noeud();
  b.replaceChildren(
    el('div', {
      style: { display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '10px' }
    }, ...elements.filter(Boolean))
  );
  b.hidden = false;

  b.animate(
    [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 320, easing: 'cubic-bezier(.22,.9,.28,1)', fill: 'both' }
  );
  return b;
}

export function vider() {
  const b = noeud();
  b.replaceChildren();
  b.hidden = true;
}
