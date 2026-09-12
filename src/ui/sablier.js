/* =========================================================================
   Sablier de séance.

   Affiché en permanence en haut de l'écran. Il doit être lisible par un
   enfant de 4 ans : d'où des segments — un par minute — qui s'éteignent un
   à un, plutôt qu'une barre lisse ou des chiffres. On voit « il reste trois
   morceaux » sans savoir lire l'heure.

   Quand le temps est écoulé, il n'interrompt rien : il annonce simplement
   que c'est la dernière activité. La coupure est interdite (voir
   core/session.js).
   ========================================================================= */

import { el } from './dom.js';

const MINUTE = 60_000;

export function creerSablier({ dureeMinutes, restant }) {
  const total = dureeMinutes * MINUTE;
  const segments = [];

  const piste = el('div', {
    style: {
      display: 'flex', gap: '4px', flex: '1', minWidth: '0',
      height: '18px', alignItems: 'stretch'
    }
  });

  for (let i = 0; i < dureeMinutes; i++) {
    const remplissage = el('div', {
      style: {
        height: '100%', width: '100%',
        background: 'var(--u-secondaire)',
        borderRadius: '999px',
        transformOrigin: 'left center',
        transition: 'background-color .5s ease'
      }
    });
    const segment = el('div', {
      style: {
        flex: '1', minWidth: '0', height: '100%',
        background: 'color-mix(in srgb, var(--u-texte) 12%, transparent)',
        borderRadius: '999px', overflow: 'hidden'
      }
    }, remplissage);
    segments.push(remplissage);
    piste.appendChild(segment);
  }

  const icone = el('span', { style: { fontSize: '22px', lineHeight: '1' } }, '⏳');

  const libelle = el('span', {
    style: {
      fontFamily: 'var(--u-police-titre)', fontWeight: '700',
      fontSize: '15px', minWidth: '68px', textAlign: 'right',
      color: 'var(--u-texte-doux)', whiteSpace: 'nowrap'
    }
  }, '');

  const element = el('div', {
    style: { display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '0' }
  }, icone, piste, libelle);

  let minuteur = null;
  let epuiseAnnonce = false;

  function rafraichir() {
    const reste = restant();
    const passe = total - reste;

    for (let i = 0; i < segments.length; i++) {
      const part = Math.min(MINUTE, Math.max(0, (i + 1) * MINUTE - passe)) / MINUTE;
      segments[i].style.transform = `scaleX(${part})`;
    }

    const derniereMinute = reste > 0 && reste <= MINUTE;
    const couleur = reste <= 0 ? 'var(--u-accent)'
      : derniereMinute ? 'var(--u-accent)' : 'var(--u-secondaire)';
    for (const s of segments) s.style.backgroundColor = couleur;

    if (reste <= 0) {
      libelle.textContent = 'dernière !';
      libelle.style.color = 'var(--u-accent)';
      if (!epuiseAnnonce) {
        epuiseAnnonce = true;
        icone.textContent = '⌛';
        icone.animate(
          [{ transform: 'rotate(0)' }, { transform: 'rotate(180deg)' }],
          { duration: 700, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }
        );
      }
    } else if (reste < MINUTE) {
      libelle.textContent = `${Math.ceil(reste / 1000)} s`;
      libelle.style.color = 'var(--u-accent)';
    } else {
      libelle.textContent = `${Math.ceil(reste / MINUTE)} min`;
      libelle.style.color = 'var(--u-texte-doux)';
    }
  }

  return {
    element,
    demarrer() {
      rafraichir();
      // 250 ms : assez fin pour que les secondes défilent sans à-coup,
      // assez lâche pour ne rien coûter à la batterie.
      minuteur = setInterval(rafraichir, 250);
    },
    arreter() {
      if (minuteur) clearInterval(minuteur);
      minuteur = null;
    },
    rafraichir
  };
}
