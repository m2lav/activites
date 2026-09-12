/* =========================================================================
   Pavé numérique dessiné dans l'application.

   Jamais le clavier système : sur iPad il masque la moitié de l'écran, et il
   propose bien plus que des chiffres. Ici, dix grosses touches, un retour
   visuel et sonore à chaque appui, et rien d'autre.

   Construit pour le code parent, mais c'est le même composant qui servira à
   la saisie des réponses en calcul mental.
   ========================================================================= */

import { el } from './dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';

/**
 * @param {object} o
 * @param {number} o.longueurMax     nombre de chiffres acceptés
 * @param {'points'|'chiffres'|'aucun'} o.affichage
 * @param {boolean} o.validerAuto    valide dès que la longueur est atteinte
 * @param {(valeur:string)=>void} o.surValider
 * @param {(valeur:string)=>void} o.surChangement
 */
export function creerPave({
  longueurMax = 4,
  affichage = 'points',
  validerAuto = true,
  surValider = () => {},
  surChangement = () => {}
} = {}) {
  let valeur = '';

  const ecran = el('div', {
    style: {
      display: affichage === 'aucun' ? 'none' : 'flex',
      gap: '14px', justifyContent: 'center', alignItems: 'center',
      minHeight: '58px', marginBottom: '18px'
    }
  });

  function dessinerEcran() {
    if (affichage === 'aucun') return;
    if (affichage === 'chiffres') {
      ecran.replaceChildren(el('span', {
        style: {
          fontFamily: 'var(--u-police-titre)', fontWeight: '800',
          fontSize: '44px', letterSpacing: '.06em', minHeight: '52px'
        }
      }, valeur || ' '));
      return;
    }
    ecran.replaceChildren(...Array.from({ length: longueurMax }, (_, i) => el('div', {
      style: {
        width: '20px', height: '20px', borderRadius: '50%',
        background: i < valeur.length ? 'var(--u-secondaire)' : 'transparent',
        border: '3px solid color-mix(in srgb, var(--u-texte) 30%, transparent)',
        transition: 'background-color .18s ease, transform .18s ease',
        transform: i === valeur.length - 1 ? 'scale(1.25)' : 'scale(1)'
      }
    })));
  }

  function definir(v) {
    valeur = v.slice(0, longueurMax);
    dessinerEcran();
    surChangement(valeur);
    if (validerAuto && valeur.length === longueurMax) {
      // Un souffle avant de valider : l'enfant doit voir son dernier chiffre.
      setTimeout(() => surValider(valeur), 180);
    }
  }

  const touche = (libelle, action, variante) => {
    const b = el('button', {
      type: 'button',
      class: 'bouton',
      style: {
        minHeight: 'var(--touche-min)',
        fontSize: variante ? '26px' : 'clamp(24px, 3.4vw, 34px)',
        fontWeight: '800', padding: '0',
        background: variante === 'valider' ? 'var(--u-primaire)'
          : variante === 'effacer' ? 'color-mix(in srgb, var(--u-carte) 60%, transparent)'
            : 'var(--u-carte)',
        color: variante === 'valider' ? 'var(--u-sur-primaire)' : 'var(--u-texte)'
      }
    }, libelle);

    b.addEventListener('pointerdown', () => {
      anim.appui(b);
      audio.son('touche');
      action();
    });
    return b;
  };

  const touches = [];
  for (let n = 1; n <= 9; n++) {
    touches.push(touche(String(n), () => definir(valeur + n)));
  }
  touches.push(touche('⌫', () => definir(valeur.slice(0, -1)), 'effacer'));
  touches.push(touche('0', () => definir(valeur + '0')));
  touches.push(touche('✓', () => surValider(valeur), 'valider'));

  const grille = el('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(var(--touche-min), 1fr))',
      gap: 'clamp(10px, 1.4vw, 16px)',
      width: 'min(360px, 84vw)', margin: '0 auto'
    }
  }, ...touches);

  const element = el('div', {}, ecran, grille);
  dessinerEcran();

  return {
    element,
    valeur: () => valeur,
    vider: () => definir(''),
    /** Refus : on secoue l'écran de saisie, on ne punit pas. */
    refuser() {
      anim.nonNon(ecran);
      audio.son('presque');
      definir('');
    }
  };
}
