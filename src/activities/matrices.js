/* =========================================================================
   Les matrices — la case manquante.

   Une grille où chaque attribut obéit à une règle de position : la forme
   change en colonne, la couleur en ligne. Une case est vide, il faut la
   déduire en croisant les deux règles.

   C'est le seul exercice du catalogue qui demande de combiner deux
   raisonnements à la fois, et c'est pour cela qu'il monte très haut : on
   ajoute un troisième attribut (la taille) aux niveaux élevés.

   Rien à lire, rien à calculer — ce qui le rend jouable bien avant que la
   lecture soit acquise.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as retour from '../ui/retour.js';
import { creerMinuterie } from './minuterie.js';

export const meta = {
  id: 'matrices',
  nom: 'La case manquante',
  type: 'logique',
  categorie: 'effort',
  ages: [5, 12],
  duree: 85,
  consigne: 'Trouve ce qui manque dans la case vide.'
};

const FORMES = ['cercle', 'carre', 'triangle'];
const COULEURS = ['var(--u-primaire)', 'var(--u-secondaire)', 'var(--u-accent)'];
const TAILLES = [0.62, 0.82, 1];

const piocher = (l) => l[Math.floor(Math.random() * l.length)];

export function apercu(niveau) {
  const { cote, taillesVariables } = reglage(niveau);
  return `${cote} × ${cote}${taillesVariables ? ' + tailles' : ''}`;
}

function reglage(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  return {
    cote: n <= 3 ? 2 : 3,
    taillesVariables: n >= 7
  };
}

/**
 * Chaque attribut est piloté par la ligne OU par la colonne, jamais par les
 * deux : c'est ce qui rend la règle trouvable.
 */
function construire(niveau) {
  const { cote, taillesVariables } = reglage(niveau);

  const formes = [...FORMES].sort(() => Math.random() - 0.5).slice(0, cote);
  const couleurs = [...COULEURS].sort(() => Math.random() - 0.5).slice(0, cote);
  const tailles = [...TAILLES].sort(() => Math.random() - 0.5).slice(0, cote);

  // On tire au sort quel attribut suit les colonnes et lequel suit les lignes.
  const formeParColonne = Math.random() < 0.5;

  const cellule = (ligne, colonne) => ({
    f: formes[formeParColonne ? colonne : ligne],
    c: couleurs[formeParColonne ? ligne : colonne],
    t: taillesVariables ? tailles[(ligne + colonne) % cote] : 1
  });

  const grille = [];
  for (let l = 0; l < cote; l++) {
    const rangee = [];
    for (let c = 0; c < cote; c++) rangee.push(cellule(l, c));
    grille.push(rangee);
  }

  // La case manquante n'est pas toujours la dernière : sinon on la devine
  // par simple continuation, sans croiser les deux règles.
  const ligneVide = Math.floor(Math.random() * cote);
  const colonneVide = Math.floor(Math.random() * cote);
  const solution = grille[ligneVide][colonneVide];

  const memes = (a, b) => a.f === b.f && a.c === b.c && a.t === b.t;

  const options = [solution];
  const leurres = [
    { ...solution, f: piocher(formes.filter((f) => f !== solution.f)) || solution.f },
    { ...solution, c: piocher(couleurs.filter((c) => c !== solution.c)) || solution.c },
    { f: piocher(formes), c: piocher(couleurs), t: solution.t }
  ];
  for (const l of leurres) {
    if (options.length >= 4) break;
    if (!options.some((o) => memes(o, l))) options.push(l);
  }

  return {
    cote, grille, ligneVide, colonneVide, solution,
    options: options.sort(() => Math.random() - 0.5),
    memes
  };
}

export function generer(niveau) {
  return { niveau: Math.min(10, Math.max(1, Math.round(niveau))) };
}

function dessiner(cellule, base) {
  const taille = Math.round(base * cellule.t);
  const style = {
    width: `${taille}px`, height: `${taille}px`,
    background: cellule.c, flex: '0 0 auto'
  };
  if (cellule.f === 'cercle') style.borderRadius = '50%';
  if (cellule.f === 'carre') style.borderRadius = '14%';
  if (cellule.f === 'triangle') style.clipPath = 'polygon(50% 0%, 100% 100%, 0% 100%)';
  return el('div', { style });
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let reussites = 0;
  let erreurs = 0;
  let fini = false;
  let essais = 0;
  let q = null;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const grilleEl = el('div', {
    style: {
      display: 'grid', gap: 'clamp(6px, 1.2vw, 14px)', margin: '0 auto',
      justifyContent: 'center'
    }
  });

  const optionsEl = el('div', {
    style: {
      display: 'flex', gap: 'clamp(10px, 2vw, 22px)', justifyContent: 'center',
      flexWrap: 'wrap'
    }
  });

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      gap: 'clamp(16px, 4vh, 40px)', position: 'relative'
    }
  }, grilleEl, optionsEl));

  function nouvelle() {
    if (fini) return;
    // Point de rupture : jamais au milieu d'une matrice en cours.
    if (minuterie.doitFinir()) { terminer(); return; }

    q = construire(niveauCourant());
    essais = 0;

    const dispo = Math.min(
      (conteneur.clientHeight || 400) * 0.42,
      (conteneur.clientWidth || 600) * 0.52
    );
    const base = Math.max(30, Math.floor(dispo / q.cote) - 16);

    grilleEl.style.gridTemplateColumns = `repeat(${q.cote}, ${base + 18}px)`;
    grilleEl.replaceChildren();

    for (let l = 0; l < q.cote; l++) {
      for (let c = 0; c < q.cote; c++) {
        const vide = l === q.ligneVide && c === q.colonneVide;
        const cellule = el('div', {
          style: {
            width: `${base + 18}px`, height: `${base + 18}px`,
            display: 'grid', placeItems: 'center', borderRadius: '14px',
            background: 'color-mix(in srgb, var(--u-carte) 45%, transparent)',
            border: vide
              ? '3px dashed color-mix(in srgb, var(--u-texte) 34%, transparent)'
              : '3px solid transparent'
          }
        }, vide
          ? el('span', {
            style: { fontSize: `${Math.round(base * 0.6)}px`, color: 'var(--u-texte-doux)' }
          }, '?')
          : dessiner(q.grille[l][c], base));
        grilleEl.appendChild(cellule);
      }
    }

    optionsEl.replaceChildren(...q.options.map((opt) => {
      const b = el('button', {
        class: 'carte', type: 'button',
        style: {
          padding: '12px', minWidth: `${base + 26}px`, minHeight: `${base + 26}px`,
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          font: 'inherit', color: 'inherit'
        }
      }, dessiner(opt, base));
      b.addEventListener('pointerdown', () => choisir(opt, b));
      return b;
    }));

    anim.cascade([...grilleEl.children, ...optionsEl.children], { decalage: 35, depart: 0 });
  }

  function choisir(opt, bouton) {
    if (fini || !q) return;

    if (q.memes(opt, q.solution)) {
      reussites++;
      audio.son('juste');
      anim.recompense(bouton);
      retour.reussite(conteneur);
      attendre(nouvelle, 1000);
      return;
    }

    essais++;
    audio.son('presque');
    anim.nonNon(bouton);

    if (essais === 1) { retour.echec(conteneur, 'Regarde les lignes et les colonnes'); return; }

    erreurs++;
    const bon = [...optionsEl.children][q.options.findIndex((o) => q.memes(o, q.solution))];
    if (bon) { bon.style.borderColor = 'var(--u-vert-ok)'; anim.recompense(bon); }
    retour.reponseMontree(conteneur, 'La voilà !');
    attendre(nouvelle, 2200);
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

  nouvelle();

  return function demonter() {
    fini = true;
    minuterie.arreter();
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
  };
}
