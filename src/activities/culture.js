/* =========================================================================
   Culture — repères d'histoire, pour Gaspard.

   Des repères chronologiques simples et des questions dont la réponse ne
   prête pas à discussion. Le niveau règle la difficulté du repère, pas la
   longueur de la question : un enfant de huit ans lit vite, il bute sur le
   contenu, pas sur le nombre de mots.
   ========================================================================= */

import { creerActivite } from './connaissances.js';

const FACILES = [
  {
    enonce: 'Qui vivait dans les châteaux forts ?',
    illustration: '🏰',
    options: ['Les chevaliers', 'Les Gaulois', 'Les hommes préhistoriques'],
    reponse: 'Les chevaliers'
  },
  {
    enonce: 'Où vivaient les hommes de la préhistoire ?',
    illustration: '🔥',
    options: ['Dans des grottes', 'Dans des châteaux', 'Dans des immeubles'],
    reponse: 'Dans des grottes'
  },
  {
    enonce: 'Vercingétorix était un chef…',
    illustration: '⚔️',
    options: ['Gaulois', 'Romain', 'Égyptien'],
    reponse: 'Gaulois'
  },
  {
    enonce: 'Qui a fait construire le château de Versailles ?',
    illustration: '👑',
    options: ['Louis XIV', 'Napoléon', 'Charlemagne'],
    reponse: 'Louis XIV',
    explication: 'On l’appelait le Roi-Soleil.'
  },
  {
    enonce: 'Les pyramides d’Égypte ont été construites par…',
    illustration: '🔺',
    options: ['Les Égyptiens', 'Les Romains', 'Les Vikings'],
    reponse: 'Les Égyptiens'
  }
];

const MOYENNES = [
  {
    enonce: 'En quelle année a eu lieu la Révolution française ?',
    illustration: '🇫🇷',
    options: ['1789', '1515', '1914'],
    reponse: '1789'
  },
  {
    enonce: 'Qui a traversé l’Atlantique et atteint l’Amérique en 1492 ?',
    illustration: '⛵',
    options: ['Christophe Colomb', 'Jules César', 'Louis XIV'],
    reponse: 'Christophe Colomb'
  },
  {
    enonce: 'Quel empereur français a été vaincu à Waterloo ?',
    illustration: '🎩',
    options: ['Napoléon', 'Charlemagne', 'Clovis'],
    reponse: 'Napoléon'
  },
  {
    enonce: 'Les Gaulois vivaient-ils avant ou après les chevaliers ?',
    illustration: '🛡️',
    options: ['Avant', 'Après', 'En même temps'],
    reponse: 'Avant'
  },
  {
    enonce: 'Charlemagne a été couronné empereur en…',
    illustration: '👑',
    options: ['800', '1515', '1789'],
    reponse: '800'
  }
];

const CHRONOLOGIE = {
  forme: 'ordre',
  enonce: 'Remets les grandes périodes dans l’ordre',
  illustration: '⏳',
  etapes: ['La Préhistoire', 'L’Antiquité', 'Le Moyen Âge',
    'Les Temps modernes', 'L’époque contemporaine']
};

function banque(niveau) {
  if (niveau >= 6 && Math.random() < 0.3) return CHRONOLOGIE;
  const liste = niveau <= 4 ? FACILES : (Math.random() < 0.35 ? FACILES : MOYENNES);
  return liste[Math.floor(Math.random() * liste.length)];
}

const activite = creerActivite({
  id: 'culture',
  nom: 'Repères d’histoire',
  ages: [7, 12],
  duree: 80,
  banque,
  resume: (n) => (n <= 4 ? 'repères simples' : n >= 6 ? 'dates et chronologie' : 'dates')
});

export const { meta, generer, monter, apercu } = activite;
