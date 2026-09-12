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

export function creerSeance({ profil, niveaux, dureeMinutes }) {
  const dureeMs = dureeMinutes * 60_000;
  const debut = Date.now();
  const resultats = [];
  let derniere = null;

  const ecoule = () => Date.now() - debut;
  const restant = () => Math.max(0, dureeMs - ecoule());

  /**
   * Activité suivante, ou null si le temps est écoulé.
   * Appelé uniquement entre deux activités : c'est là toute la règle n°2.
   */
  /**
   * Part du temps d'une activité qui doit encore tenir dans la séance pour
   * qu'on la lance. En dessous, mieux vaut conclure : dépasser de quelques
   * secondes est normal, lancer une activité de 50 s pour 5 s restantes ne
   * l'est pas.
   */
  const MARGE = 0.4;

  function prochaine() {
    if (restant() <= 0) return null;

    const jouables = pourAge(profil.age)
      .filter((m) => restant() >= m.duree * 1000 * MARGE);
    if (!jouables.length) return null;

    // On vise la catégorie opposée à la précédente, puis on se rabat.
    const voulue = derniere?.categorie === 'effort' ? 'detente' : 'effort';
    const paliers = [
      jouables.filter((m) => m.categorie === voulue && m.id !== derniere?.id),
      jouables.filter((m) => m.categorie === voulue),
      jouables.filter((m) => m.id !== derniere?.id),
      jouables
    ];
    const choix = paliers.find((p) => p.length);
    const meta = choix[Math.floor(Math.random() * choix.length)];

    derniere = meta;
    return meta;
  }

  function niveauDe(meta) {
    return niveaux?.[meta.type] ?? 5;
  }

  function niveauDuType(type) {
    return niveaux?.[type] ?? 5;
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
    profil, dureeMs, dureeMinutes,
    ecoule, restant, prochaine,
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
