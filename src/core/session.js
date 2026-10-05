/* =========================================================================
   Moteur de séance.

   Il compose l'enchaînement des activités à partir du catalogue, du temps
   restant et de l'âge de l'enfant. Deux règles tiennent tout le reste :

   1. On alterne effort et détente. Une séance n'est pas un examen.
   2. **On ne coupe jamais au milieu d'une activité.** Le temps imparti n'est
      consulté qu'entre deux activités : quand il est écoulé, l'activité en
      cours va à son terme, puis la séance s'achève. C'est pour cela que la
      vérification vit ici et nulle part ailleurs.
   ========================================================================= */

import * as store from './store.js';
import { pourAge } from '../activities/index.js';

/** Durée d'une activité en mode test : juste assez pour la juger. */
const DUREE_TEST = 22_000;

/** Durée visée d'une activité, et temps du carton de consigne. */
const DUREE_CIBLE = 75_000;
const ANNONCE = 2_200;

export function creerSeance({ profil, niveaux, dureeMinutes, mode = 'normal' }) {
  const test = mode === 'test';
  const dureeMs = dureeMinutes * 60_000;
  const debut = Date.now();
  const resultats = [];
  let derniere = null;
  let indexTest = 0;

  /*
     La séance se compte en ACTIVITÉS, pas en minutes.

     Un enfant ne sait pas ce que vaut une minute ; il sait compter « encore
     trois jeux ». On découpe donc le temps demandé en un nombre entier
     d'activités, et c'est ce nombre que le sablier affiche — une case par
     activité. Chaque case vaut le temps d'une activité, pas une minute.
  */
  const nombreActivites = Math.max(3, Math.round(dureeMs / (DUREE_CIBLE + ANNONCE)));
  const budgetActivite = Math.max(35_000, Math.round(dureeMs / nombreActivites) - ANNONCE);
  let indice = -1;
  // Dernière activité vue dans chaque catégorie. Mémoriser seulement la
  // précédente ne sert à rien : comme on alterne, elle est toujours de
  // l'autre catégorie, donc jamais candidate.
  const dernieresParCategorie = { effort: null, detente: null };

  const ecoule = () => Date.now() - debut;
  const restant = () => Math.max(0, dureeMs - ecoule());

  /**
   * Activité suivante, ou null quand la séance est terminée.
   *
   * On s'arrête sur un COMPTE d'activités, plus sur l'horloge. Le temps
   * demandé a déjà servi à fixer ce compte ; le consulter à nouveau ici
   * rouvrirait la porte aux fins de séance arbitraires au milieu de rien.
   */
  function prochaine() {
    // Mode test : on parcourt le catalogue dans l'ordre, une fois chacune.
    // Le but n'est pas de jouer une séance mais de voir défiler les activités.
    if (test) {
      const jouables = pourAge(profil.age);
      const meta = jouables[indexTest++] || null;
      if (meta) { indice++; derniere = meta; dernieresParCategorie[meta.categorie] = meta.id; }
      return meta;
    }

    if (indice + 1 >= nombreActivites) return null;

    const jouables = pourAge(profil.age);
    if (!jouables.length) return null;

    // On vise la catégorie opposée à la précédente, puis on se rabat.
    const voulue = derniere?.categorie === 'effort' ? 'detente' : 'effort';
    const evitee = dernieresParCategorie[voulue];

    const paliers = [
      jouables.filter((m) => m.categorie === voulue && m.id !== evitee),
      jouables.filter((m) => m.categorie === voulue),
      jouables.filter((m) => m.id !== derniere?.id),
      jouables
    ];
    const choix = paliers.find((p) => p.length);
    const meta = choix[Math.floor(Math.random() * choix.length)];

    indice++;
    derniere = meta;
    dernieresParCategorie[meta.categorie] = meta.id;
    return meta;
  }

  function niveauDe(meta) {
    return niveaux?.[meta.type] ?? 5;
  }

  function niveauDuType(type) {
    return niveaux?.[type] ?? 5;
  }

  /**
   * Budget d'une activité, en millisecondes. Identique pour toutes : c'est ce
   * qui permet à une case du sablier de valoir exactement une activité.
   *
   * Ce budget est une échéance douce, pas un couperet — voir
   * activities/minuterie.js : l'activité s'arrête au point de rupture suivant.
   */
  function dureeActivite() {
    return test ? DUREE_TEST : budgetActivite;
  }

  /**
   * Change un niveau pendant la séance (roue de réglage).
   * La valeur est écrite en base tout de suite : si l'app est fermée juste
   * après, le réglage est conservé pour la prochaine fois.
   */
  async function definirNiveau(type, valeur) {
    const v = Math.min(10, Math.max(1, Math.round(valeur)));
    if (niveaux) niveaux[type] = v;
    await store.definirNiveau(profil.id, type, v).catch(() => {});
    return v;
  }

  function enregistrer(meta, { reussites = 0, erreurs = 0, temps = 0 }) {
    resultats.push({
      id: meta.id,
      nom: meta.nom,
      type: meta.type,
      niveau: niveauDe(meta),
      reussites, erreurs, temps
    });
  }

  /** Matière première de l'écran de fin. Jamais présenté comme une note. */
  function bilan() {
    const reussites = resultats.reduce((s, r) => s + r.reussites, 0);
    const erreurs = resultats.reduce((s, r) => s + r.erreurs, 0);
    return {
      profil,
      duree_prevue: dureeMinutes,
      duree_reelle: Math.round(ecoule() / 1000),
      activites: resultats,
      reussites,
      erreurs,
      nombre: resultats.length
    };
  }

  async function sauvegarder() {
    const b = bilan();
    // Une séance de test ne doit pas polluer le suivi de l'enfant.
    if (test) return b;
    try {
      await store.enregistrerSession({
        profil_id: profil.id,
        duree_prevue: b.duree_prevue,
        duree_reelle: b.duree_reelle,
        activites: b.activites
      });
    } catch (e) {
      // Une séance non enregistrée ne doit jamais gâcher la fin de séance.
      console.warn('Séance non enregistrée.', e);
    }
    return b;
  }

  return {
    profil, dureeMs, dureeMinutes, nombreActivites, test,
    indice: () => Math.max(0, indice),
    ecoule, restant, prochaine, dureeActivite,
    niveauDe, niveauDuType, definirNiveau,
    enregistrer, bilan, sauvegarder
  };
}

/** Charge les sept niveaux de difficulté d'un enfant en une fois. */
export async function niveauxDe(profilId) {
  const d = (await store.difficultes(profilId)) || {};
  const n = {};
  for (const t of store.TYPES_ACTIVITE) n[t] = d[t] ?? 5;
  return n;
}
