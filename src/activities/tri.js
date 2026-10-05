/* =========================================================================
   Ranger et associer — Montessori, pour Térence.

   Deux exercices, aucun texte, consigne à la voix :
   - **Ranger par taille** : toucher les objets du plus petit au plus grand.
   - **Trouver l'ombre** : retrouver la silhouette qui correspond à l'objet.

   L'ombre est obtenue en éteignant la couleur de l'emoji (filtre CSS), pas
   avec une image séparée : la silhouette correspond donc toujours exactement
   à l'objet, ce qu'un jeu d'illustrations ne garantirait pas.

   Autocorrection : une mauvaise touche ne fait rien avancer, elle ne
   sanctionne pas. L'enfant réessaie jusqu'à ce que ça marche.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as retour from '../ui/retour.js';
import { creerMinuterie } from './minuterie.js';

export const meta = {
  id: 'tri',
  nom: 'Ranger et associer',
  type: 'logique',
  categorie: 'effort',
  ages: [3, 7],
  duree: 70,
  consigne: "Range du plus petit au plus grand."
};

const OBJETS = ['🍎', '🐞', '⭐', '🐟', '🌻', '🦕', '🚗', '🎈', '🐘', '🦋', '🍄', '⛵'];

const piocher = (l) => l[Math.floor(Math.random() * l.length)];

export function apercu(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  return `${2 + Math.min(4, Math.floor(n / 2))} éléments`;
}

export function generer(niveau) {
  return { niveau: Math.min(10, Math.max(1, Math.round(niveau))) };
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);
  const DUREE = ctx.duree ?? meta.duree * 1000;

  let reussites = 0;
  let erreurs = 0;
  let fini = false;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const haut = el('div', {
    style: {
      display: 'flex', gap: 'clamp(10px, 2vw, 22px)', justifyContent: 'center',
      alignItems: 'center', flexWrap: 'wrap', minHeight: 'clamp(90px, 16vh, 150px)'
    }
  });

  const bas = el('div', {
    style: {
      display: 'flex', gap: 'clamp(12px, 2.4vw, 26px)', justifyContent: 'center',
      alignItems: 'center', flexWrap: 'wrap'
    }
  });

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 'clamp(16px, 4vh, 40px)'
    }
  }, haut, bas));

  /* ---- Ranger par taille ---------------------------------------------- */

  function parTaille(niveau) {
    const combien = 2 + Math.min(4, Math.floor(niveau / 2));
    const objet = piocher(OBJETS);

    // Tailles distinctes et bien écartées : à 4 ans, deux objets presque
    // identiques ne se départagent pas.
    const tailles = Array.from({ length: combien }, (_, i) => 34 + i * 22)
      .sort(() => Math.random() - 0.5);

    const ordre = [...tailles].sort((a, b) => a - b);
    let attendu = 0;

    haut.replaceChildren();
    bas.replaceChildren(...tailles.map((t) => {
      /*
         L'objet choisi doit se VOIR. Baisser l'opacité ne suffit pas : à
         quatre ans, on ne sait pas si on a touché ou raté. On entoure donc
         l'objet d'un anneau vert et on affiche son rang — ce qui montre en
         même temps l'ordre qu'on est en train de construire.
      */
      const pastille = el('span', {
        style: {
          position: 'absolute', top: '-6px', right: '-6px',
          width: '26px', height: '26px', borderRadius: '50%',
          background: 'var(--u-vert-ok)', color: '#fff',
          display: 'none', placeItems: 'center',
          fontFamily: 'var(--u-police-titre)', fontWeight: '800', fontSize: '15px'
        }
      }, '');

      const b = el('button', {
        type: 'button',
        'aria-label': `taille ${t}`,
        style: {
          position: 'relative',
          border: '4px solid transparent', borderRadius: '50%',
          background: 'transparent', cursor: 'pointer',
          padding: '8px', fontSize: `${t}px`, lineHeight: '1',
          transition: 'border-color .18s ease, background-color .18s ease'
        }
      }, objet, pastille);

      b.addEventListener('pointerdown', () => {
        if (fini || b.disabled) return;
        if (t === ordre[attendu]) {
          attendu++;
          b.disabled = true;
          b.style.borderColor = 'var(--u-vert-ok)';
          b.style.background = 'color-mix(in srgb, var(--u-vert-ok) 18%, transparent)';
          pastille.textContent = String(attendu);
          pastille.style.display = 'grid';
          anim.recompense(pastille);
          audio.son('touche');
          if (attendu === ordre.length) gagne(bas);
        } else {
          erreurs++;
          audio.son('presque');
          anim.nonNon(b);
        }
      });
      return b;
    }));

    audio.parler('Touche du plus petit au plus grand.');
    anim.cascade(bas.children, { decalage: 80, depart: 0 });
  }

  /* ---- Trouver l'ombre ------------------------------------------------- */

  function ombre(niveau) {
    const combien = Math.min(4, 2 + Math.floor(niveau / 3));
    const choisis = [...OBJETS].sort(() => Math.random() - 0.5).slice(0, combien);
    const bon = choisis[Math.floor(Math.random() * choisis.length)];

    haut.replaceChildren(el('span', {
      style: {
        fontSize: 'clamp(56px, 10vw, 104px)', lineHeight: '1',
        // La silhouette : on éteint la couleur, la forme reste exacte.
        filter: 'brightness(0) saturate(0)',
        opacity: '.85'
      }
    }, bon));

    bas.replaceChildren(...choisis.sort(() => Math.random() - 0.5).map((o) => {
      const b = el('button', {
        class: 'carte', type: 'button',
        style: {
          padding: '10px', minWidth: 'clamp(84px, 13vw, 116px)',
          minHeight: 'clamp(84px, 13vw, 116px)',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          fontSize: 'clamp(40px, 7vw, 66px)', lineHeight: '1'
        }
      }, o);

      b.addEventListener('pointerdown', () => {
        if (fini) return;
        if (o === bon) gagne(b);
        else { erreurs++; audio.son('presque'); anim.nonNon(b); retour.echec(conteneur, 'Pas celui-là !'); }
      });
      return b;
    }));

    audio.parler('Trouve le bon.');
    anim.cascade(bas.children, { decalage: 80, depart: 200 });
  }

  /* ---- Cycle ---------------------------------------------------------- */

  function gagne(cible) {
    reussites++;
    audio.son('recompense');
    anim.recompense(cible);
    retour.reussite(conteneur);
    attendre(nouvelle, 1100);
  }

  function nouvelle() {
    if (fini) return;
    // Point de rupture : si le temps est écoulé, on conclut ICI, jamais au
    // milieu d'un exercice commencé.
    if (minuterie.doitFinir()) { terminer(); return; }
    const n = niveauCourant();
    // En dessous du niveau 3, on reste sur le rangement par taille : la
    // silhouette demande une abstraction que les plus jeunes n'ont pas encore.
    if (n <= 2 || Math.random() < 0.5) parTaille(n);
    else ombre(n);
  }

  // Échéance douce : le temps écoulé ne coupe rien, il lève un drapeau que
  // l'activité consulte à ses points de rupture naturels.
  const minuterie = creerMinuterie({ duree: DUREE, terminer: () => terminer() });

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
