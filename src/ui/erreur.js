/* =========================================================================
   Rapport d'erreur visible à l'écran.

   Sur un iPad il n'y a pas de console : une erreur JavaScript ne se voit
   nulle part, l'écran reste simplement figé. Ce bandeau affiche le problème
   sur l'appareil lui-même, avec la version de Safari, pour pouvoir dire ce
   qui s'est passé sans brancher la tablette à un Mac.
   ========================================================================= */

let bandeau = null;

export function contexte() {
  const standalone = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  return [
    `${window.innerWidth}×${window.innerHeight}`,
    standalone ? 'installée' : 'navigateur',
    navigator.userAgent.match(/(?:iPhone )?OS [\d_]+/)?.[0]?.replace(/_/g, '.') ?? navigator.platform
  ].join(' · ');
}

export function signaler(quoi) {
  const texte = quoi instanceof Error
    ? `${quoi.message}\n${(quoi.stack || '').split('\n')[1] || ''}`
    : String(quoi);

  if (!bandeau) {
    bandeau = document.createElement('div');
    bandeau.className = 'rapport selectionnable';
    bandeau.addEventListener('pointerdown', (e) => { e.stopPropagation(); bandeau.remove(); bandeau = null; });
    document.body.appendChild(bandeau);
  }
  bandeau.textContent = `${texte}\n— ${contexte()} — toucher pour fermer`;
  return texte;
}

/** À appeler une fois au démarrage : plus rien ne passe inaperçu. */
export function installerRapport() {
  window.addEventListener('error', (e) => signaler(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => signaler(e.reason));
}
