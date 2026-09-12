/* =========================================================================
   Univers graphiques.

   Un univers = un dossier assets/univers/<id>/ avec un manifest.json.
   Le code ne connaît que la liste des identifiants : ajouter un univers,
   c'est ajouter un dossier et une ligne ici, jamais toucher aux écrans.

   Le manifeste décrit palette, polices, arrondis, sprites et sons. Les
   couleurs sont posées comme variables CSS --u-* sur :root ; comme les
   éléments animent déjà leurs couleurs, le changement d'univers se fait en
   fondu sans recharger quoi que ce soit.
   ========================================================================= */

export const UNIVERS = ['pompiers', 'chateau', 'dinosaures', 'mer', 'louveteaux'];

const cache = new Map();
let actif = null;

export function universActif() { return actif; }

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

/** Applique la palette et la typographie d'un univers à toute l'interface. */
export async function appliquer(id) {
  let m;
  try {
    m = await manifeste(id);
  } catch (e) {
    console.warn('Univers non appliqué, palette de repli conservée.', e);
    return null;
  }

  const r = document.documentElement.style;
  for (const [cle, valeur] of Object.entries(m.palette || {})) {
    r.setProperty(`--u-${cle}`, valeur);
  }
  if (m.police?.titre) r.setProperty('--u-police-titre', m.police.titre);
  if (m.police?.texte) r.setProperty('--u-police-texte', m.police.texte);
  if (m.rayon) r.setProperty('--u-rayon', m.rayon);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && m.palette?.fond) meta.setAttribute('content', m.palette.fond);

  actif = id;
  return m;
}
