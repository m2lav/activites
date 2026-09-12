/* =========================================================================
   Choix de la durée de la séance.

   On fixe le temps avant d'entrer, jamais pendant : c'est ce qui transforme
   l'app en cahier de vacances plutôt qu'en jeu sans fin. Chaque durée montre
   ses minutes sous forme de segments — les mêmes que le sablier — pour que
   l'enfant voie ce qu'il choisit sans savoir lire un chiffre.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import { aller, retour } from '../core/router.js';
import { vider as viderBandeau } from '../ui/bandeau.js';

const DUREES = [5, 10, 15, 20];

export async function creer({ profil }) {
  viderBandeau();

  const cartes = DUREES.map((minutes) => carte(profil, minutes));

  const rangee = el('div', {
    class: 'cascade',
    style: {
      display: 'flex', gap: 'clamp(12px, 2.2vw, 26px)', justifyContent: 'center',
      flexWrap: 'wrap', marginTop: 'clamp(14px, 3vh, 34px)'
    }
  }, ...cartes);

  const retourner = el('button', {
    class: 'bouton', type: 'button',
    style: { position: 'absolute', top: '0', left: '0' }
  }, '←');
  retourner.addEventListener('pointerdown', () => { anim.appui(retourner); audio.son('tap'); retour(); });

  const element = el('div', {
    class: 'ecran',
    style: { justifyContent: 'center', position: 'relative' }
  },
    retourner,
    el('h1', { class: 'titre', style: { textAlign: 'center' } },
      `On joue combien de temps, ${profil.prenom} ?`),
    rangee
  );

  return {
    element,
    apresMontage() { anim.cascade(rangee.children, { decalage: 80, depart: 80 }); }
  };
}

function carte(profil, minutes) {
  // Aperçu du sablier : une pastille par minute.
  const segments = el('div', {
    style: {
      display: 'flex', gap: '3px', justifyContent: 'center',
      flexWrap: 'wrap', maxWidth: '150px', margin: '0 auto'
    }
  }, ...Array.from({ length: minutes }, () => el('div', {
    style: {
      width: '10px', height: '10px', borderRadius: '999px',
      background: 'var(--u-secondaire)'
    }
  })));

  const b = el('button', {
    class: 'carte', type: 'button',
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
      minWidth: 'clamp(140px, 19vw, 190px)', cursor: 'pointer',
      font: 'inherit', color: 'inherit'
    }
  },
    el('span', {
      style: {
        fontFamily: 'var(--u-police-titre)', fontWeight: '800',
        fontSize: 'clamp(40px, 6vw, 62px)', lineHeight: '1'
      }
    }, String(minutes)),
    el('span', { style: { fontSize: '16px', color: 'var(--u-texte-doux)' } }, 'minutes'),
    segments
  );

  b.addEventListener('pointerdown', async () => {
    anim.appui(b);
    audio.son('juste');
    await aller('seance', { profil, dureeMinutes: minutes });
  }, { once: true });

  return b;
}
