/* =========================================================================
   Point d'entrée.
   Enregistre les écrans, prépare le stockage, neutralise les gestes iOS
   indésirables, puis affiche l'écran de démarrage.
   ========================================================================= */

import * as store from './core/store.js';
import * as audio from './core/audio.js';
import * as univers from './core/univers.js';
import { enregistrer, aller } from './core/router.js';
import { installerRapport, signaler } from './ui/erreur.js';

import { creer as creerDemarrage } from './screens/demarrage.js';
import { creer as creerConfiguration } from './screens/configuration.js';
import { creer as creerAccueil } from './screens/accueil.js';
import { creer as creerDuree } from './screens/duree.js';
import { creer as creerSeance } from './screens/seance.js';
import { creer as creerFinSeance } from './screens/fin-seance.js';
import { creer as creerParent } from './screens/parent.js';
import { creer as creerDiagnostic } from './screens/diagnostic.js';

enregistrer('demarrage', creerDemarrage);
enregistrer('configuration', creerConfiguration);
enregistrer('accueil', creerAccueil);
enregistrer('duree', creerDuree);
enregistrer('seance', creerSeance);
enregistrer('fin-seance', creerFinSeance);
enregistrer('parent', creerParent);
enregistrer('diagnostic', creerDiagnostic);

// Avant tout le reste : sur iPad il n'y a pas de console, une erreur non
// rapportée se traduit par un écran figé et rien d'autre.
installerRapport();

neutraliserGestesIOS();

(async function demarrer() {
  try {
    await store.amorcer();
    audio.silence(!(await store.reglage('son_actif')));
  } catch (e) {
    // Une base indisponible (mode privé, quota) ne doit pas empêcher de jouer.
    console.error('Stockage indisponible, session non enregistrée.', e);
  }

  try {
    await univers.appliquer('mer');
    await aller('demarrage');
  } catch (e) {
    signaler(e);
  }

  enregistrerServiceWorker();
})();

/* ---------------------------------------------------------------------- */

function neutraliserGestesIOS() {
  // Pincer pour zoomer : non couvert par touch-action sur Safari.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }

  // Double tap rapide = zoom résiduel sur certaines versions d'iPadOS.
  let dernier = 0;
  document.addEventListener('touchend', (e) => {
    const t = Date.now();
    if (t - dernier < 320) e.preventDefault();
    dernier = t;
  }, { passive: false });

  // Menu d'appui long, hors zones explicitement sélectionnables.
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest?.('.selectionnable')) e.preventDefault();
  });

  // Couper la voix quand l'app passe en arrière-plan.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.taire();
  });
}

function enregistrerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Chemin relatif : l'app fonctionne aussi bien à la racine que dans un
  // sous-dossier GitHub Pages.
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .catch((e) => console.warn('Service worker non enregistré.', e));
}
