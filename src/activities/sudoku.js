/* =========================================================================
   Sudoku des formes — 4 × 4, avec des symboles au lieu de chiffres.

   Ni lecture, ni calcul : uniquement de la déduction. Chaque symbole
   apparaît une fois par ligne, une fois par colonne, une fois par carré de
   quatre. C'est jouable dès cinq ans.

   La grille est fabriquée à partir d'une grille valide que l'on brasse —
   permutation des symboles, échange de lignes à l'intérieur d'une bande,
   échange de colonnes, transposition. Toutes ces opérations conservent la
   validité, donc la grille produite est toujours correcte, et la solution
   toujours connue.

   Autocorrection immédiate : un symbole mal placé ne s'installe pas. Le
   laisser se poser pour ne le signaler qu'à la fin ferait reconstruire tout
   un raisonnement faux.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as retour from '../ui/retour.js';
import { creerMinuterie } from './minuterie.js';

export const meta = {
  id: 'sudoku',
  nom: 'Le sudoku des formes',
  type: 'logique',
  categorie: 'effort',
  ages: [5, 12],
  duree: 95,
  consigne: 'Chaque dessin une seule fois par ligne et par colonne.'
};

const SYMBOLES = ['🦊', '🌻', '⛵', '⭐'];

/** Nombre de cases à vider, par niveau. */
const TROUS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function apercu(niveau) {
  return `${TROUS[Math.min(10, Math.max(1, Math.round(niveau))) - 1]} cases à trouver`;
}

/** Grille 4 × 4 valide de base — toutes les autres en dérivent. */
const BASE = [
  [0, 1, 2, 3],
  [2, 3, 0, 1],
  [1, 0, 3, 2],
  [3, 2, 1, 0]
];

function brasser() {
  let g = BASE.map((l) => [...l]);

  // Permutation des symboles.
  const perm = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  g = g.map((l) => l.map((v) => perm[v]));

  // Échange de deux lignes à l'intérieur d'une même bande, puis de colonnes.
  for (const bande of [0, 2]) {
    if (Math.random() < 0.5) { const t = g[bande]; g[bande] = g[bande + 1]; g[bande + 1] = t; }
  }
  for (const pile of [0, 2]) {
    if (Math.random() < 0.5) for (const l of g) { const t = l[pile]; l[pile] = l[pile + 1]; l[pile + 1] = t; }
  }

  // Échange des deux bandes, puis des deux piles.
  if (Math.random() < 0.5) g = [g[2], g[3], g[0], g[1]];
  if (Math.random() < 0.5) g = g.map((l) => [l[2], l[3], l[0], l[1]]);

  // Transposition : lignes et colonnes jouent le même rôle.
  if (Math.random() < 0.5) g = g[0].map((_, c) => g.map((l) => l[c]));

  return g;
}

export function generer(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  const solution = brasser();

  const positions = [];
  for (let l = 0; l < 4; l++) for (let c = 0; c < 4; c++) positions.push([l, c]);
  positions.sort(() => Math.random() - 0.5);

  const grille = solution.map((l) => [...l]);
  for (const [l, c] of positions.slice(0, TROUS[n - 1])) grille[l][c] = null;

  return { niveau: n, solution, grille };
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let courant = exercice;
  let reussites = 0;
  let erreurs = 0;
  let restantes = 0;
  let fini = false;
  let selection = null;
  let cases = [];

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const grilleEl = el('div', {
    style: {
      display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '3px',
      margin: '0 auto', padding: '6px', borderRadius: '12px',
      background: 'color-mix(in srgb, var(--u-texte) 22%, transparent)'
    }
  });

  const palette = el('div', {
    style: {
      display: 'flex', gap: 'clamp(10px, 2vw, 20px)', justifyContent: 'center',
      flexWrap: 'wrap'
    }
  });

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      gap: 'clamp(14px, 3.5vh, 34px)', position: 'relative'
    }
  }, grilleEl, palette));

  function installer() {
    const dispo = Math.min(
      (conteneur.clientHeight || 400) * 0.5,
      (conteneur.clientWidth || 600) * 0.6
    );
    const cote = Math.max(42, Math.min(Math.floor(dispo / 4) - 6, 96));

    grilleEl.replaceChildren();
    cases = [];
    restantes = 0;
    selection = null;

    for (let l = 0; l < 4; l++) {
      for (let c = 0; c < 4; c++) {
        const valeur = courant.grille[l][c];
        const vide = valeur === null;
        if (vide) restantes++;

        const cellule = el('button', {
          type: 'button',
          disabled: !vide,
          style: {
            width: `${cote}px`, height: `${cote}px`,
            display: 'grid', placeItems: 'center',
            fontSize: `${Math.round(cote * 0.55)}px`, lineHeight: '1',
            border: 'none', cursor: vide ? 'pointer' : 'default',
            // Les carrés de quatre se distinguent par une teinte alternée.
            background: ((Math.floor(l / 2) + Math.floor(c / 2)) % 2 === 0)
              ? 'color-mix(in srgb, var(--u-carte) 85%, transparent)'
              : 'color-mix(in srgb, var(--u-carte) 55%, transparent)',
            borderRadius: '6px', transition: 'outline-color .15s ease',
            outline: '3px solid transparent', outlineOffset: '-3px'
          }
        }, vide ? '' : SYMBOLES[valeur]);

        const infos = { element: cellule, ligne: l, colonne: c, vide };
        if (vide) cellule.addEventListener('pointerdown', () => selectionner(infos));
        cases.push(infos);
        grilleEl.appendChild(cellule);
      }
    }

    palette.replaceChildren(...SYMBOLES.map((s, i) => {
      const b = el('button', {
        class: 'carte', type: 'button',
        style: {
          padding: '10px', minWidth: `${Math.round(cote * 0.95)}px`,
          minHeight: `${Math.round(cote * 0.95)}px`,
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          fontSize: `${Math.round(cote * 0.52)}px`, lineHeight: '1'
        }
      }, s);
      b.addEventListener('pointerdown', () => poser(i, b));
      return b;
    }));

    anim.cascade([...grilleEl.children, ...palette.children], { decalage: 22, depart: 0 });
  }

  function selectionner(infos) {
    if (fini || !infos.vide) return;
    for (const c of cases) c.element.style.outlineColor = 'transparent';
    selection = infos;
    infos.element.style.outlineColor = 'var(--u-secondaire)';
    audio.son('tap');
  }

  function poser(valeur, bouton) {
    if (fini) return;
    if (!selection) { retour.echec(conteneur, 'Touche d’abord une case vide'); return; }

    if (courant.solution[selection.ligne][selection.colonne] !== valeur) {
      erreurs++;
      audio.son('presque');
      anim.nonNon(bouton);
      anim.nonNon(selection.element);
      retour.echec(conteneur, 'Pas celui-là !');
      return;
    }

    selection.element.textContent = SYMBOLES[valeur];
    selection.element.style.outlineColor = 'transparent';
    selection.element.style.color = 'var(--u-vert-ok)';
    selection.vide = false;
    courant.grille[selection.ligne][selection.colonne] = valeur;
    selection = null;

    reussites++;
    restantes--;
    audio.son('juste');

    if (restantes === 0) grilleFinie();
  }

  function grilleFinie() {
    retour.reussite(conteneur, 'Grille complète !');
    audio.son('recompense');
    attendre(() => {
      if (fini) return;
      // Point de rupture : grille terminée.
      if (minuterie.doitFinir()) { terminer(); return; }
      courant = generer(niveauCourant());
      installer();
    }, 1500);
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
