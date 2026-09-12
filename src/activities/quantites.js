/* =========================================================================
   Combien y en a-t-il ? — Montessori, pour Térence.

   Associer une quantité à un chiffre, du concret vers l'abstrait. Aucun
   texte : la consigne est portée par l'image et par la voix.

   Autocorrection plutôt que correction : si l'enfant se trompe, le chiffre
   qu'il a choisi se couvre du nombre de jetons qu'il représente vraiment.
   Il voit lui-même que ça ne correspond pas — on ne lui dit pas qu'il a eu
   faux, on lui montre.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';

export const meta = {
  id: 'quantites',
  nom: 'Combien ?',
  type: 'calcul_mental',
  categorie: 'effort',
  ages: [3, 6],
  duree: 70
};

const OBJETS = ['🍎', '🐞', '⭐', '🐟', '🌻', '🦕', '🚗', '🎈'];

const hasard = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

export function apercu(niveau) {
  const max = plafond(niveau);
  return `jusqu'à ${max}`;
}

function plafond(niveau) {
  // Niveau 1 → jusqu'à 3, niveau 10 → jusqu'à 10.
  return Math.min(10, 2 + Math.round(Math.min(10, Math.max(1, niveau)) * 0.85));
}

export function generer(niveau) {
  return { niveau: Math.min(10, Math.max(1, Math.round(niveau))) };
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let reussites = 0;
  let erreurs = 0;
  let fini = false;
  let q = null;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const scene = el('div', {
    style: {
      display: 'flex', flexWrap: 'wrap', gap: 'clamp(8px, 1.6vw, 16px)',
      justifyContent: 'center', alignItems: 'center',
      minHeight: 'clamp(110px, 22vh, 200px)', maxWidth: 'min(620px, 90vw)', margin: '0 auto'
    }
  });

  const choixEl = el('div', {
    style: {
      display: 'flex', gap: 'clamp(12px, 2.4vw, 26px)', justifyContent: 'center',
      flexWrap: 'wrap'
    }
  });

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 'clamp(14px, 3vh, 34px)'
    }
  }, scene, choixEl));

  function nouvelle() {
    if (fini) return;

    const max = plafond(niveauCourant());
    const combien = hasard(1, max);
    const objet = OBJETS[Math.floor(Math.random() * OBJETS.length)];

    const propositions = new Set([combien]);
    while (propositions.size < 3) {
      const p = hasard(1, max);
      if (p !== combien) propositions.add(p);
    }

    q = {
      combien, objet,
      options: [...propositions].sort(() => Math.random() - 0.5)
    };

    scene.replaceChildren(...Array.from({ length: combien }, () => el('span', {
      style: { fontSize: 'clamp(34px, 6vw, 58px)', lineHeight: '1' }
    }, objet)));

    choixEl.replaceChildren(...q.options.map((n) => carteChiffre(n)));

    anim.cascade(scene.children, { decalage: 90, depart: 0 });
    anim.cascade(choixEl.children, { decalage: 90, depart: combien * 90 + 150 });

    // Térence ne lit pas : la consigne passe par la voix.
    audio.parler('Combien y en a-t-il ?');
  }

  function carteChiffre(n) {
    const chiffre = el('span', {
      style: {
        fontFamily: 'var(--u-police-titre)', fontWeight: '800',
        fontSize: 'clamp(38px, 6vw, 62px)', lineHeight: '1'
      }
    }, String(n));

    const jetons = el('div', {
      style: {
        display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: '110px', minHeight: '0', overflow: 'hidden'
      }
    });

    const b = el('button', {
      type: 'button',
      'aria-label': `${n}`,
      class: 'carte',
      style: {
        minWidth: 'clamp(96px, 15vw, 130px)', minHeight: 'clamp(96px, 15vw, 130px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '8px', cursor: 'pointer',
        font: 'inherit', color: 'inherit'
      }
    }, chiffre, jetons);

    b.addEventListener('pointerdown', () => choisir(n, b, jetons));
    return b;
  }

  function choisir(n, bouton, jetons) {
    if (fini || !q) return;

    if (n === q.combien) {
      reussites++;
      audio.son('recompense');
      anim.recompense(bouton);
      attendre(nouvelle, 1100);
      return;
    }

    erreurs++;
    audio.son('presque');
    anim.nonNon(bouton);

    // Autocorrection : le chiffre choisi montre ce qu'il vaut réellement.
    jetons.replaceChildren(...Array.from({ length: n }, () => el('div', {
      style: {
        width: '11px', height: '11px', borderRadius: '50%',
        background: 'var(--u-accent)'
      }
    })));
    anim.cascade(jetons.children, { decalage: 55, depart: 0 });
  }

  const debut = Date.now();
  const battement = setInterval(() => {
    if (fini) return;
    if (Date.now() - debut >= meta.duree * 1000) terminer();
  }, 500);

  function terminer() {
    if (fini) return;
    fini = true;
    clearInterval(battement);
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
    ctx.surFin({ reussites, erreurs });
  }

  nouvelle();

  return function demonter() {
    fini = true;
    clearInterval(battement);
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
  };
}
