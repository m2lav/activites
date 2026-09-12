/* =========================================================================
   Suites et intrus — logique.

   Deux familles d'exercices, choisies selon le niveau :
   - la suite à compléter (« et après ? »)
   - l'intrus (« lequel ne va pas avec les autres ? »)

   Les formes sont des figures géométriques dessinées en CSS, pas des
   illustrations : le brief réserve explicitement le dessin maison à ce
   registre, et une suite logique n'a besoin de rien d'autre.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';

export const meta = {
  id: 'suites',
  nom: 'Suites logiques',
  type: 'logique',
  categorie: 'effort',
  ages: [4, 12],
  duree: 80
};

const FORMES = ['cercle', 'carre', 'triangle'];
const COULEURS = ['var(--u-primaire)', 'var(--u-secondaire)', 'var(--u-accent)'];

const hasard = (n) => Math.floor(Math.random() * n);
const piocher = (l) => l[hasard(l.length)];

export function apercu(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  if (n <= 3) return 'formes qui se répètent';
  if (n <= 6) return 'formes + nombres simples';
  return 'nombres, multiples et intrus';
}

export function generer(niveau) {
  return { niveau: Math.min(10, Math.max(1, Math.round(niveau))) };
}

/* ---- Fabrication d'une question ---------------------------------------- */

function forme(f, couleur, taille) {
  const base = {
    width: `${taille}px`, height: `${taille}px`,
    background: couleur, flex: '0 0 auto'
  };
  if (f === 'cercle') base.borderRadius = '50%';
  if (f === 'carre') base.borderRadius = '14%';
  if (f === 'triangle') base.clipPath = 'polygon(50% 0%, 100% 100%, 0% 100%)';
  return el('div', { style: base });
}

/** Suite de formes à motif répétitif : A B A B ?, ou A A B A A ? */
function suiteFormes(niveau) {
  const periode = niveau <= 2 ? 2 : piocher([2, 2, 3]);

  // Les éléments du motif doivent être distincts deux à deux, sinon la
  // « suite » est une répétition du même élément et il n'y a rien à trouver.
  const motif = [];
  while (motif.length < periode) {
    const item = { f: piocher(FORMES), c: piocher(COULEURS) };
    if (motif.some((m) => m.f === item.f && m.c === item.c)) continue;
    motif.push(item);
  }

  const longueur = niveau <= 2 ? 4 : 5;
  const serie = Array.from({ length: longueur }, (_, i) => motif[i % periode]);
  const solution = motif[longueur % periode];

  const leurres = [];
  while (leurres.length < 2) {
    const l = { f: piocher(FORMES), c: piocher(COULEURS) };
    if (l.f === solution.f && l.c === solution.c) continue;
    if (leurres.some((x) => x.f === l.f && x.c === l.c)) continue;
    leurres.push(l);
  }

  return {
    genre: 'formes',
    consigne: 'Et après ?',
    serie,
    options: [solution, ...leurres].sort(() => Math.random() - 0.5),
    solution
  };
}

/** Suite de nombres : + d, ou × r pour les niveaux élevés. */
function suiteNombres(niveau) {
  const multiplicative = niveau >= 8 && Math.random() < 0.35;
  const depart = 1 + hasard(niveau <= 5 ? 5 : 12);
  const pas = multiplicative ? piocher([2, 3]) : 1 + hasard(niveau <= 5 ? 2 : 5);

  const serie = [];
  let v = depart;
  for (let i = 0; i < 4; i++) { serie.push(v); v = multiplicative ? v * pas : v + pas; }
  const solution = v;

  const leurres = new Set();
  while (leurres.size < 2) {
    const delta = piocher([-pas, pas, 1, -1, 2]);
    const l = solution + delta;
    if (l !== solution && l > 0) leurres.add(l);
  }

  return {
    genre: 'nombres',
    consigne: 'Quel nombre vient après ?',
    serie,
    options: [solution, ...leurres].sort(() => Math.random() - 0.5),
    solution
  };
}

/**
 * Intrus : trois figures identiques, la quatrième diffère par UNE seule
 * propriété — la forme ou la couleur, jamais les deux, et jamais avec des
 * variations parasites sur l'autre propriété. Sans cette contrainte on
 * fabrique des questions à deux réponses défendables, ce qui n'apprend rien
 * et donne juste tort à un enfant qui a bien raisonné.
 */
function intrus(niveau) {
  const surLaForme = Math.random() < 0.5;
  const f = piocher(FORMES);
  const c = piocher(COULEURS);

  const communs = Array.from({ length: 3 }, () => ({ f, c }));
  const different = surLaForme
    ? { f: piocher(FORMES.filter((x) => x !== f)), c }
    : { f, c: piocher(COULEURS.filter((x) => x !== c)) };

  const options = [...communs, different].sort(() => Math.random() - 0.5);

  return {
    genre: 'intrus',
    consigne: 'Lequel ne va pas avec les autres ?',
    serie: null,
    options,
    solution: different
  };
}

function question(niveau) {
  if (niveau <= 3) return suiteFormes(niveau);
  if (niveau <= 6) return Math.random() < 0.55 ? suiteFormes(niveau) : suiteNombres(niveau);
  return Math.random() < 0.4 ? intrus(niveau) : suiteNombres(niveau);
}

/* ---- Montage ----------------------------------------------------------- */

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let reussites = 0;
  let erreurs = 0;
  let fini = false;
  let q = null;
  let essais = 0;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const consigne = el('div', {
    style: {
      textAlign: 'center', fontFamily: 'var(--u-police-titre)', fontWeight: '700',
      fontSize: 'clamp(19px, 2.6vw, 28px)'
    }
  });

  const serieEl = el('div', {
    style: {
      display: 'flex', gap: 'clamp(8px, 1.6vw, 18px)', justifyContent: 'center',
      alignItems: 'center', flexWrap: 'wrap', minHeight: '76px'
    }
  });

  const optionsEl = el('div', {
    style: {
      display: 'flex', gap: 'clamp(10px, 2vw, 22px)', justifyContent: 'center',
      alignItems: 'center', flexWrap: 'wrap'
    }
  });

  const message = el('div', {
    style: { textAlign: 'center', minHeight: '24px', color: 'var(--u-texte-doux)', fontSize: '16px' }
  });

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 'clamp(12px, 2.4vh, 26px)'
    }
  }, consigne, serieEl, message, optionsEl));

  const TAILLE = 56;

  function pastille(contenu, surChoix) {
    const b = el('button', {
      type: 'button',
      class: 'carte',
      style: {
        padding: '14px', minWidth: '86px', minHeight: '86px',
        display: 'grid', placeItems: 'center', cursor: 'pointer',
        font: 'inherit', color: 'inherit'
      }
    }, contenu);
    b.addEventListener('pointerdown', () => surChoix(b));
    return b;
  }

  function rendreItem(item, taille = TAILLE) {
    return typeof item === 'number'
      ? el('span', {
        style: {
          fontFamily: 'var(--u-police-titre)', fontWeight: '800',
          fontSize: `${Math.round(taille * 0.8)}px`
        }
      }, String(item))
      : forme(item.f, item.c, taille);
  }

  function memeItem(a, b) {
    if (typeof a === 'number' || typeof b === 'number') return a === b;
    return a.f === b.f && a.c === b.c;
  }

  function nouvelle() {
    if (fini) return;
    q = question(niveauCourant());
    essais = 0;
    message.textContent = '';
    consigne.textContent = q.consigne;

    serieEl.replaceChildren();
    if (q.serie) {
      for (const item of q.serie) serieEl.appendChild(rendreItem(item));
      serieEl.appendChild(el('div', {
        style: {
          width: `${TAILLE}px`, height: `${TAILLE}px`, display: 'grid', placeItems: 'center',
          border: '3px dashed color-mix(in srgb, var(--u-texte) 30%, transparent)',
          borderRadius: '14%', fontSize: `${Math.round(TAILLE * 0.6)}px`,
          color: 'var(--u-texte-doux)'
        }
      }, '?'));
    }

    optionsEl.replaceChildren(...q.options.map((opt) =>
      pastille(rendreItem(opt), (b) => choisir(opt, b))));

    anim.cascade([...serieEl.children, ...optionsEl.children], { decalage: 45, depart: 0 });
  }

  function choisir(opt, bouton) {
    if (fini || !q) return;

    if (memeItem(opt, q.solution)) {
      reussites++;
      audio.son('juste');
      anim.recompense(bouton);
      message.textContent = '';
      attendre(nouvelle, 800);
      return;
    }

    essais++;
    audio.son('presque');
    anim.nonNon(bouton);

    if (essais === 1) {
      message.textContent = 'Regarde encore.';
    } else {
      erreurs++;
      message.textContent = 'On regarde ensemble.';
      // Autocorrection : la bonne réponse se signale d'elle-même.
      const bon = [...optionsEl.children][q.options.findIndex((o) => memeItem(o, q.solution))];
      if (bon) {
        bon.style.borderColor = 'var(--u-secondaire)';
        anim.recompense(bon);
      }
      attendre(nouvelle, 1800);
    }
  }

  // La durée est fixée par la séance, pas par l'activité (mode test = raccourci).
  const DUREE = ctx.duree ?? meta.duree * 1000;
  const debut = Date.now();
  const battement = setInterval(() => {
    if (fini) return;
    if (Date.now() - debut >= DUREE) terminer();
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
