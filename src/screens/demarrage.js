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
import { signaler, contexte } from '../ui/erreur.js';
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

  // Ligne d'identification de l'appareil, discrète. Elle sert au diagnostic
  // à distance tant que l'installation n'est pas validée ; à retirer au lot 5.
  const tampon = el('p', {
    style: {
      position: 'absolute', bottom: 'var(--marge-bas)', left: '0', right: '0',
      textAlign: 'center', fontSize: '12px', opacity: '.35', margin: '0'
    }
  }, contexte());

  const element = el('div', {
    class: 'ecran ecran--centre',
    style: { position: 'relative' }
  }, bloc, tampon);

  let parti = false;

  const demarrer = async () => {
    if (parti) return;
    parti = true;

    // Retour visuel immédiat : le tap est pris en compte, quoi qu'il arrive
    // ensuite. Sans lui, l'écran paraît mort pendant le déblocage audio.
    anim.appui(pastille);
    invite.textContent = 'Un instant…';

    try {
      await audio.debloquer();
      audio.son('juste');

      // Premier lancement sur cet appareil : on demande d'abord qui va jouer.
      // Si la base tarde ou refuse, on part sur la configuration plutôt que
      // de rester coincé ici.
      const configure = await Promise.race([
        store.estConfigure().catch(() => false),
        new Promise((r) => setTimeout(() => r(false), 2500))
      ]);

      await aller(configure ? 'accueil' : 'configuration');
    } catch (e) {
      // On rouvre la porte : un second tap doit pouvoir réessayer.
      parti = false;
      invite.textContent = "Touche l'écran pour commencer";
      signaler(e);
    }
  };

  // pointerdown couvre le doigt et le Pencil. click reste en filet pour les
  // navigateurs qui ne livrent pas l'événement pointeur sur un div.
  element.addEventListener('pointerdown', demarrer);
  element.addEventListener('click', demarrer);

  return {
    element,
    apresMontage() {
      anim.cascade(bloc.children, { decalage: 110, depart: 140 });
    }
  };
}
