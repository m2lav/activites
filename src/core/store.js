/* =========================================================================
   Stockage local (IndexedDB).

   Rien ne sort de l'appareil. IndexedDB plutôt que localStorage parce qu'il
   encaisse l'historique des sessions sans limite pratique et qu'il survit
   mieux en mode standalone. Le filet de sécurité reste l'export JSON manuel
   (exporterJSON / importerJSON), car tout est effacé si l'app est retirée
   de l'écran d'accueil.
   ========================================================================= */

const NOM_BASE = 'activites-enfants';
const VERSION_BASE = 1;

/** Les sept axes de difficulté. Un niveau 1-10 par enfant ET par axe. */
export const TYPES_ACTIVITE = [
  'calcul_mental', 'lecture', 'logique', 'labyrinthe', 'memoire', 'adresse', 'culture'
];

/*
   Aucun prénom n'est écrit ici, volontairement.
   Le code est publié sur un dépôt public : les enfants sont saisis une seule
   fois sur l'iPad, à la première ouverture, et ne quittent jamais l'appareil.
*/

/** Couleurs attribuées aux profils dans l'ordre de création. */
export const COULEURS_PROFIL = [
  '#e4572e', '#d6a2c8', '#3fa34d', '#1c7ed6', '#e3b505', '#9b5de5'
];

/**
 * Niveau de départ déduit de l'âge : 4 ans → 2, 6 ans → 3, 8 ans → 5.
 * Plancher à 2, jamais 1 : on peut toujours descendre à la main en cours de
 * jeu, alors qu'un premier exercice trop facile donne le sentiment d'un jouet.
 */
export function niveauInitial(age) {
  return Math.min(10, Math.max(2, Math.round(age) - 3));
}

export const REGLAGES_PAR_DEFAUT = {
  son_actif: true,
  musique_active: true,
  code_parent: '1234',        // à changer depuis l'espace parent (lot 2)
  duree_par_defaut: 10,       // minutes
  ambiance: 'nuit'            // nuit | jour | papier — voir core/univers.js
};

let _db = null;

function promesse(requete) {
  return new Promise((ok, ko) => {
    requete.onsuccess = () => ok(requete.result);
    requete.onerror = () => ko(requete.error);
  });
}

export function ouvrir() {
  if (_db) return Promise.resolve(_db);
  return new Promise((ok, ko) => {
    const r = indexedDB.open(NOM_BASE, VERSION_BASE);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('profils')) {
        db.createObjectStore('profils', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('difficulte')) {
        db.createObjectStore('difficulte', { keyPath: 'profil_id' });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const s = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        s.createIndex('par_profil', 'profil_id');
        s.createIndex('par_date', 'date');
      }
      if (!db.objectStoreNames.contains('reglages')) {
        db.createObjectStore('reglages', { keyPath: 'cle' });
      }
    };
    r.onsuccess = () => { _db = r.result; ok(_db); };
    r.onerror = () => ko(r.error);
  });
}

async function magasin(nom, mode = 'readonly') {
  const db = await ouvrir();
  return db.transaction(nom, mode).objectStore(nom);
}

export async function lire(nom, cle)      { return promesse((await magasin(nom)).get(cle)); }
export async function lireTout(nom)       { return promesse((await magasin(nom)).getAll()); }
export async function ecrire(nom, valeur) { return promesse((await magasin(nom, 'readwrite')).put(valeur)); }
export async function vider(nom)          { return promesse((await magasin(nom, 'readwrite')).clear()); }

/* ---- Profils --------------------------------------------------------- */

export function profils() { return lireTout('profils'); }
export function profil(id) { return lire('profils', id); }

/* ---- Difficulté ------------------------------------------------------ */

/** Niveau 1-10 de cet enfant pour ce type d'activité. */
export async function niveau(profilId, type) {
  const d = await lire('difficulte', profilId);
  return d?.[type] ?? 5;
}

/** Applique un nouveau niveau. Prend effet à l'exercice suivant. */
export async function definirNiveau(profilId, type, valeur) {
  const d = (await lire('difficulte', profilId)) || { profil_id: profilId };
  d[type] = Math.min(10, Math.max(1, Math.round(valeur)));
  await ecrire('difficulte', d);
  return d[type];
}

export function difficultes(profilId) { return lire('difficulte', profilId); }

/* ---- Sessions -------------------------------------------------------- */

export function enregistrerSession(session) {
  return ecrire('sessions', { date: new Date().toISOString(), ...session });
}

export async function sessionsDe(profilId) {
  const st = await magasin('sessions');
  return promesse(st.index('par_profil').getAll(profilId));
}

/* ---- Réglages -------------------------------------------------------- */

export async function reglage(cle) {
  const r = await lire('reglages', cle);
  return r ? r.valeur : REGLAGES_PAR_DEFAUT[cle];
}

export function definirReglage(cle, valeur) {
  return ecrire('reglages', { cle, valeur });
}

/* ---- Amorçage -------------------------------------------------------- */

/** Pose les réglages par défaut. Ne crée aucun profil : c'est l'écran de
    première configuration qui s'en charge, sur l'appareil. */
export async function amorcer() {
  for (const [cle, valeur] of Object.entries(REGLAGES_PAR_DEFAUT)) {
    if ((await lire('reglages', cle)) == null) {
      await ecrire('reglages', { cle, valeur });
    }
  }
}

/** Vrai dès qu'au moins un enfant est enregistré sur cet appareil. */
export async function estConfigure() {
  return (await profils()).length > 0;
}

function identifiant(prenom, pris) {
  const base = prenom.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'enfant';
  let id = base, n = 2;
  while (pris.has(id)) id = `${base}-${n++}`;
  pris.add(id);
  return id;
}

/**
 * Enregistre les enfants saisis à la première ouverture.
 * @param {{prenom:string, age:number, univers:string}[]} enfants
 */
export async function creerProfils(enfants) {
  const pris = new Set((await profils()).map((p) => p.id));

  for (const [i, e] of enfants.entries()) {
    const id = identifiant(e.prenom, pris);
    await ecrire('profils', {
      id,
      prenom: e.prenom.trim(),
      age: e.age,
      couleur: COULEURS_PROFIL[i % COULEURS_PROFIL.length],
      univers_debloques: ['mer', e.univers].filter((u, j, l) => l.indexOf(u) === j),
      univers_prefere: e.univers
    });

    const d = { profil_id: id };
    for (const t of TYPES_ACTIVITE) d[t] = niveauInitial(e.age);
    await ecrire('difficulte', d);
  }
  return profils();
}

/* ---- Sauvegarde manuelle --------------------------------------------- */

export async function exporterJSON() {
  const donnees = {
    format: 'activites-enfants',
    version: 1,
    exporte_le: new Date().toISOString(),
    profils: await lireTout('profils'),
    difficulte: await lireTout('difficulte'),
    sessions: await lireTout('sessions'),
    reglages: await lireTout('reglages')
  };
  return JSON.stringify(donnees, null, 2);
}

/**
 * Remplace intégralement le contenu local par une sauvegarde.
 * Refuse tout ce qui ne porte pas la signature du format, pour éviter
 * d'écraser les données avec un fichier collé par erreur.
 */
export async function importerJSON(texte) {
  const d = typeof texte === 'string' ? JSON.parse(texte) : texte;
  if (d?.format !== 'activites-enfants') {
    throw new Error("Ce fichier n'est pas une sauvegarde de l'application.");
  }
  for (const nom of ['profils', 'difficulte', 'sessions', 'reglages']) {
    await vider(nom);
    for (const item of d[nom] || []) await ecrire(nom, item);
  }
  return true;
}
