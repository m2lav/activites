/* =========================================================================
   Tangram — recomposer une figure en y glissant ses morceaux.

   Les pièces ne sont pas les sept du tangram classique : elles sont
   **découpées à la volée** dans la figure, ce qui donne un puzzle différent
   à chaque fois et une difficulté réglable de trois à sept pièces. Le geste
   et le raisonnement sont les mêmes — reconnaître une forme, trouver sa
   place, l'y amener.

   Aucune rotation à ce stade : les pièces sont présentées dans le bon sens.
   Faire tourner une pièce au doigt est un geste difficile avant sept ans, et
   l'ajouter avant que le reste soit solide ferait trébucher tout le monde.

   Le découpage se fait par croissance de régions à partir de graines, ce qui
   garantit que chaque pièce est d'un seul tenant — jamais de morceau en deux
   parties, qui serait impossible à saisir.
   ========================================================================= */

import { el, svg } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as retour from '../ui/retour.js';
import { creerMinuterie } from './minuterie.js';
import { rendreDeplacable, cibleLaPlusProche } from '../ui/glisser.js';

export const meta = {
  id: 'tangram',
  nom: 'Le tangram',
  type: 'logique',
  categorie: 'detente',
  ages: [4, 12],
  duree: 85,
  consigne: 'Remets chaque morceau à sa place.'
};

/** [côté de la grille, nombre de pièces] par niveau. */
const PALIERS = [
  [3, 3], [3, 3], [4, 4], [4, 4], [4, 5],
  [4, 5], [5, 6], [5, 6], [5, 7], [5, 7]
];

const COULEURS = [
  'var(--u-primaire)', 'var(--u-secondaire)', 'var(--u-accent)',
  'color-mix(in srgb, var(--u-primaire) 55%, var(--u-texte))',
  'color-mix(in srgb, var(--u-secondaire) 55%, var(--u-texte))',
  'color-mix(in srgb, var(--u-accent) 60%, var(--u-texte))',
  'color-mix(in srgb, var(--u-primaire) 40%, var(--u-secondaire))'
];

const VOISINS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function apercu(niveau) {
  const [cote, pieces] = PALIERS[Math.min(10, Math.max(1, Math.round(niveau))) - 1];
  return `${pieces} pièces sur ${cote} × ${cote}`;
}

/** Découpe un carré cote × cote en `nombre` régions d'un seul tenant. */
function decouper(cote, nombre) {
  const cases = [];
  for (let y = 0; y < cote; y++) for (let x = 0; x < cote; x++) cases.push({ x, y });

  const attribue = new Map();
  const regions = Array.from({ length: nombre }, () => []);

  const melange = [...cases].sort(() => Math.random() - 0.5);
  for (let i = 0; i < nombre; i++) {
    const c = melange[i];
    attribue.set(`${c.x},${c.y}`, i);
    regions[i].push(c);
  }

  let restants = cases.length - nombre;
  while (restants > 0) {
    const ordre = [...regions.keys()].sort(() => Math.random() - 0.5);
    let agrandi = false;

    for (const i of ordre) {
      const candidats = [];
      for (const c of regions[i]) {
        for (const [dx, dy] of VOISINS) {
          const nx = c.x + dx, ny = c.y + dy;
          if (nx < 0 || ny < 0 || nx >= cote || ny >= cote) continue;
          if (attribue.has(`${nx},${ny}`)) continue;
          candidats.push({ x: nx, y: ny });
        }
      }
      if (!candidats.length) continue;

      const c = candidats[Math.floor(Math.random() * candidats.length)];
      attribue.set(`${c.x},${c.y}`, i);
      regions[i].push(c);
      restants--;
      agrandi = true;
      break;
    }
    if (!agrandi) break;   // sécurité : plus rien ne peut grandir
  }

  return regions.filter((r) => r.length).map((cells) => {
    const minX = Math.min(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y));
    return {
      origine: { x: minX, y: minY },
      largeur: Math.max(...cells.map((c) => c.x)) - minX + 1,
      hauteur: Math.max(...cells.map((c) => c.y)) - minY + 1,
      cases: cells.map((c) => ({ x: c.x - minX, y: c.y - minY }))
    };
  });
}

export function generer(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  const [cote, nombre] = PALIERS[n - 1];
  return { niveau: n, cote, pieces: decouper(cote, nombre) };
}

/** Dessine une pièce : ses cases, légèrement détachées, d'une seule couleur. */
function dessinerPiece(piece, cote, { couleur, creux = false }) {
  const rects = piece.cases.map((c) =>
    `<rect x="${c.x * 10 + 0.6}" y="${c.y * 10 + 0.6}" width="8.8" height="8.8" rx="1.6"
       fill="${creux ? 'none' : couleur}"
       stroke="${creux ? 'currentColor' : 'none'}" stroke-width="0.9"
       stroke-dasharray="${creux ? '2.5 2' : '0'}"/>`).join('');

  return svg(
    `<svg viewBox="0 0 ${piece.largeur * 10} ${piece.hauteur * 10}"
       width="${piece.largeur * cote}" height="${piece.hauteur * cote}"
       style="display:block">${rects}</svg>`
  );
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let courant = exercice;
  let reussites = 0;
  let erreurs = 0;
  let posees = 0;
  let fini = false;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const figure = el('div', {
    style: {
      position: 'relative', margin: '0 auto',
      color: 'var(--u-texte-doux)',
      borderRadius: '10px',
      background: 'color-mix(in srgb, var(--u-carte) 35%, transparent)'
    }
  });

  const reserve = el('div', {
    style: {
      display: 'flex', gap: 'clamp(8px, 1.8vw, 20px)', justifyContent: 'center',
      flexWrap: 'wrap', alignItems: 'center'
    }
  });

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      gap: 'clamp(14px, 4vh, 40px)', position: 'relative'
    }
  }, figure, reserve));

  function installer() {
    // La figure et la réserve doivent tenir côte à côte en hauteur.
    const dispoH = (conteneur.clientHeight || 420) - 60;
    const dispoL = (conteneur.clientWidth || 700) - 40;
    const cote = Math.max(26, Math.min(
      Math.floor((dispoH * 0.52) / courant.cote),
      Math.floor(dispoL / (courant.cote + 2)),
      74
    ));

    figure.style.width = `${courant.cote * cote}px`;
    figure.style.height = `${courant.cote * cote}px`;
    figure.replaceChildren();

    const cibles = courant.pieces.map((piece, i) => {
      const creux = el('div', {
        style: {
          position: 'absolute',
          left: `${piece.origine.x * cote}px`,
          top: `${piece.origine.y * cote}px`,
          transition: 'background-color .2s ease', borderRadius: '8px'
        }
      }, dessinerPiece(piece, cote, { creux: true }));
      figure.appendChild(creux);
      return { element: creux, index: i, prise: false };
    });

    // Les pièces arrivent dans un ordre indépendant de la figure.
    const ordre = courant.pieces.map((p, i) => i).sort(() => Math.random() - 0.5);

    reserve.replaceChildren(...ordre.map((i) => {
      const piece = courant.pieces[i];
      const vue = el('div', {
        style: { position: 'relative', willChange: 'transform', lineHeight: '0' }
      }, dessinerPiece(piece, cote, { couleur: COULEURS[i % COULEURS.length] }));

      const prise = rendreDeplacable(vue, {
        surPrise: () => audio.son('tap'),
        surDepot(centre) {
          const cible = cibleLaPlusProche(centre, cibles, cote);
          if (!cible || cible.index !== i) {
            erreurs++;
            audio.son('presque');
            retour.echec(conteneur, 'Pas ici !');
            return false;
          }

          const rc = cible.element.getBoundingClientRect();
          const rp = vue.getBoundingClientRect();
          const p = prise.position();
          prise.poser(p.x + (rc.left - rp.left), p.y + (rc.top - rp.top));
          prise.verrouiller();
          cible.prise = true;

          reussites++;
          posees++;
          audio.son('juste');
          anim.recompense(cible.element);

          if (posees === courant.pieces.length) figureFinie();
          return true;
        }
      });

      return vue;
    }));

    anim.cascade(reserve.children, { decalage: 55, depart: 80 });
  }

  function figureFinie() {
    retour.reussite(conteneur, 'Figure complète !');
    audio.son('recompense');
    attendre(() => {
      if (fini) return;
      // Point de rupture : la figure est finie, on peut conclure proprement.
      if (minuterie.doitFinir()) { terminer(); return; }
      courant = generer(niveauCourant());
      posees = 0;
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
    window.removeEventListener('resize', surRedimension);
    ctx.surFin({ reussites, erreurs });
  }

  const surRedimension = () => { if (!fini && posees === 0) installer(); };
  window.addEventListener('resize', surRedimension);

  installer();

  return function demonter() {
    fini = true;
    minuterie.arreter();
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
    window.removeEventListener('resize', surRedimension);
  };
}
