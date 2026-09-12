/* =========================================================================
   Animations partagées.

   Tout passe par element.animate() (Web Animations API) plutôt que par des
   classes CSS : on obtient une promesse de fin, donc le routeur peut
   attendre la fin réelle d'une transition avant de démonter l'écran sortant.
   C'est ce qui évite les clignotements entre deux activités.

   Toutes les fonctions respectent « Réduire les animations » du réglage iOS.
   ========================================================================= */

const SOUPLE = 'cubic-bezier(.22,.9,.28,1)';   // décélération franche puis douce
const REBOND = 'cubic-bezier(.34,1.56,.64,1)'; // léger dépassement, pour les récompenses

export function mouvementReduit() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Attend la fin d'une animation — mais jamais indéfiniment.
 *
 * Le navigateur met les animations en pause quand la page passe en
 * arrière-plan : la promesse `finished` ne se résout alors plus, et tout ce
 * qui l'attend reste suspendu. Le routeur, qui attend la fin d'une
 * transition avant de démonter l'écran précédent, se bloquerait pour de bon.
 * On double donc chaque attente d'une sortie de secours calée sur la durée
 * réelle de l'animation.
 */
export function attendreFin(animation) {
  const t = animation.effect?.getComputedTiming?.() || {};
  const secours = (t.delay || 0) + (t.activeDuration || 600) + 500;
  return Promise.race([
    animation.finished.catch(() => {}),
    new Promise((ok) => setTimeout(ok, secours))
  ]);
}

/* ---- Transition entre deux écrans ------------------------------------ */

/**
 * Glissement latéral : l'écran sortant recule et s'efface, l'entrant arrive
 * depuis le bord. `sens` vaut 'avant' ou 'arriere'.
 */
export async function transitionEcrans(sortant, entrant, sens = 'avant') {
  const scene = entrant.parentElement;
  scene?.classList.add('scene--transition');

  if (mouvementReduit()) {
    await fin(entrant.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 160, easing: 'linear', fill: 'both' }
    ));
    scene?.classList.remove('scene--transition');
    return;
  }

  const signe = sens === 'arriere' ? -1 : 1;
  const duree = 460;

  const sortie = sortant?.animate([
    { transform: 'translateX(0) scale(1)', opacity: 1 },
    { transform: `translateX(${-signe * 14}%) scale(.94)`, opacity: 0 }
  ], { duration: duree * 0.75, easing: SOUPLE, fill: 'both' });

  const entree = entrant.animate([
    { transform: `translateX(${signe * 100}%)`, opacity: 0.4 },
    { transform: 'translateX(0)', opacity: 1 }
  ], { duration: duree, easing: SOUPLE, fill: 'both' });

  await Promise.all([sortie ? fin(sortie) : null, fin(entree)]);
  scene?.classList.remove('scene--transition');
}

/** Première apparition, sans écran précédent. */
export function apparition(element) {
  if (mouvementReduit()) return Promise.resolve();
  return fin(element.animate([
    { opacity: 0, transform: 'scale(.96)' },
    { opacity: 1, transform: 'scale(1)' }
  ], { duration: 420, easing: SOUPLE, fill: 'both' }));
}

/* ---- Arrivée en cascade ---------------------------------------------- */

/**
 * Fait entrer une série d'éléments les uns après les autres.
 * Le conteneur doit porter la classe `cascade` pour que les éléments soient
 * invisibles avant l'appel (voir styles/transitions.css).
 */
export function cascade(elements, { decalage = 70, depart = 120, depuis = 'bas' } = {}) {
  const liste = Array.from(elements);
  if (!liste.length) return Promise.resolve();

  if (mouvementReduit()) {
    liste.forEach((el) => { el.style.opacity = '1'; });
    return Promise.resolve();
  }

  const offset = depuis === 'haut' ? '-28px' : depuis === 'gauche' ? '-28px' : '28px';
  const axe = (depuis === 'gauche' || depuis === 'droite') ? 'X' : 'Y';

  const animations = liste.map((el, i) => el.animate([
    { opacity: 0, transform: `translate${axe}(${offset}) scale(.94)` },
    { opacity: 1, transform: `translate${axe}(0) scale(1)` }
  ], {
    duration: 520,
    delay: depart + i * decalage,
    easing: REBOND,
    fill: 'both'
  }));

  return Promise.all(animations.map(fin));
}

/* ---- Retours ---------------------------------------------------------- */

/** Récompense : l'élément gonfle brièvement et un halo s'en échappe. */
export function recompense(element) {
  if (mouvementReduit()) return Promise.resolve();

  const pulsation = element.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.14)' },
    { transform: 'scale(1)' }
  ], { duration: 620, easing: REBOND });

  const r = element.getBoundingClientRect();
  const halo = document.createElement('div');
  halo.className = 'halo';
  const taille = Math.max(r.width, r.height);
  Object.assign(halo.style, {
    left: `${r.left + r.width / 2 - taille / 2}px`,
    top: `${r.top + r.height / 2 - taille / 2}px`,
    width: `${taille}px`,
    height: `${taille}px`,
    position: 'fixed'
  });
  document.body.appendChild(halo);

  const onde = halo.animate([
    { transform: 'scale(.7)', opacity: .85 },
    { transform: 'scale(1.9)', opacity: 0 }
  ], { duration: 760, easing: 'ease-out' });

  onde.finished.catch(() => {}).then(() => halo.remove());
  return fin(pulsation);
}

/**
 * Erreur : une oscillation courte et de faible amplitude.
 * Volontairement discrète — on signale, on ne sanctionne pas.
 */
export function nonNon(element) {
  if (mouvementReduit()) return Promise.resolve();
  return fin(element.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-7px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-3px)' },
    { transform: 'translateX(0)' }
  ], { duration: 340, easing: 'ease-in-out' }));
}

/** Retour tactile immédiat sur un appui. */
export function appui(element) {
  if (mouvementReduit()) return;
  element.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(.93)' },
    { transform: 'scale(1)' }
  ], { duration: 190, easing: 'ease-out' });
}

/* Alias interne : le reste du fichier appelle fin(), plus court à lire. */
const fin = attendreFin;
