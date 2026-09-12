/* =========================================================================
   Nœuds marins — pour Gaspard.

   Le brief est explicite : on ne prétend pas apprendre à FAIRE un nœud sur
   un écran, ça ne marche pas. On travaille donc ce qui se retient
   vraiment — à quoi sert chaque nœud, et dans quel ordre se font les gestes
   du nœud de chaise.

   La reconnaissance d'un nœud sur photo viendra quand il y aura de vraies
   images : sans elles, la question n'a pas de sens.
   ========================================================================= */

import { creerActivite } from './connaissances.js';

const USAGES = [
  {
    enonce: 'À quoi sert le nœud de chaise ?',
    illustration: '⛵',
    options: ['À faire une boucle qui ne se serre pas',
      'À raccourcir un cordage trop long',
      'À relier deux cordages'],
    reponse: 'À faire une boucle qui ne se serre pas',
    explication: 'C’est pourquoi on peut le passer autour de soi sans risque.'
  },
  {
    enonce: 'Quel nœud relie deux cordages de même grosseur ?',
    illustration: '🪢',
    options: ['Le nœud plat', 'Le nœud de chaise', 'Le nœud de huit'],
    reponse: 'Le nœud plat'
  },
  {
    enonce: 'À quoi sert le nœud de huit au bout d’un cordage ?',
    illustration: '🔚',
    options: ['À l’empêcher de filer dans une poulie',
      'À l’attacher à un anneau',
      'À faire une boucle'],
    reponse: 'À l’empêcher de filer dans une poulie',
    explication: 'Il fait une grosseur qui bloque : on l’appelle un nœud d’arrêt.'
  },
  {
    enonce: 'Quel nœud sert à amarrer un bateau à un anneau ?',
    illustration: '⚓',
    options: ['Deux demi-clés', 'Le nœud plat', 'Le nœud de huit'],
    reponse: 'Deux demi-clés'
  },
  {
    enonce: 'Un nœud d’arrêt, à quoi ça sert ?',
    illustration: '🪢',
    options: ['À empêcher le cordage de s’échapper',
      'À joindre deux cordages',
      'À faire une poignée'],
    reponse: 'À empêcher le cordage de s’échapper'
  }
];

/* Le moyen mnémotechnique classique du nœud de chaise : le serpent sort du
   puits, fait le tour de l'arbre, et rentre dans le puits. */
const CHAISE = {
  forme: 'ordre',
  enonce: 'Le nœud de chaise — remets les étapes dans l’ordre',
  illustration: '🐍',
  etapes: [
    'Faire une petite boucle : c’est le puits',
    'Le serpent sort du puits',
    'Il fait le tour de l’arbre',
    'Il redescend dans le puits',
    'Serrer le nœud'
  ]
};

function banque(niveau) {
  // Les étapes du nœud de chaise demandent de lire cinq phrases : on ne les
  // propose qu'à partir du moment où la lecture suit.
  if (niveau >= 4 && Math.random() < 0.35) return CHAISE;
  return USAGES[Math.floor(Math.random() * USAGES.length)];
}

const activite = creerActivite({
  id: 'noeuds',
  nom: 'Les nœuds marins',
  ages: [7, 12],
  duree: 80,
  banque,
  resume: (n) => (n >= 4 ? 'usages + étapes du nœud de chaise' : 'à quoi sert chaque nœud')
});

export const { meta, generer, monter, apercu } = activite;
