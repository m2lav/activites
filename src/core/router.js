/* =========================================================================
   Routeur d'écrans.

   Pas d'URL, pas de hash : l'app est en plein écran et le bouton retour du
   navigateur n'existe pas en mode standalone. On garde simplement une pile
   d'écrans en mémoire.

   Contrat d'un écran — un module exportant :
     export function creer(params) {
       return {
         element,            // l'élément racine, ajouté à la scène
         apresMontage?(),    // appelé une fois la transition terminée
         demonter?()         // nettoyage : minuteurs, écouteurs, audio
       };
     }
   ========================================================================= */

import { transitionEcrans, apparition } from './anim.js';

const ecrans = new Map();
const pile = [];
let courant = null;
let enCours = false;

export function enregistrer(nom, fabrique) {
  ecrans.set(nom, fabrique);
}

export function ecranCourant() {
  return courant?.nom ?? null;
}

/**
 * Affiche un écran. Les appels concurrents sont ignorés : sans ce garde-fou,
 * un double tap d'enfant pendant une transition empile deux écrans.
 */
export async function aller(nom, params = {}, { sens = 'avant', empiler = true } = {}) {
  if (enCours) return;
  const fabrique = ecrans.get(nom);
  if (!fabrique) throw new Error(`Écran inconnu : ${nom}`);

  enCours = true;
  try {
    const scene = document.getElementById('scene');
    const vue = await fabrique(params);
    vue.nom = nom;
    vue.params = params;

    const el = vue.element;
    el.classList.add('ecran');
    scene.appendChild(el);

    const sortant = courant;
    if (sortant) {
      await transitionEcrans(sortant.element, el, sens);
      try { sortant.demonter?.(); } catch (e) { console.warn('demonter', e); }
      sortant.element.remove();
      if (empiler) pile.push({ nom: sortant.nom, params: sortant.params });
    } else {
      await apparition(el);
    }

    courant = vue;
    vue.apresMontage?.();
  } finally {
    enCours = false;
  }
}

/** Revient à l'écran précédent, avec la transition inversée. */
export async function retour() {
  const precedent = pile.pop();
  if (!precedent) return;
  await aller(precedent.nom, precedent.params, { sens: 'arriere', empiler: false });
}

/** Vide la pile — utilisé au retour à l'accueil en fin de session. */
export function reinitialiserPile() {
  pile.length = 0;
}
