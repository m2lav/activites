/* =========================================================================
   Retour de réussite et d'erreur.

   Un enfant de quatre ans ne lit pas « Presque ! Essaie encore » écrit en
   petit sous l'exercice. Il lui faut un signal immédiat, grand, et de
   couleur : un visage vert qui sourit quand c'est bon, un visage orange
   quand ça ne l'est pas.

   Orange et jamais rouge, sourire penaud et jamais grimace : on signale,
   on ne sanctionne pas. C'est la même règle que partout ailleurs.

   Le voile est posé par-dessus l'activité, sans intercepter les touches —
   l'enfant peut continuer à jouer pendant qu'il s'efface.
   ========================================================================= */

import { el } from './dom.js';
import { mouvementReduit } from '../core/anim.js';

function poser(hote, visage, texte, couleur, duree) {
  // L'hôte doit pouvoir porter un enfant positionné.
  if (getComputedStyle(hote).position === 'static') hote.style.position = 'relative';

  const bulle = el('div', {
    style: {
      width: 'clamp(104px, 17vw, 168px)', aspectRatio: '1', borderRadius: '50%',
      background: couleur, display: 'grid', placeItems: 'center',
      fontSize: 'clamp(54px, 9vw, 94px)', lineHeight: '1',
      boxShadow: `0 18px 48px -14px ${couleur}`
    }
  }, visage);

  const legende = texte ? el('div', {
    style: {
      fontFamily: 'var(--u-police-titre)', fontWeight: '800',
      fontSize: 'clamp(26px, 4.4vw, 48px)', textAlign: 'center',
      color: couleur, textShadow: '0 2px 14px var(--u-fond)',
      maxWidth: '18ch'
    }
  }, texte) : null;

  const voile = el('div', {
    style: {
      position: 'absolute', inset: '0', zIndex: '20',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '16px',
      pointerEvents: 'none'     // on ne bloque jamais le jeu
    }
  }, bulle, legende);

  hote.appendChild(voile);

  if (mouvementReduit()) {
    setTimeout(() => voile.remove(), duree);
    return voile;
  }

  voile.animate(
    [{ opacity: 0, transform: 'scale(.72)' },
     { opacity: 1, transform: 'scale(1)', offset: .18 },
     { opacity: 1, transform: 'scale(1)', offset: .74 },
     { opacity: 0, transform: 'scale(1.08)' }],
    { duration: duree, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }
  ).finished.catch(() => {}).then(() => voile.remove());

  setTimeout(() => voile.remove(), duree + 400);
  return voile;
}

/** C'est gagné. Vert, souriant, court. */
export function reussite(hote, texte = 'Bravo !') {
  return poser(hote, '😀', texte, 'var(--u-vert-ok)', 1100);
}

/** Ce n'est pas ça. Orange, encourageant, un peu plus long pour être lu. */
export function echec(hote, texte = 'Presque !') {
  return poser(hote, '🙂', texte, 'var(--u-orange-presque)', 1300);
}

/** La bonne réponse est montrée : on l'annonce en grand, sans reproche. */
export function reponseMontree(hote, texte) {
  return poser(hote, '👀', texte, 'var(--u-orange-presque)', 2000);
}
