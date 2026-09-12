/* =========================================================================
   Les étoiles — adresse, récréation.

   Des étoiles apparaissent et s'éteignent toutes seules ; il faut les
   toucher avant qu'elles disparaissent. Aucune consigne écrite : l'image
   suffit, Térence peut jouer sans savoir lire.

   Tout est paramétrique — nombre, taille, durée de vie — pour couvrir 3 à 12
   ans avec le même code, comme le prévoit le contrat du registre.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';

export const meta = {
  id: 'etoiles',
  nom: 'Les étoiles',
  type: 'adresse',
  categorie: 'detente',
  ages: [3, 12],
  duree: 50
};

export function generer(niveau) {
  const n = Math.max(1, Math.min(10, niveau));
  return {
    niveau: n,
    duree: meta.duree * 1000,                   // l'activité s'arrête au temps, pas au compte
    vie: Math.round(2800 - n * 190),            // ms avant extinction
    taille: Math.max(58, Math.round(104 - n * 5)),
    ecart: Math.round(1500 - n * 95)            // ms entre deux apparitions
  };
}

export function monter(conteneur, exercice, ctx) {
  // La durée est fixée par la séance, pas par l'activité (mode test = raccourci).
  const DUREE = ctx.duree ?? exercice.duree;
  let reussites = 0;
  let erreurs = 0;       // étoiles éteintes sans avoir été touchées
  let fini = false;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const aire = el('div', {
    style: { position: 'relative', flex: '1', minHeight: '0', width: '100%' }
  });

  const compteur = el('div', {
    style: {
      fontFamily: 'var(--u-police-titre)', fontWeight: '800',
      fontSize: 'clamp(28px, 4vw, 44px)', textAlign: 'center',
      color: 'var(--u-secondaire)', minHeight: '1.2em'
    }
  }, '0');

  conteneur.append(compteur, aire);

  function terminer() {
    if (fini) return;
    fini = true;
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
    ctx.surFin({ reussites, erreurs });
  }

  function poser() {
    if (fini) return;

    const r = aire.getBoundingClientRect();
    const t = exercice.taille;
    // Marge intérieure : une étoile ne doit jamais naître à moitié dehors.
    const x = Math.random() * Math.max(1, r.width - t);
    const y = Math.random() * Math.max(1, r.height - t);

    const etoile = el('button', {
      type: 'button',
      'aria-label': 'étoile',
      style: {
        position: 'absolute', left: `${x}px`, top: `${y}px`,
        width: `${t}px`, height: `${t}px`, padding: '0',
        border: 'none', background: 'transparent',
        fontSize: `${Math.round(t * 0.82)}px`, lineHeight: '1',
        cursor: 'pointer'
      }
    }, '⭐');

    let prise = false;
    etoile.addEventListener('pointerdown', () => {
      if (prise || fini) return;
      prise = true;
      reussites++;
      compteur.textContent = String(reussites);
      audio.son('juste');
      anim.recompense(etoile);
      etoile.animate(
        [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.7)', opacity: 0 }],
        { duration: 280, easing: 'ease-out', fill: 'both' }
      ).finished.catch(() => {}).then(() => etoile.remove());
    });

    aire.appendChild(etoile);
    etoile.animate(
      [{ transform: 'scale(.3) rotate(-25deg)', opacity: 0 },
       { transform: 'scale(1) rotate(0deg)', opacity: 1 }],
      { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }
    );

    // Extinction douce : elle s'efface, elle ne « rate » pas bruyamment.
    attendre(() => {
      if (prise || fini) return;
      erreurs++;
      etoile.animate(
        [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }],
        { duration: 360, easing: 'ease-in', fill: 'both' }
      ).finished.catch(() => {}).then(() => etoile.remove());
    }, exercice.vie);
  }

  // L'activité dure le temps annoncé dans `meta.duree`, elle ne s'arrête pas
  // sur un quota d'étoiles : c'est ce qui rend la durée d'une séance prévisible.
  const debut = Date.now();
  const rythme = () => {
    if (fini) return;
    if (Date.now() - debut >= DUREE) {
      // On laisse les dernières étoiles vivre leur vie avant de conclure.
      attendre(terminer, exercice.vie);
      return;
    }
    poser();
    attendre(rythme, exercice.ecart);
  };
  attendre(rythme, 450);

  return function demonter() {
    fini = true;
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
  };
}
