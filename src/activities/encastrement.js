/* =========================================================================
   Encastrement — Montessori, pour Térence.

   Des formes géométriques à faire glisser dans le creux qui leur correspond.
   C'est le geste du plateau d'encastrement en bois, transposé au doigt : on
   voit le trou, on amène la pièce, elle s'emboîte.

   Autocorrection complète : une pièce posée dans le mauvais creux revient à
   sa place toute seule. Rien ne se bloque, rien ne se perd, et l'enfant
   recommence sans qu'on lui ait rien dit.

   Les formes sont des polygones dessinés en SVG — le brief réserve le dessin
   maison à ce registre géométrique, et c'est exactement le cas ici.
   ========================================================================= */

import { el, svg } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as retour from '../ui/retour.js';
import { creerMinuterie } from './minuterie.js';
import { rendreDeplacable, cibleLaPlusProche } from '../ui/glisser.js';

export const meta = {
  id: 'encastrement',
  nom: 'Les formes',
  type: 'logique',
  categorie: 'detente',
  ages: [3, 7],
  duree: 70,
  consigne: 'Pose chaque forme dans son trou.'
};

/* Chaque forme est décrite par ses points dans un carré de 100 × 100. */
const FORMES = {
  cercle:    null,                                             // cas particulier
  carre:     '8,8 92,8 92,92 8,92',
  triangle:  '50,6 94,92 6,92',
  losange:   '50,4 96,50 50,96 4,50',
  etoile:    '50,4 61,38 97,38 68,59 79,94 50,72 21,94 32,59 3,38 39,38',
  hexagone:  '50,4 92,27 92,73 50,96 8,73 8,27',
  croix:     '35,6 65,6 65,35 94,35 94,65 65,65 65,94 35,94 35,65 6,65 6,35 35,35',
  pentagone: '50,4 96,38 78,92 22,92 4,38'
};

/*
   Rangées par difficulté de discrimination : au début des formes qui n'ont
   rien à voir, ensuite des formes qui se ressemblent (hexagone / pentagone).
*/
const PALIERS = [
  ['cercle', 'carre'],
  ['cercle', 'carre', 'triangle'],
  ['cercle', 'carre', 'triangle', 'etoile'],
  ['cercle', 'carre', 'triangle', 'etoile', 'losange'],
  ['carre', 'triangle', 'losange', 'etoile', 'croix', 'hexagone'],
  ['triangle', 'losange', 'hexagone', 'pentagone', 'etoile', 'croix']
];

const COULEURS = ['var(--u-primaire)', 'var(--u-secondaire)', 'var(--u-accent)'];

export function apercu(niveau) {
  return `${jeuDeFormes(niveau).length} formes`;
}

function jeuDeFormes(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  return PALIERS[Math.min(PALIERS.length - 1, Math.floor((n - 1) / 2))];
}

export function generer(niveau) {
  const formes = [...jeuDeFormes(niveau)].sort(() => Math.random() - 0.5);
  return { niveau: Math.min(10, Math.max(1, Math.round(niveau))), formes };
}

/** Dessine une forme : silhouette pleine, ou creux en pointillés. */
function dessiner(nom, { creux = false, couleur = 'var(--u-primaire)', taille = 96 } = {}) {
  const corps = nom === 'cercle'
    ? `<circle cx="50" cy="50" r="46"
         fill="${creux ? 'none' : couleur}"
         stroke="${creux ? 'currentColor' : 'none'}"
         stroke-width="4" stroke-dasharray="${creux ? '7 6' : '0'}"/>`
    : `<polygon points="${FORMES[nom]}"
         fill="${creux ? 'none' : couleur}"
         stroke="${creux ? 'currentColor' : 'none'}"
         stroke-width="4" stroke-dasharray="${creux ? '7 6' : '0'}"/>`;

  return svg(`<svg viewBox="0 0 100 100" width="${taille}" height="${taille}">${corps}</svg>`);
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let courant = exercice;
  let reussites = 0;
  let erreurs = 0;
  let places = 0;
  let fini = false;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const plateau = el('div', {
    style: {
      display: 'flex', gap: 'clamp(10px, 2.4vw, 28px)', justifyContent: 'center',
      flexWrap: 'wrap', alignItems: 'center', minHeight: 'clamp(110px, 20vh, 170px)',
      color: 'var(--u-texte-doux)'
    }
  });

  const reserve = el('div', {
    style: {
      display: 'flex', gap: 'clamp(10px, 2.4vw, 28px)', justifyContent: 'center',
      flexWrap: 'wrap', alignItems: 'center', minHeight: 'clamp(110px, 20vh, 170px)'
    }
  });

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 'clamp(16px, 5vh, 50px)', position: 'relative'
    }
  }, plateau, reserve));

  function installer() {
    const taille = courant.formes.length > 4 ? 84 : 104;
    const cibles = [];

    // Les creux, dans un ordre différent des pièces : sinon il suffit de
    // poser de gauche à droite sans regarder.
    const ordreCreux = [...courant.formes].sort(() => Math.random() - 0.5);

    plateau.replaceChildren(...ordreCreux.map((nom) => {
      const creux = el('div', {
        style: {
          display: 'grid', placeItems: 'center', borderRadius: '14px',
          padding: '6px', transition: 'background-color .2s ease'
        },
        dataset: { forme: nom }
      }, dessiner(nom, { creux: true, taille }));
      cibles.push({ element: creux, forme: nom, prise: false });
      return creux;
    }));

    reserve.replaceChildren(...courant.formes.map((nom, i) => {
      const piece = el('div', {
        style: {
          display: 'grid', placeItems: 'center', padding: '6px',
          position: 'relative', willChange: 'transform'
        },
        dataset: { forme: nom }
      }, dessiner(nom, { couleur: COULEURS[i % COULEURS.length], taille }));

      const prise = rendreDeplacable(piece, {
        surPrise: () => audio.son('tap'),
        surDepot(centre) {
          const cible = cibleLaPlusProche(centre, cibles);
          if (!cible || cible.forme !== nom) {
            erreurs++;
            audio.son('presque');
            retour.echec(conteneur, 'Pas ce trou-là !');
            return false;   // la pièce revient toute seule
          }

          // Emboîtement : la pièce prend exactement la place du creux.
          const rc = cible.element.getBoundingClientRect();
          const rp = piece.getBoundingClientRect();
          const p = prise.position();
          prise.poser(p.x + (rc.left - rp.left), p.y + (rc.top - rp.top));
          prise.verrouiller();
          cible.prise = true;
          cible.element.style.background = 'color-mix(in srgb, var(--u-vert-ok) 20%, transparent)';

          reussites++;
          places++;
          audio.son('juste');
          anim.recompense(cible.element);

          if (places === courant.formes.length) termineFigure();
          return true;
        }
      });

      return piece;
    }));

    anim.cascade([...plateau.children, ...reserve.children], { decalage: 60, depart: 60 });
  }

  function termineFigure() {
    retour.reussite(conteneur, 'Tout encastré !');
    audio.son('recompense');
    attendre(() => {
      if (fini) return;
      // Point de rupture : la figure est complète, on peut conclure.
      if (minuterie.doitFinir()) { terminer(); return; }
      courant = generer(niveauCourant());
      places = 0;
      installer();
    }, 1400);
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
