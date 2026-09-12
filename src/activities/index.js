/* =========================================================================
   Registre des activités.

   Chaque activité expose le même contrat — c'est lui qui permet au moteur de
   séance de composer un enchaînement sans rien savoir du contenu :

     export const meta = {
       id,          // identifiant stable, sert de clé en base
       nom,         // libellé affiché
       type,        // axe de difficulté : calcul_mental, adresse, memoire…
       categorie,   // 'effort' | 'detente'  → pilote l'alternance
       ages,        // [min, max] inclus
       duree        // durée visée en secondes
     };

     export function generer(niveau)                  // 1-10 → un exercice
     export function monter(conteneur, exercice, ctx) // → fonction de démontage
     export function apercu(niveau)                   // facultatif : un exemple

   `ctx` contient :
     surFin({reussites, erreurs})  à appeler quand l'activité se termine
     niveau()                      le niveau courant, relu à chaque question —
                                   c'est ce qui permet à la roue de réglage de
                                   prendre effet sans quitter la séance
     profil                        l'enfant en cours

   Une activité qui enchaîne plusieurs questions ne les tire donc pas dans
   `generer` : elle les produit une par une avec `ctx.niveau()`.

   `apercu(niveau)` sert à la roue de réglage : elle montre à quoi ressemble
   un niveau avant de l'appliquer.

   Ajouter une activité = créer le module et l'ajouter à CATALOGUE.
   ========================================================================= */

import * as etoiles from './etoiles.js';
import * as labyrinthe from './labyrinthe.js';
import * as memoire from './memoire.js';
import * as suites from './suites.js';
import * as quantites from './quantites.js';
import * as calculMental from './calcul-mental.js';
import * as lecture from './lecture.js';
import * as tri from './tri.js';
import * as noeuds from './noeuds.js';
import * as culture from './culture.js';

export const CATALOGUE = [
  calculMental, lecture, suites, memoire, quantites, tri, noeuds, culture,
  labyrinthe, etoiles
];

/** Activités jouables par un enfant de cet âge. */
export function pourAge(age) {
  return CATALOGUE
    .map((m) => m.meta)
    .filter((m) => age >= m.ages[0] && age <= m.ages[1]);
}

export function module(id) {
  return CATALOGUE.find((m) => m.meta.id === id) || null;
}
