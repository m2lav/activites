/* =========================================================================
   Fin de séance.

   Écran de valorisation, jamais de sanction : on montre ce qui a été fait et
   réussi, on ne compte pas les erreurs. Un enfant doit quitter l'application
   content d'y revenir — c'est la seule chose que cet écran a à faire.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import { aller, reinitialiserPile } from '../core/router.js';
import { vider as viderBandeau } from '../ui/bandeau.js';

export async function creer({ bilan }) {
  viderBandeau();

  const { profil } = bilan;
  const minutes = Math.max(1, Math.round(bilan.duree_reelle / 60));

  const tuiles = el('div', {
    class: 'cascade',
    style: {
      display: 'flex', gap: 'clamp(10px, 2vw, 22px)', justifyContent: 'center',
      flexWrap: 'wrap', margin: 'clamp(14px, 3vh, 30px) 0'
    }
  },
    tuile('⭐', bilan.reussites, bilan.reussites > 1 ? 'réussites' : 'réussite'),
    tuile('🎯', bilan.nombre, bilan.nombre > 1 ? 'activités' : 'activité'),
    tuile('⏱️', minutes, minutes > 1 ? 'minutes' : 'minute')
  );

  const detail = el('div', {
    style: {
      display: 'flex', flexDirection: 'column', gap: '6px',
      maxWidth: '460px', margin: '0 auto', width: '100%'
    }
  }, ...bilan.activites.map((a) => el('div', {
    style: {
      display: 'flex', justifyContent: 'space-between', gap: '14px',
      fontSize: '15px', color: 'var(--u-texte-doux)',
      padding: '6px 14px', borderRadius: '10px',
      background: 'color-mix(in srgb, var(--u-carte) 40%, transparent)'
    }
  },
    el('span', {}, a.nom),
    el('span', { style: { color: 'var(--u-secondaire)', fontWeight: '700' } },
      `${a.reussites} ⭐`)
  )));

  const encore = el('button', { class: 'bouton bouton--primaire', type: 'button' },
    'Encore une séance');
  encore.addEventListener('pointerdown', async () => {
    anim.appui(encore);
    audio.son('juste');
    reinitialiserPile();
    await aller('duree', { profil });
  }, { once: true });

  const fini = el('button', { class: 'bouton', type: 'button' }, "C'est fini");
  fini.addEventListener('pointerdown', async () => {
    anim.appui(fini);
    audio.son('tap');
    reinitialiserPile();
    await aller('accueil', {}, { sens: 'arriere' });
  }, { once: true });

  const titre = el('h1', {
    class: 'titre',
    style: { textAlign: 'center', margin: '0' }
  }, `Bravo ${profil.prenom} !`);

  const medaille = el('div', {
    style: {
      fontSize: 'clamp(56px, 9vw, 96px)', lineHeight: '1', textAlign: 'center'
    }
  }, '🏅');

  const element = el('div', { class: 'ecran ecran--defilable' },
    el('div', { class: 'contenu', style: { textAlign: 'center' } },
      medaille,
      titre,
      tuiles,
      detail,
      el('div', {
        style: {
          display: 'flex', gap: '14px', justifyContent: 'center',
          flexWrap: 'wrap', marginTop: 'clamp(16px, 3vh, 30px)'
        }
      }, encore, fini)
    )
  );

  return {
    element,
    apresMontage() {
      audio.son('recompense');
      anim.recompense(medaille);
      anim.cascade(tuiles.children, { decalage: 130, depart: 260 });
      anim.cascade(detail.children, { decalage: 60, depart: 700 });
      // Un « tu as réussi 0 fois » serait exactement la sanction qu'on s'interdit.
      audio.parler(bilan.reussites > 0
        ? `Bravo ${profil.prenom} ! Tu as réussi ${bilan.reussites} fois.`
        : `Bravo ${profil.prenom} ! On recommence quand tu veux.`);
    }
  };
}

function tuile(icone, valeur, libelle) {
  return el('div', {
    class: 'carte',
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
      minWidth: 'clamp(112px, 15vw, 150px)'
    }
  },
    el('span', { style: { fontSize: '30px', lineHeight: '1' } }, icone),
    el('span', {
      style: {
        fontFamily: 'var(--u-police-titre)', fontWeight: '800',
        fontSize: 'clamp(30px, 4.4vw, 46px)', lineHeight: '1.1'
      }
    }, String(valeur)),
    el('span', { style: { fontSize: '14px', color: 'var(--u-texte-doux)' } }, libelle)
  );
}
