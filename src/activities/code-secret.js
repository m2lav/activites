/* =========================================================================
   Le code secret — un mastermind pour enfants.

   On propose une combinaison de couleurs, on apprend combien sont bien
   placées et combien sont présentes mais ailleurs, et on recommence. C'est
   le seul exercice du catalogue qui enseigne le raisonnement par
   élimination : chaque essai rétrécit le champ des possibles.

   Deux adaptations pour l'âge :
   - les indices sont des pastilles vertes et oranges, jamais des chiffres
     à interpréter ;
   - aux premiers niveaux, aucune couleur ne se répète dans le code, ce qui
     rend la déduction beaucoup plus directe.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as retour from '../ui/retour.js';
import { creerMinuterie } from './minuterie.js';

export const meta = {
  id: 'code-secret',
  nom: 'Le code secret',
  type: 'logique',
  categorie: 'effort',
  ages: [7, 12],
  duree: 100,
  consigne: 'Trouve le code. Vert : bien placé. Orange : mal placé.'
};

const PALETTE = ['#e03131', '#1c7ed6', '#2fa84f', '#e8b900', '#9b5de5', '#f06595'];

/** [longueur du code, nombre de couleurs, répétitions autorisées] par niveau. */
const PALIERS = [
  [3, 3, false], [3, 3, false], [3, 4, false], [3, 4, false], [4, 4, false],
  [4, 4, false], [4, 5, false], [4, 5, true], [4, 6, true], [5, 6, true]
];

const ESSAIS_MAX = 6;

export function apercu(niveau) {
  const [longueur, couleurs] = PALIERS[Math.min(10, Math.max(1, Math.round(niveau))) - 1];
  return `${longueur} cases, ${couleurs} couleurs`;
}

export function generer(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  const [longueur, nbCouleurs, repetitions] = PALIERS[n - 1];
  const dispo = PALETTE.slice(0, nbCouleurs);

  const code = [];
  const restantes = [...dispo];
  for (let i = 0; i < longueur; i++) {
    if (repetitions) {
      code.push(dispo[Math.floor(Math.random() * dispo.length)]);
    } else {
      const j = Math.floor(Math.random() * restantes.length);
      code.push(restantes.splice(j, 1)[0]);
    }
  }

  return { niveau: n, longueur, couleurs: dispo, code };
}

/** Bien placées, et présentes mais ailleurs — règle classique du mastermind. */
function comparer(proposition, code) {
  const resteProp = [];
  const resteCode = [];
  let bien = 0;

  for (let i = 0; i < code.length; i++) {
    if (proposition[i] === code[i]) bien++;
    else { resteProp.push(proposition[i]); resteCode.push(code[i]); }
  }

  let ailleurs = 0;
  for (const c of resteProp) {
    const j = resteCode.indexOf(c);
    if (j !== -1) { ailleurs++; resteCode.splice(j, 1); }
  }

  return { bien, ailleurs };
}

function pastille(couleur, taille = 30) {
  return el('div', {
    style: {
      width: `${taille}px`, height: `${taille}px`, borderRadius: '50%',
      background: couleur || 'transparent',
      border: couleur ? 'none' : '3px dashed color-mix(in srgb, var(--u-texte) 30%, transparent)',
      flex: '0 0 auto'
    }
  });
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let courant = exercice;
  let proposition = [];
  let essais = 0;
  let reussites = 0;
  let erreurs = 0;
  let fini = false;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const historique = el('div', {
    style: {
      display: 'grid', gap: '6px', justifyContent: 'center',
      maxHeight: '38vh', overflowY: 'auto', width: '100%'
    }
  });

  const encours = el('div', {
    style: { display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }
  });

  const palette = el('div', {
    style: { display: 'flex', gap: 'clamp(8px, 1.6vw, 16px)', justifyContent: 'center', flexWrap: 'wrap' }
  });

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      gap: 'clamp(12px, 2.6vh, 26px)', position: 'relative'
    }
  }, historique, encours, palette));

  function dessinerEnCours() {
    encours.replaceChildren(
      ...Array.from({ length: courant.longueur }, (_, i) => {
        const b = el('button', {
          type: 'button',
          style: {
            padding: '4px', border: 'none', background: 'transparent',
            cursor: proposition[i] ? 'pointer' : 'default'
          }
        }, pastille(proposition[i], 38));
        // Toucher une pastille posée la retire : on peut se reprendre.
        b.addEventListener('pointerdown', () => {
          if (fini || !proposition[i]) return;
          proposition.splice(i, 1);
          audio.son('tap');
          dessinerEnCours();
        });
        return b;
      }),
      el('button', {
        class: 'bouton bouton--primaire', type: 'button',
        style: { minHeight: '48px', padding: '0 20px', marginLeft: '10px', fontSize: '18px' },
        disabled: proposition.length < courant.longueur,
        onpointerdown: () => valider()
      }, 'Essayer')
    );
  }

  function ligneHistorique(prop, { bien, ailleurs }) {
    const indices = el('div', {
      style: { display: 'flex', gap: '3px', marginLeft: '12px', alignItems: 'center' }
    },
      ...Array.from({ length: bien }, () => pastille('var(--u-vert-ok)', 13)),
      ...Array.from({ length: ailleurs }, () => pastille('var(--u-orange-presque)', 13))
    );

    return el('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '5px 10px', borderRadius: '10px',
        background: 'color-mix(in srgb, var(--u-carte) 45%, transparent)'
      }
    },
      el('div', { style: { display: 'flex', gap: '5px' } }, ...prop.map((c) => pastille(c, 22))),
      indices
    );
  }

  function valider() {
    if (fini || proposition.length < courant.longueur) return;

    const resultat = comparer(proposition, courant.code);
    historique.appendChild(ligneHistorique([...proposition], resultat));
    historique.scrollTop = historique.scrollHeight;
    essais++;

    if (resultat.bien === courant.longueur) {
      reussites++;
      audio.son('recompense');
      retour.reussite(conteneur, 'Code trouvé !');
      attendre(rejouer, 1600);
      return;
    }

    if (essais >= ESSAIS_MAX) {
      erreurs++;
      audio.son('presque');
      historique.appendChild(el('div', {
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '6px', color: 'var(--u-orange-presque)', fontWeight: '700'
        }
      }, 'Le code :', ...courant.code.map((c) => pastille(c, 22))));
      retour.reponseMontree(conteneur, 'Le voilà !');
      attendre(rejouer, 2600);
      return;
    }

    audio.son('touche');
    proposition = [];
    dessinerEnCours();
  }

  function rejouer() {
    if (fini) return;
    // Point de rupture : une partie est finie, jamais au milieu d'un essai.
    if (minuterie.doitFinir()) { terminer(); return; }
    courant = generer(niveauCourant());
    proposition = [];
    essais = 0;
    historique.replaceChildren();
    installer();
  }

  function installer() {
    palette.replaceChildren(...courant.couleurs.map((c) => {
      const b = el('button', {
        type: 'button',
        style: {
          padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer'
        }
      }, pastille(c, 44));
      b.addEventListener('pointerdown', () => {
        if (fini || proposition.length >= courant.longueur) return;
        proposition.push(c);
        audio.son('touche');
        anim.appui(b);
        dessinerEnCours();
      });
      return b;
    }));
    dessinerEnCours();
    anim.cascade(palette.children, { decalage: 50, depart: 0 });
  }

  const minuterie = creerMinuterie({
    duree: ctx.duree ?? meta.duree * 1000,
    terminer: () => terminer()
  });

  function terminer() {
    if (fini) return;
    fini = true;
    minuterie.arreter();
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
    ctx.surFin({ reussites, erreurs });
  }

  installer();

  return function demonter() {
    fini = true;
    minuterie.arreter();
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
  };
}
