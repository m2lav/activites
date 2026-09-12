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

   `ctx` contient au minimum { surFin } que l'activité appelle à la fin avec
   { reussites, erreurs }. Le moteur s'occupe du reste.

   Ajouter une activité = créer le module et l'ajouter à CATALOGUE.
   ========================================================================= */

import * as etoiles from './etoiles.js';

export const CATALOGUE = [etoiles];

/** Activités jouables par un enfant de cet âge. */
export function pourAge(age) {
  return CATALOGUE
    .map((m) => m.meta)
    .filter((m) => age >= m.ages[0] && age <= m.ages[1]);
}

export function module(id) {
  return CATALOGUE.find((m) => m.meta.id === id) || null;
}
