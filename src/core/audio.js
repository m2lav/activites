/* =========================================================================
   Audio : effets, voix de synthèse, silence global.

   Contrainte iOS : aucun son ne peut être joué avant une interaction
   tactile. debloquer() DOIT donc être appelé depuis un vrai gestionnaire
   d'événement tactile (c'est le rôle de l'écran de démarrage), sinon Safari
   laisse le contexte audio suspendu sans lever d'erreur.

   Les effets sont synthétisés, pas chargés : zéro fichier à télécharger,
   zéro latence au premier son, et un rendu identique hors ligne.
   Les voix passent par SpeechSynthesis derrière une abstraction, pour
   pouvoir basculer plus tard sur des enregistrements sans toucher aux écrans.
   ========================================================================= */

let ctx = null;
let maitre = null;
let debloque = false;
let actif = true;
let voixFR = null;
let fournisseurVoix = null;   // (texte, options) => Promise, si on passe aux fichiers

const VOLUME = 0.5;

/* ---- Déblocage ------------------------------------------------------- */

export function estDebloque() { return debloque; }

const delai = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * À appeler depuis un vrai geste tactile.
 *
 * Ne rejette jamais et ne bloque jamais : sur iOS, `ctx.resume()` rend
 * parfois une promesse qui ne se résout pas du tout. Si l'appel traîne, on
 * continue sans lui — le son manquera peut-être, mais l'application démarre.
 * C'est la seule chose qui compte à cet instant.
 */
export async function debloquer() {
  if (debloque) return true;
  debloque = true;   // posé d'emblée : un échec ne doit pas bloquer les taps suivants

  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      ctx = new Ctx();
      maitre = ctx.createGain();
      maitre.gain.value = actif ? VOLUME : 0;
      maitre.connect(ctx.destination);

      // Un buffer muet d'un échantillon : le rite de passage attendu par iOS.
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(maitre);
      src.start(0);

      if (ctx.state === 'suspended') {
        await Promise.race([ctx.resume().catch(() => {}), delai(400)]);
      }
    }
  } catch (e) {
    console.warn('Audio indisponible.', e);
  }

  // La synthèse vocale a son propre déblocage, également lié au geste.
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = 'fr-FR';
    speechSynthesis.speak(u);
  } catch { /* ignoré */ }

  try { chargerVoix(); } catch { /* ignoré */ }
  return true;
}

/* ---- Silence global -------------------------------------------------- */

export function estActif() { return actif; }

export function silence(valeur) {
  actif = !valeur;
  if (maitre) maitre.gain.value = actif ? VOLUME : 0;
  if (!actif) { try { speechSynthesis.cancel(); } catch { /* ignoré */ } }
  return actif;
}

/* ---- Effets ---------------------------------------------------------- */

/**
 * Chaque effet est une suite de notes [fréquence Hz, durée s, forme].
 * Aucun son n'est punitif : « presque » descend doucement, il ne claque pas.
 */
const EFFETS = {
  tap:        [[660, 0.05, 'sine', 0.35]],
  touche:     [[440, 0.04, 'triangle', 0.3]],
  juste:      [[523.25, 0.09, 'sine', 0.4], [783.99, 0.16, 'sine', 0.4]],
  presque:    [[392, 0.11, 'sine', 0.3], [329.63, 0.18, 'sine', 0.28]],
  recompense: [[523.25, 0.1, 'triangle', 0.4], [659.25, 0.1, 'triangle', 0.4],
               [783.99, 0.1, 'triangle', 0.4], [1046.5, 0.32, 'triangle', 0.42]],
  tic:        [[1200, 0.015, 'square', 0.12]],
  transition: [[294, 0.06, 'sine', 0.18], [392, 0.09, 'sine', 0.16]]
};

export function son(nom) {
  if (!actif || !ctx || !maitre) return;
  const suite = EFFETS[nom];
  if (!suite) return;

  let t = ctx.currentTime;
  for (const [freq, duree, forme, gain] of suite) {
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = forme;
    osc.frequency.setValueAtTime(freq, t);

    // Attaque courte puis extinction exponentielle : pas de clic en fin de note.
    vol.gain.setValueAtTime(0.0001, t);
    vol.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + duree);

    osc.connect(vol); vol.connect(maitre);
    osc.start(t);
    osc.stop(t + duree + 0.02);
    t += duree * 0.8;
  }
}

/* ---- Voix ------------------------------------------------------------ */

function chargerVoix() {
  const prendre = () => {
    const toutes = speechSynthesis.getVoices?.() || [];
    const fr = toutes.filter((v) => (v.lang || '').toLowerCase().startsWith('fr'));
    if (!fr.length) return;
    // Voix Apple fr-FR les plus naturelles, par ordre de préférence.
    const preferees = ['Aurélie', 'Audrey', 'Amélie', 'Thomas'];
    voixFR = fr.find((v) => preferees.some((p) => v.name.includes(p)))
          || fr.find((v) => v.localService)
          || fr[0];
  };
  prendre();
  if (!voixFR) speechSynthesis.addEventListener?.('voiceschanged', prendre, { once: true });
}

export function voixDisponible() { return voixFR; }

/** Permet de remplacer la synthèse par des fichiers enregistrés, plus tard. */
export function definirFournisseurVoix(fn) { fournisseurVoix = fn; }

/**
 * Lit une consigne à voix haute. Indispensable pour Térence, qui ne lit pas.
 * Résout quand la lecture est terminée (ou tout de suite si le son est coupé).
 */
export function parler(texte, { debit = 0.92, hauteur = 1.05, cle = null } = {}) {
  if (!actif || !texte) return Promise.resolve();
  if (fournisseurVoix) return fournisseurVoix(texte, { cle });

  return new Promise((fini) => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texte);
      u.lang = 'fr-FR';
      u.rate = debit;
      u.pitch = hauteur;
      if (voixFR) u.voice = voixFR;
      u.onend = () => fini();
      u.onerror = () => fini();
      speechSynthesis.speak(u);
      // Filet : iOS oublie parfois onend si l'app passe en arrière-plan.
      setTimeout(fini, Math.min(15000, 1200 + texte.length * 90));
    } catch {
      fini();
    }
  });
}

export function taire() {
  try { speechSynthesis.cancel(); } catch { /* ignoré */ }
}
