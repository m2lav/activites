/* =========================================================================
   Univers graphiques et ambiances.

   Deux axes indépendants :

   - **L'univers** (pompiers, château, dinosaures, mer, louveteaux) est choisi
     par l'enfant. Il porte le décor, la typographie, les arrondis.
   - **L'ambiance** (nuit, jour, papier) est un réglage global de l'app. Elle
     décide si l'on travaille sur fond sombre, sur fond clair, ou sur un fond
     papier. Chaque univers fournit ses trois déclinaisons.

   Un univers = un dossier assets/univers/<id>/ avec un manifest.json.
   Ajouter un univers, c'est ajouter un dossier et une ligne ici — jamais
   toucher aux écrans. Ajouter une ambiance, c'est ajouter une entrée dans
   chaque manifeste.
   ========================================================================= */

export const UNIVERS = ['pompiers', 'police', 'chateau', 'dinosaures', 'mer', 'louveteaux'];

export const AMBIANCES = [
  { id: 'nuit', nom: 'Nuit', description: 'Fonds profonds, couleurs vives. Doux le soir.' },
  { id: 'jour', nom: 'Jour', description: 'Fonds clairs et aplats francs, comme la planche d’ambiance.' },
  { id: 'papier', nom: 'Papier', description: 'Teintes crème et encre, esprit cahier de vacances.' }
];

const cache = new Map();
let actif = null;
let ambiance = 'nuit';

export function universActif() { return actif; }
export function ambianceActive() { return ambiance; }

export async function manifeste(id) {
  if (cache.has(id)) return cache.get(id);
  const rep = await fetch(`./assets/univers/${id}/manifest.json`);
  if (!rep.ok) throw new Error(`Univers introuvable : ${id}`);
  const m = await rep.json();
  cache.set(id, m);
  return m;
}

export async function tousLesManifestes() {
  return Promise.all(UNIVERS.map((id) => manifeste(id).catch(() => null)))
    .then((l) => l.filter(Boolean));
}

/**
 * Palette d'un manifeste pour une ambiance donnée.
 * Tolère les anciens manifestes à palette unique, pour qu'une sauvegarde ou
 * un univers ajouté à la main ne casse rien.
 */
export function palette(m, a = ambiance) {
  return m?.ambiances?.[a] || m?.ambiances?.nuit || m?.palette || {};
}

/** Applique la palette et la typographie à toute l'interface. */
export async function appliquer(id = actif, a = ambiance) {
  ambiance = a;
  if (!id) return null;

  let m;
  try {
    m = await manifeste(id);
  } catch (e) {
    console.warn('Univers non appliqué, palette de repli conservée.', e);
    return null;
  }

  const r = document.documentElement.style;
  const p = palette(m, a);
  for (const [cle, valeur] of Object.entries(p)) r.setProperty(`--u-${cle}`, valeur);

  if (m.police?.titre) r.setProperty('--u-police-titre', m.police.titre);
  if (m.police?.texte) r.setProperty('--u-police-texte', m.police.texte);
  if (m.rayon) r.setProperty('--u-rayon', m.rayon);

  // Sur fond clair, la barre d'état iOS doit passer en texte sombre.
  document.documentElement.dataset.ambiance = a;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && p.fond) meta.setAttribute('content', p.fond);

  actif = id;
  return m;
}

/** Change d'ambiance sans changer d'univers. Effet immédiat. */
export function definirAmbiance(a) {
  return appliquer(actif, a);
}
