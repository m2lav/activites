/* =========================================================================
   Les deux paniers — trouver la règle en la cherchant.

   On ne dit JAMAIS la règle. Un objet se présente, l'enfant choisit un
   panier, et c'est la réaction qui lui apprend s'il a vu juste. Au bout de
   trois ou quatre objets, la règle se révèle d'elle-même.

   C'est la différence avec « Ranger et associer » : ici la consigne est
   volontairement incomplète, et c'est l'incomplétude qui fait l'exercice.
   C'est aussi pour cela qu'une erreur ne compte pas comme une faute au
   début : se tromper fait partie de la méthode.

   Les règles vont du perceptible (la couleur, la taille) au catégoriel
   (les animaux, ce qui se mange, ce qui vole).
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as retour from '../ui/retour.js';
import { creerMinuterie } from './minuterie.js';

export const meta = {
  id: 'paniers',
  nom: 'Les deux paniers',
  type: 'logique',
  categorie: 'effort',
  ages: [4, 10],
  duree: 80,
  consigne: 'Devine dans quel panier chaque objet va.'
};

/*
   Chaque règle donne deux familles d'objets. Les paniers portent un symbole
   neutre : c'est bien la règle qu'on cherche, pas une étiquette à lire.
*/
const REGLES = [
  {
    difficulte: 1, nom: 'les animaux et le reste',
    oui: ['🐶', '🐱', '🐭', '🦊', '🐸', '🐢', '🐝', '🦋'],
    non: ['🍎', '🚗', '⛵', '🎈', '📖', '🔑', '🌻', '🪁']
  },
  {
    difficulte: 1, nom: 'ce qui se mange',
    oui: ['🍎', '🍌', '🍇', '🥕', '🍰', '🧀', '🍓', '🥐'],
    non: ['🚗', '📖', '🔑', '🎈', '⛵', '🪁', '🧦', '🪑']
  },
  {
    difficulte: 2, nom: 'ce qui vole',
    oui: ['🦋', '🐝', '🕊️', '✈️', '🎈', '🪁', '🦅', '🚁'],
    non: ['🐢', '🚗', '⛵', '🐟', '🪑', '🍎', '🚂', '🦔']
  },
  {
    difficulte: 2, nom: 'ce qui roule',
    oui: ['🚗', '🚲', '🚂', '🚌', '🛴', '🚜', '🏎️', '🚚'],
    non: ['⛵', '🐟', '🌻', '📖', '🦋', '🍎', '🪑', '🔑']
  },
  {
    difficulte: 3, nom: 'ce qui vit dans l’eau',
    oui: ['🐟', '🐙', '🦈', '🐬', '🦀', '🐠', '🐳', '🦭'],
    non: ['🦊', '🐝', '🌻', '🚗', '🦋', '🐢', '🪁', '🍎']
  },
  {
    difficulte: 3, nom: 'ce qui pousse dans la terre',
    oui: ['🌻', '🌳', '🌷', '🥕', '🍄', '🌵', '🌾', '🍀'],
    non: ['🚗', '🐶', '⛵', '🔑', '🎈', '📖', '🧦', '🐟']
  }
];

const piocher = (l) => l[Math.floor(Math.random() * l.length)];

export function apercu(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  const max = n <= 3 ? 1 : n <= 6 ? 2 : 3;
  return `règles jusqu’au niveau ${max}`;
}

export function generer(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  const max = n <= 3 ? 1 : n <= 6 ? 2 : 3;
  const candidates = REGLES.filter((r) => r.difficulte <= max);
  const regle = piocher(candidates);

  // Une série alternée, pour que la règle se laisse voir rapidement.
  const combien = 6;
  const suite = Array.from({ length: combien }, (_, i) => {
    const dansOui = i % 2 === 0 ? Math.random() < 0.6 : Math.random() < 0.4;
    return { objet: piocher(dansOui ? regle.oui : regle.non), gauche: dansOui };
  });

  return { niveau: n, regle, suite };
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let courant = exercice;
  let index = 0;
  let reussites = 0;
  let erreurs = 0;
  let fini = false;
  let occupe = false;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const objetEl = el('div', {
    style: {
      fontSize: 'clamp(56px, 10vw, 110px)', lineHeight: '1', textAlign: 'center',
      minHeight: '1.1em'
    }
  });

  const compteur = el('div', {
    style: {
      textAlign: 'center', fontSize: '15px', color: 'var(--u-texte-doux)',
      fontWeight: '700', minHeight: '20px'
    }
  });

  function panier(gauche) {
    const contenu = el('div', {
      style: {
        display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: '200px', minHeight: '34px', fontSize: '24px', lineHeight: '1'
      }
    });

    const b = el('button', {
      class: 'carte', type: 'button',
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        padding: '16px 20px', minWidth: 'clamp(140px, 22vw, 230px)',
        cursor: 'pointer', font: 'inherit', color: 'inherit'
      }
    },
      el('span', { style: { fontSize: 'clamp(38px, 6vw, 58px)', lineHeight: '1' } },
        gauche ? '🧺' : '📦'),
      contenu
    );

    b.addEventListener('pointerdown', () => choisir(gauche, b, contenu));
    return { element: b, contenu };
  }

  const gauche = panier(true);
  const droite = panier(false);

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      gap: 'clamp(14px, 3.5vh, 34px)', position: 'relative'
    }
  },
    objetEl, compteur,
    el('div', {
      style: {
        display: 'flex', gap: 'clamp(16px, 4vw, 48px)', justifyContent: 'center',
        flexWrap: 'wrap', alignItems: 'flex-start'
      }
    }, gauche.element, droite.element)
  ));

  function montrer() {
    if (fini) return;
    if (index >= courant.suite.length) { serieFinie(); return; }
    occupe = false;
    objetEl.textContent = courant.suite[index].objet;
    compteur.textContent = `${index + 1} / ${courant.suite.length}`;
    anim.cascade([objetEl], { depart: 0, decalage: 0 });
  }

  function choisir(aGauche, bouton, contenu) {
    if (fini || occupe || index >= courant.suite.length) return;
    const item = courant.suite[index];

    if (item.gauche === aGauche) {
      occupe = true;
      reussites++;
      audio.son('juste');
      anim.recompense(bouton);
      contenu.append(el('span', {}, item.objet));
      // Le premier objet ne peut pas être deviné : on ne le fête pas trop fort.
      if (index > 0) retour.reussite(conteneur, 'Oui !');
      index++;
      attendre(montrer, index > 0 ? 850 : 500);
      return;
    }

    // Se tromper fait partie de la méthode : on montre le bon panier et on
    // avance, sans compter d'erreur sur le tout premier objet.
    occupe = true;
    if (index > 0) erreurs++;
    audio.son('presque');
    anim.nonNon(bouton);
    retour.echec(conteneur, 'C’est l’autre panier');

    const bon = item.gauche ? gauche : droite;
    bon.contenu.append(el('span', {}, item.objet));
    anim.recompense(bon.element);
    index++;
    attendre(montrer, 1500);
  }

  function serieFinie() {
    // On révèle la règle à la fin : c'est le moment où elle s'apprend.
    retour.reussite(conteneur, courant.regle.nom);
    audio.son('recompense');
    audio.parler(`C’était ${courant.regle.nom}.`);
    attendre(() => {
      if (fini) return;
      // Point de rupture : la série est finie.
      if (minuterie.doitFinir()) { terminer(); return; }
      courant = generer(niveauCourant());
      index = 0;
      gauche.contenu.replaceChildren();
      droite.contenu.replaceChildren();
      montrer();
    }, 2400);
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

  montrer();

  return function demonter() {
    fini = true;
    minuterie.arreter();
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
  };
}
