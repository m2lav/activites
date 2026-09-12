/* =========================================================================
   Mémoire — jeu de paires.

   Calé sur le brief : 4 paires au niveau 2, 8 au niveau 5, 12 au niveau 9.

   Les symboles sont des emoji, pas des images : ils sont dans la police du
   système, donc nets à toutes les tailles, disponibles hors ligne, et sans
   un octet à télécharger. Ils seront remplacés par les sprites définitifs
   des univers au lot 5, sans toucher à la mécanique.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';

export const meta = {
  id: 'memoire',
  nom: 'Les paires',
  type: 'memoire',
  categorie: 'effort',
  ages: [3, 12],
  duree: 90
};

const PAIRES = [3, 4, 5, 6, 8, 9, 10, 11, 12, 12];

const SYMBOLES = [
  '🦊', '🐢', '🦉', '🐝', '🐙', '🦋', '🐳', '🦔',
  '🌻', '🍄', '⭐', '🌙', '🚂', '⛵', '🎈', '🪁',
  '🍎', '🥕', '🐞', '🦕'
];

export function apercu(niveau) {
  const p = PAIRES[Math.min(10, Math.max(1, Math.round(niveau))) - 1];
  return `${p} paires`;
}

export function generer(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  const nombre = PAIRES[n - 1];

  const tirage = [...SYMBOLES].sort(() => Math.random() - 0.5).slice(0, nombre);
  const cartes = [...tirage, ...tirage]
    .map((symbole, i) => ({ symbole, id: i }))
    .sort(() => Math.random() - 0.5);

  return { niveau: n, nombre, cartes };
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let courant = exercice;
  let trouvees = 0;
  let erreurs = 0;
  let totalTrouvees = 0;
  let fini = false;
  let bloque = false;
  let retournees = [];

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const plateau = el('div', {
    style: {
      display: 'grid', gap: 'clamp(6px, 1.2vw, 12px)',
      margin: 'auto', justifyContent: 'center', alignContent: 'center'
    }
  });

  const compteur = el('div', {
    style: {
      textAlign: 'center', fontFamily: 'var(--u-police-titre)', fontWeight: '800',
      fontSize: 'clamp(18px, 2.6vw, 26px)', color: 'var(--u-secondaire)', minHeight: '1.3em'
    }
  }, '');

  conteneur.append(compteur, el('div', {
    style: { flex: '1', minHeight: '0', display: 'flex' }
  }, plateau));

  function disposer() {
    const total = courant.cartes.length;

    // On cherche la disposition qui ne laisse pas de ligne orpheline : une
    // grille pleine se mémorise spatialement, une grille ébréchée non.
    // Léger biais vers la largeur, l'iPad étant tenu en paysage.
    const ideal = Math.sqrt(total * 1.6);
    let colonnes = 4;
    let meilleur = Infinity;
    for (let c = 3; c <= 8; c++) {
      const vides = Math.ceil(total / c) * c - total;
      const score = vides * 2 + Math.abs(c - ideal);
      if (score < meilleur) { meilleur = score; colonnes = c; }
    }
    const lignes = Math.ceil(total / colonnes);

    const dispoL = (conteneur.clientWidth || 600) - 20;
    const dispoH = (conteneur.clientHeight || 400) - 70;
    const cote = Math.max(46, Math.min(
      Math.floor(dispoL / colonnes) - 10,
      Math.floor(dispoH / lignes) - 10,
      118
    ));

    plateau.style.gridTemplateColumns = `repeat(${colonnes}, ${cote}px)`;
    plateau.replaceChildren();

    for (const carte of courant.cartes) {
      const face = el('div', {
        style: {
          position: 'absolute', inset: '0', display: 'grid', placeItems: 'center',
          fontSize: `${Math.round(cote * 0.55)}px`,
          borderRadius: '14px', backfaceVisibility: 'hidden',
          background: 'color-mix(in srgb, var(--u-carte) 85%, transparent)',
          transform: 'rotateY(180deg)'
        }
      }, carte.symbole);

      const dos = el('div', {
        style: {
          position: 'absolute', inset: '0', display: 'grid', placeItems: 'center',
          borderRadius: '14px', backfaceVisibility: 'hidden',
          background: 'var(--u-primaire)',
          border: '2px solid color-mix(in srgb, var(--u-texte) 16%, transparent)',
          fontSize: `${Math.round(cote * 0.34)}px`, color: 'rgba(255,255,255,.55)'
        }
      }, '?');

      const interieur = el('div', {
        style: {
          position: 'absolute', inset: '0', transformStyle: 'preserve-3d',
          transition: 'transform .42s cubic-bezier(.22,.9,.28,1)'
        }
      }, dos, face);

      const carteEl = el('button', {
        type: 'button',
        'aria-label': 'carte',
        style: {
          position: 'relative', width: `${cote}px`, height: `${cote}px`,
          padding: '0', border: 'none', background: 'transparent',
          cursor: 'pointer', perspective: '700px'
        }
      }, interieur);

      carte.el = carteEl;
      carte.interieur = interieur;
      carte.retournee = false;
      carte.gagnee = false;

      carteEl.addEventListener('pointerdown', () => retourner(carte));
      plateau.appendChild(carteEl);
    }
  }

  function montrer(carte, visible) {
    carte.retournee = visible;
    carte.interieur.style.transform = visible ? 'rotateY(180deg)' : 'rotateY(0deg)';
  }

  function retourner(carte) {
    if (fini || bloque || carte.retournee || carte.gagnee) return;

    audio.son('tap');
    montrer(carte, true);
    retournees.push(carte);
    if (retournees.length < 2) return;

    const [a, b] = retournees;
    bloque = true;

    if (a.symbole === b.symbole) {
      a.gagnee = b.gagnee = true;
      trouvees++;
      totalTrouvees++;
      compteur.textContent = `${trouvees} / ${courant.nombre}`;
      audio.son('juste');
      anim.recompense(b.el);
      for (const c of [a, b]) c.el.style.opacity = '.55';
      retournees = [];
      bloque = false;
      if (trouvees === courant.nombre) rejouer();
      return;
    }

    erreurs++;
    audio.son('presque');
    // On laisse le temps de regarder avant de refermer : sans cette pause,
    // le jeu devient un test de réflexe au lieu d'un test de mémoire.
    attendre(() => {
      for (const c of retournees) montrer(c, false);
      retournees = [];
      bloque = false;
    }, 1100);
  }

  function rejouer() {
    audio.son('recompense');
    attendre(() => {
      if (fini) return;
      courant = generer(niveauCourant());
      trouvees = 0;
      retournees = [];
      bloque = false;
      compteur.textContent = `0 / ${courant.nombre}`;
      disposer();
      anim.cascade(plateau.children, { decalage: 25, depart: 0 });
    }, 1300);
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
    ctx.surFin({ reussites: totalTrouvees, erreurs });
  }

  requestAnimationFrame(() => {
    disposer();
    compteur.textContent = `0 / ${courant.nombre}`;
    anim.cascade(plateau.children, { decalage: 25, depart: 60 });
  });

  const surRedimension = () => { if (!fini) disposer(); };
  window.addEventListener('resize', surRedimension);

  return function demonter() {
    fini = true;
    clearInterval(battement);
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
    window.removeEventListener('resize', surRedimension);
  };
}
