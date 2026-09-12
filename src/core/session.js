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

export function creerSeance({ profil, niveaux, dureeMinutes, mode = 'normal' }) {
  const test = mode === 'test';
  const dureeMs = dureeMinutes * 60_000;
  const debut = Date.now();
  const resultats = [];
  let derniere = null;
  let indexTest = 0;
  // Dernière activité vue dans chaque catégorie. Mémoriser seulement la
  // précédente ne sert à rien : comme on alterne, elle est toujours de
  // l'autre catégorie, donc jamais candidate.
  const dernieresParCategorie = { effort: null, detente: null };

  const ecoule = () => Date.now() - debut;
  const restant = () => Math.max(0, dureeMs - ecoule());

  /**
   * Part du temps d'une activité qui doit encore tenir dans la séance pour
   * qu'on la lance. En dessous, mieux vaut conclure : dépasser de quelques
   * secondes est normal, lancer une activité de 50 s pour 5 s restantes ne
   * l'est pas.
   */
  const MARGE = 0.4;

  /**
   * Activité suivante, ou null quand il n'y a plus lieu d'en lancer une.
   * Appelée uniquement entre deux activités : c'est là toute la règle n°2.
   */
  function prochaine() {
    // Mode test : on parcourt le catalogue dans l'ordre, une fois chacune,
    // sans tenir compte de l'horloge. Le but n'est pas de jouer une séance
    // mais de voir défiler toutes les activités.
    if (test) {
      const jouables = pourAge(profil.age);
      const meta = jouables[indexTest++] || null;
      if (meta) { derniere = meta; dernieresParCategorie[meta.categorie] = meta.id; }
      return meta;
    }

    if (restant() <= 0) return null;

    const jouables = pourAge(profil.age)
      .filter((m) => restant() >= m.duree * 1000 * MARGE);
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
   * Durée allouée à une activité, en millisecondes.
   * C'est la séance qui décide, pas l'activité : sans ce point unique, on ne
   * peut ni raccourcir pour un test, ni adapter plus tard à l'enfant.
   */
  function dureeActivite(meta) {
    return test ? DUREE_TEST : meta.duree * 1000;
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
    profil, dureeMs, dureeMinutes,
    ecoule, restant, prochaine, dureeActivite, test,
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
