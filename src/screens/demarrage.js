/* =========================================================================
   Écran de démarrage.

   Sa vraie fonction est technique : sur iOS, le son ne peut être débloqué
   que depuis un geste tactile réel. Ce premier tap sert de déclencheur.
   Il est donc présenté comme une invitation, jamais comme un obstacle.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as store from '../core/store.js';
import { aller } from '../core/router.js';

export async function creer() {
  const titre = el('h1', { class: 'titre' }, 'Bonjour !');
  const invite = el('p', { class: 'sous-titre' }, "Touche l'écran pour commencer");

  const pastille = el('div', {
    class: 'respire',
    style: {
      width: '132px', height: '132px', borderRadius: '50%',
      background: 'var(--u-primaire)',
      display: 'grid', placeItems: 'center',
      marginBottom: '34px',
      boxShadow: '0 18px 50px -12px color-mix(in srgb, var(--u-primaire) 70%, transparent)'
    }
  }, el('span', { style: { fontSize: '62px' } }, '👋'));

  const bloc = el('div', {
    class: 'cascade',
    style: { display: 'flex', flexDirection: 'column', alignItems: 'center' }
  }, pastille, titre, invite);

  const element = el('div', { class: 'ecran ecran--centre' }, bloc);

  let parti = false;
  const demarrer = async () => {
    if (parti) return;
    parti = true;
    await audio.debloquer();
    audio.son('juste');
    anim.appui(pastille);
    // Premier lancement sur cet appareil : on demande d'abord qui va jouer.
    const configure = await store.estConfigure().catch(() => false);
    await aller(configure ? 'accueil' : 'configuration');
  };

  // pointerdown : le doigt comme le Pencil, et sans les 300 ms du clic.
  element.addEventListener('pointerdown', demarrer, { once: true });

  return {
    element,
    apresMontage() {
      anim.cascade(bloc.children, { decalage: 110, depart: 140 });
    }
  };
}
