/* =========================================================================
   Petits contrôles réutilisés par plusieurs écrans.
   ========================================================================= */

import { el } from './dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as store from '../core/store.js';

/** Silence global, accessible en un seul tap (usage en voiture). */
export function boutonSilence(styleSupplementaire = {}) {
  const b = el('button', {
    type: 'button',
    class: 'bouton',
    'aria-label': 'Couper ou remettre le son',
    style: {
      width: 'var(--touche-min)', padding: '0', fontSize: '26px',
      flex: '0 0 auto', ...styleSupplementaire
    }
  }, audio.estActif() ? '🔊' : '🔇');

  b.addEventListener('pointerdown', () => {
    const actif = audio.silence(audio.estActif());
    b.textContent = actif ? '🔊' : '🔇';
    if (actif) audio.son('tap');
    anim.appui(b);
    store.definirReglage('son_actif', actif).catch(() => {});
  });

  return b;
}

/**
 * Bouton à appui long — le geste qui protège des doigts d'enfants.
 * Utilisé pour l'accès parent, et plus tard pour la roue de difficulté.
 */
export function appuiLong(element, action, { duree = 900 } = {}) {
  let minuteur = null;
  let anneau = null;

  const debut = () => {
    annuler();
    // Un anneau se remplit pendant l'appui : le geste doit être découvrable,
    // pas secret. Un adulte comprend en une seconde qu'il faut insister.
    anneau = element.animate(
      [{ boxShadow: '0 0 0 0 var(--u-secondaire)' },
       { boxShadow: '0 0 0 8px color-mix(in srgb, var(--u-secondaire) 35%, transparent)' }],
      { duration: duree, easing: 'linear', fill: 'both' }
    );
    minuteur = setTimeout(() => {
      annuler();
      audio.son('juste');
      action();
    }, duree);
  };

  const annuler = () => {
    if (minuteur) { clearTimeout(minuteur); minuteur = null; }
    if (anneau) { anneau.cancel(); anneau = null; }
  };

  element.addEventListener('pointerdown', debut);
  for (const t of ['pointerup', 'pointerleave', 'pointercancel']) {
    element.addEventListener(t, annuler);
  }
  return annuler;
}
