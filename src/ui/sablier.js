/* =========================================================================
   Sablier de séance.

   Affiché en permanence en haut de l'écran. **Une case = une activité**, pas
   une minute : un enfant de quatre ans ne sait pas ce que vaut une minute,
   mais il sait voir qu'il reste trois jeux. La case en cours se vide pendant
   que l'activité se joue, les cases finies restent éteintes.

   Il n'interrompt jamais rien. Quand une case est vide, l'activité va à son
   terme naturel — c'est la minuterie de l'activité qui décide, pas le
   sablier (voir activities/minuterie.js).
   ========================================================================= */

import { el } from './dom.js';

/**
 * @param {object} o
 * @param {number} o.nombre  nombre d'activités de la séance
 * @param {() => ({indice:number, part:number})} o.progression
 *        indice de l'activité en cours, et part écoulée de son budget (0 à 1)
 */
export function creerSablier({ nombre, progression }) {
  const segments = [];

  const piste = el('div', {
    style: {
      display: 'flex', gap: '5px', flex: '1', minWidth: '0',
      height: '20px', alignItems: 'stretch'
    }
  });

  for (let i = 0; i < nombre; i++) {
    const remplissage = el('div', {
      style: {
        height: '100%', width: '100%',
        background: 'var(--u-secondaire)',
        borderRadius: '999px',
        transformOrigin: 'left center',
        transition: 'background-color .4s ease'
      }
    });
    const segment = el('div', {
      style: {
        flex: '1', minWidth: '0', height: '100%',
        background: 'color-mix(in srgb, var(--u-texte) 14%, transparent)',
        borderRadius: '999px', overflow: 'hidden'
      }
    }, remplissage);
    segments.push(remplissage);
    piste.appendChild(segment);
  }

  const icone = el('span', { style: { fontSize: '22px', lineHeight: '1' } }, '⏳');

  const libelle = el('span', {
    style: {
      fontFamily: 'var(--u-police-titre)', fontWeight: '800',
      fontSize: '15px', minWidth: '52px', textAlign: 'right',
      color: 'var(--u-texte-doux)', whiteSpace: 'nowrap'
    }
  }, '');

  const element = el('div', {
    style: { display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '0' }
  }, icone, piste, libelle);

  let minuteur = null;
  let derniereAnnonce = -1;

  function rafraichir() {
    const { indice, part } = progression();

    for (let i = 0; i < segments.length; i++) {
      const reste = i < indice ? 0 : i > indice ? 1 : Math.max(0, 1 - part);
      segments[i].style.transform = `scaleX(${reste})`;
      segments[i].style.backgroundColor = (i === indice && part >= 1)
        ? 'var(--u-accent)'
        : 'var(--u-secondaire)';
    }

    libelle.textContent = `${Math.min(indice + 1, nombre)} / ${nombre}`;

    // Le sablier se retourne quand on entame la dernière activité.
    if (indice !== derniereAnnonce) {
      derniereAnnonce = indice;
      if (indice === nombre - 1) {
        icone.textContent = '⌛';
        icone.animate(
          [{ transform: 'rotate(0)' }, { transform: 'rotate(180deg)' }],
          { duration: 700, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }
        );
      }
    }
  }

  return {
    element,
    demarrer() {
      rafraichir();
      minuteur = setInterval(rafraichir, 250);
    },
    arreter() {
      if (minuteur) clearInterval(minuteur);
      minuteur = null;
    },
    rafraichir
  };
}
