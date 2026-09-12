/* =========================================================================
   Choix du profil.

   Version du lot 1 : les trois enfants, l'univers préféré appliqué au tap,
   et le bouton silence global. Le choix de la durée (sablier) viendra
   s'intercaler ici au lot 2.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as store from '../core/store.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as univers from '../core/univers.js';
import { aller } from '../core/router.js';

export async function creer() {
  const profils = await store.profils();

  const cartes = profils.map((p) => carteProfil(p));

  const grille = el('div', {
    class: 'cascade',
    style: {
      display: 'flex', gap: 'clamp(16px, 3vw, 34px)',
      justifyContent: 'center', alignItems: 'stretch',
      flexWrap: 'wrap', marginTop: 'clamp(16px, 3vh, 40px)'
    }
  }, ...cartes);

  const titre = el('h1', { class: 'titre', style: { textAlign: 'center' } }, 'Qui joue ?');

  const element = el('div', {
    class: 'ecran',
    style: { justifyContent: 'center', position: 'relative' }
  }, boutonSilence(), titre, grille);

  return {
    element,
    apresMontage() {
      anim.cascade(grille.children, { decalage: 90, depart: 90 });
    }
  };
}

function carteProfil(p) {
  const disque = el('div', {
    style: {
      width: 'clamp(96px, 14vw, 150px)',
      aspectRatio: '1',
      borderRadius: '50%',
      background: p.couleur,
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--u-police-titre)',
      fontSize: 'clamp(42px, 6.5vw, 72px)',
      fontWeight: '800',
      color: '#fff',
      boxShadow: `0 16px 40px -14px ${p.couleur}`
    }
  }, p.prenom[0]);

  const carte = el('button', {
    class: 'carte',
    type: 'button',
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '16px', minWidth: 'clamp(150px, 22vw, 230px)',
      cursor: 'pointer', font: 'inherit', color: 'inherit'
    }
  },
    disque,
    el('span', {
      style: {
        fontFamily: 'var(--u-police-titre)',
        fontSize: 'clamp(22px, 2.8vw, 32px)', fontWeight: '700'
      }
    }, p.prenom),
    el('span', {
      style: { fontSize: '15px', color: 'var(--u-texte-doux)' }
    }, `${p.age} ans`)
  );

  carte.addEventListener('pointerdown', async () => {
    anim.appui(carte);
    audio.son('tap');
    await univers.appliquer(p.univers_prefere);
    await aller('diagnostic', { profil: p });
  }, { once: true });

  return carte;
}

function boutonSilence() {
  const b = el('button', {
    type: 'button',
    'aria-label': 'Couper le son',
    class: 'bouton',
    style: {
      position: 'absolute', top: '0', right: '0',
      width: 'var(--touche-min)', padding: '0', fontSize: '26px'
    }
  }, audio.estActif() ? '🔊' : '🔇');

  b.addEventListener('pointerdown', () => {
    const actif = audio.silence(audio.estActif());
    b.textContent = actif ? '🔊' : '🔇';
    if (actif) audio.son('tap');
    store.definirReglage('son_actif', actif);
    anim.appui(b);
  });

  return b;
}
