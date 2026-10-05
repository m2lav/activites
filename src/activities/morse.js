/* =========================================================================
   Morse — pour Gaspard.

   L'alphabet morse international, qui a l'avantage d'être parfaitement
   vérifiable : aucune approximation possible, contrairement aux signes de
   piste qui attendent encore une validation.

   La progression va des lettres les plus courtes et les plus fréquentes
   (E, T, A, I, M, N) vers l'alphabet complet, et finit par des mots entiers
   à déchiffrer.
   ========================================================================= */

import { creerActivite } from './connaissances.js';

const ALPHABET = {
  A: '·−',    B: '−···',  C: '−·−·',  D: '−··',   E: '·',     F: '··−·',
  G: '−−·',   H: '····',  I: '··',    J: '·−−−',  K: '−·−',   L: '·−··',
  M: '−−',    N: '−·',    O: '−−−',   P: '·−−·',  Q: '−−·−',  R: '·−·',
  S: '···',   T: '−',     U: '··−',   V: '···−',  W: '·−−',   X: '−··−',
  Y: '−·−−',  Z: '−−··'
};

/* Du plus simple au plus long : c'est l'ordre dans lequel on les introduit. */
const PALIERS = [
  'ETIMAN',
  'ETIMANSODU',
  'ETIMANSODURKGW',
  'ETIMANSODURKGWHBFLPV',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
];

const MOTS = ['SOS', 'OUI', 'NON', 'EAU', 'FEU', 'NORD', 'LOUP', 'MER'];

const piocher = (l) => l[Math.floor(Math.random() * l.length)];

function lettresDisponibles(niveau) {
  const i = Math.min(PALIERS.length - 1, Math.floor((niveau - 1) / 2));
  return PALIERS[i].split('');
}

/** Lire un code et retrouver la lettre. */
function dechiffrer(niveau) {
  const lettres = lettresDisponibles(niveau);
  const bonne = piocher(lettres);

  const options = new Set([bonne]);
  while (options.size < 3 && options.size < lettres.length) options.add(piocher(lettres));

  return {
    enonce: 'Quelle lettre se cache derrière ce signal ?',
    illustration: ALPHABET[bonne],
    options: [...options],
    reponse: bonne
  };
}

/** Partir de la lettre et retrouver le code. */
function coder(niveau) {
  const lettres = lettresDisponibles(niveau);
  const bonne = piocher(lettres);

  const options = new Set([ALPHABET[bonne]]);
  while (options.size < 3) {
    const autre = piocher(lettres);
    if (autre !== bonne) options.add(ALPHABET[autre]);
    if (options.size >= lettres.length) break;
  }

  return {
    enonce: `Comment écrit-on la lettre ${bonne} en morse ?`,
    illustration: '📻',
    options: [...options],
    reponse: ALPHABET[bonne]
  };
}

/** Déchiffrer un mot entier, lettre après lettre, en les remettant dans l'ordre. */
function motEntier() {
  const mot = piocher(MOTS);
  return {
    forme: 'ordre',
    enonce: `Remets les signaux dans l’ordre pour écrire ${mot}`,
    illustration: '📡',
    etapes: [...mot].map((l) => `${l}   ${ALPHABET[l]}`)
  };
}

function banque(niveau) {
  if (niveau >= 7 && Math.random() < 0.3) return motEntier();
  return Math.random() < 0.6 ? dechiffrer(niveau) : coder(niveau);
}

const activite = creerActivite({
  id: 'morse',
  nom: 'Le morse',
  ages: [7, 12],
  duree: 80,
  consigne: 'Déchiffre les signaux en points et en traits.',
  banque,
  resume: (n) => `${lettresDisponibles(n).length} lettres${n >= 7 ? ' + mots entiers' : ''}`
});

export const { meta, generer, monter, apercu } = activite;
