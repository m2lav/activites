/* =========================================================================
   Roue de réglage de la difficulté.

   Point important du cadrage : ce réglage ne vit pas dans l'espace parent.
   Si un exercice s'avère trop facile en pleine séance, sortir de l'univers
   pour aller fouiller un menu est trop lent — on ne le fera jamais, et le
   niveau restera mal réglé pendant des semaines.

   Donc : une roue dentée discrète dans le bandeau, ouverte par **appui
   long** pour qu'un enfant ne s'y mette pas seul au niveau 1. Le choix
   s'applique à l'exercice suivant, jamais à celui qui est en cours — changer
   la règle au milieu d'une question serait déloyal.

   Le brief demandait un curseur ; dix segments tactiles font le même travail
   et se visent bien mieux au doigt qu'une poignée à faire glisser.
   ========================================================================= */

import { el } from './dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import { appuiLong } from './controles.js';

/**
 * @param {() => ({type, libelle, niveau, apercu}|null)} contexte
 *        état courant : null quand aucune activité n'est en cours.
 * @param {(type: string, niveau: number) => Promise<void>} definir
 */
export function creerRoue({ contexte, definir }) {
  const bouton = el('button', {
    type: 'button',
    class: 'bouton',
    'aria-label': 'Régler la difficulté (appui long)',
    style: {
      width: 'var(--touche-min)', padding: '0', fontSize: '22px',
      flex: '0 0 auto', opacity: '.5'
    }
  }, '⚙️');

  appuiLong(bouton, () => {
    const etat = contexte();
    if (!etat) return;
    ouvrir(etat, definir);
  });

  return bouton;
}

function ouvrir(etat, definir) {
  let choisi = etat.niveau;

  const exemple = el('div', {
    style: {
      fontFamily: 'var(--u-police-titre)', fontWeight: '800',
      fontSize: 'clamp(26px, 4vw, 40px)', textAlign: 'center',
      minHeight: '1.4em', color: 'var(--u-secondaire)'
    }
  });

  const segments = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    const s = el('button', {
      type: 'button',
      'aria-label': `Niveau ${n}`,
      style: {
        flex: '1', minWidth: '0', minHeight: '56px', padding: '0',
        border: 'none', borderRadius: '10px', cursor: 'pointer',
        fontFamily: 'var(--u-police-titre)', fontWeight: '800', fontSize: '17px',
        transition: 'background-color .15s ease, transform .15s ease'
      }
    }, String(n));
    s.addEventListener('pointerdown', () => {
      choisi = n;
      audio.son('touche');
      anim.appui(s);
      peindre();
    });
    return s;
  });

  function peindre() {
    for (const [i, s] of segments.entries()) {
      const n = i + 1;
      const actif = n === choisi;
      s.style.background = n <= choisi
        ? 'var(--u-primaire)'
        : 'color-mix(in srgb, var(--u-texte) 12%, transparent)';
      s.style.color = n <= choisi ? '#fff' : 'var(--u-texte-doux)';
      s.style.transform = actif ? 'scale(1.12)' : 'scale(1)';
    }
    // Un aperçu concret vaut mieux qu'un chiffre : on voit ce que le niveau
    // veut dire avant de valider.
    exemple.textContent = etat.apercu ? (etat.apercu(choisi) ?? '') : '';
  }
  peindre();

  const valider = el('button', { class: 'bouton bouton--primaire', type: 'button' },
    'Appliquer');
  const annuler = el('button', { class: 'bouton', type: 'button' }, 'Annuler');

  const panneau = el('div', {
    class: 'carte',
    style: {
      width: 'min(560px, 92vw)', display: 'grid', gap: '16px',
      background: 'var(--u-carte)'
    }
  },
    el('div', { style: { textAlign: 'center' } },
      el('div', {
        style: {
          fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase',
          color: 'var(--u-texte-doux)'
        }
      }, 'Niveau'),
      el('div', {
        style: { fontFamily: 'var(--u-police-titre)', fontWeight: '800', fontSize: '22px' }
      }, etat.libelle)
    ),
    exemple,
    el('div', { style: { display: 'flex', gap: '6px' } }, ...segments),
    el('div', {
      style: { fontSize: '14px', color: 'var(--u-texte-doux)', textAlign: 'center' }
    }, "S'appliquera à l'exercice suivant."),
    el('div', {
      style: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }
    }, annuler, valider)
  );

  const voile = el('div', { class: 'voile' }, panneau);
  document.body.appendChild(voile);

  voile.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'both' });
  panneau.animate(
    [{ transform: 'translateY(18px) scale(.96)', opacity: 0 },
     { transform: 'translateY(0) scale(1)', opacity: 1 }],
    { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }
  );

  const fermer = () => {
    voile.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'both' })
      .finished.catch(() => {}).then(() => voile.remove());
  };

  annuler.addEventListener('pointerdown', () => { audio.son('tap'); fermer(); });
  voile.addEventListener('pointerdown', (e) => { if (e.target === voile) fermer(); });

  valider.addEventListener('pointerdown', async () => {
    anim.appui(valider);
    audio.son('juste');
    await definir(etat.type, choisi);
    fermer();
  });
}
