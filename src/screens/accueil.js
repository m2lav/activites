/* =========================================================================
   Choix du profil.

   Point de départ de toute séance, et seule porte vers l'espace parent —
   celle-ci s'ouvre par appui long sur la roue dentée, pour qu'un enfant ne
   tombe pas dessus en explorant.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as store from '../core/store.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as univers from '../core/univers.js';
import { boutonSilence, appuiLong } from '../ui/controles.js';
import { vider as viderBandeau } from '../ui/bandeau.js';
import { aller } from '../core/router.js';

export async function creer() {
  viderBandeau();

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

  const roue = el('button', {
    type: 'button', class: 'bouton',
    'aria-label': 'Espace parent (appui long)',
    style: { width: 'var(--touche-min)', padding: '0', fontSize: '24px', opacity: '.55' }
  }, '⚙️');
  appuiLong(roue, () => aller('parent'));

  const coin = el('div', {
    style: { position: 'absolute', top: '0', right: '0', display: 'flex', gap: '10px' }
  }, roue, boutonSilence());

  const element = el('div', {
    class: 'ecran',
    style: { justifyContent: 'center', position: 'relative' }
  }, coin, titre, grille);

  return {
    element,
    apresMontage() { anim.cascade(grille.children, { decalage: 90, depart: 90 }); }
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
    await aller('duree', { profil: p });
  }, { once: true });

  return carte;
}
