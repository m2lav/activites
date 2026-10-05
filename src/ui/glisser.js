/* =========================================================================
   Glisser-déposer tactile.

   Base commune au tangram et à l'encastrement, et à tout ce qui se déplacera
   au doigt par la suite.

   Trois exigences, toutes dictées par l'âge des joueurs :

   - **La pièce suit le doigt exactement**, sans décalage ni inertie. Un
     enfant de quatre ans ne corrige pas une trajectoire ; si ça ne colle pas
     au doigt, il lâche.
   - **Elle ne disparaît jamais.** Déposée au mauvais endroit, elle revient à
     sa place en glissant — on ne perd pas une pièce parce qu'on a visé de
     travers.
   - **L'aimantation est généreuse.** On vise au centimètre près, pas au
     pixel : c'est l'emplacement le plus proche qui gagne, dans un rayon
     large.

   `pointer capture` plutôt que des écouteurs sur le document : le doigt peut
   sortir de la pièce sans que le glissement se perde.
   ========================================================================= */

export function rendreDeplacable(piece, { surDepot, surPrise, surDepose } = {}) {
  piece.style.touchAction = 'none';
  piece.style.cursor = 'grab';

  let actif = false;
  let departX = 0, departY = 0;
  let decalageX = 0, decalageY = 0;

  const position = () => {
    const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(piece.style.transform || '');
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
  };

  const placer = (x, y) => { piece.style.transform = `translate(${x}px, ${y}px)`; };

  piece.addEventListener('pointerdown', (e) => {
    if (piece.dataset.verrouille === 'oui') return;
    actif = true;
    piece.setPointerCapture(e.pointerId);

    const p = position();
    decalageX = p.x; decalageY = p.y;
    departX = e.clientX; departY = e.clientY;

    piece.style.zIndex = '30';
    piece.style.cursor = 'grabbing';
    piece.style.transition = 'none';
    piece.style.filter = 'drop-shadow(0 10px 18px rgba(0,0,0,.45))';
    surPrise?.();
    e.preventDefault();
  });

  piece.addEventListener('pointermove', (e) => {
    if (!actif) return;
    placer(decalageX + e.clientX - departX, decalageY + e.clientY - departY);
  });

  const relacher = (e) => {
    if (!actif) return;
    actif = false;
    try { piece.releasePointerCapture(e.pointerId); } catch { /* ignoré */ }

    piece.style.cursor = 'grab';
    piece.style.filter = '';

    const r = piece.getBoundingClientRect();
    const centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 };

    // Le dépôt est accepté ou non par l'activité, qui connaît ses cibles.
    const accepte = surDepot?.(centre, piece) === true;

    if (!accepte) {
      // Retour à la place de départ, en glissant : rien ne se perd.
      piece.style.transition = 'transform .28s cubic-bezier(.22,.9,.28,1)';
      placer(decalageX, decalageY);
      setTimeout(() => { piece.style.transition = 'none'; piece.style.zIndex = ''; }, 300);
    } else {
      piece.style.zIndex = '';
    }
    surDepose?.(accepte);
  };

  piece.addEventListener('pointerup', relacher);
  piece.addEventListener('pointercancel', relacher);

  return {
    /** Fige la pièce : plus déplaçable. */
    verrouiller() {
      piece.dataset.verrouille = 'oui';
      piece.style.cursor = 'default';
    },
    /** Pose la pièce à un décalage donné, avec une petite animation. */
    poser(x, y) {
      piece.style.transition = 'transform .22s cubic-bezier(.34,1.56,.64,1)';
      placer(x, y);
      setTimeout(() => { piece.style.transition = 'none'; }, 240);
    },
    position
  };
}

/**
 * Emplacement le plus proche d'un point, dans un rayon donné.
 * @param {{x:number,y:number}} point        en coordonnées écran
 * @param {Array<{element:HTMLElement}>} cibles
 * @param {number} rayon                     tolérance, en pixels
 */
export function cibleLaPlusProche(point, cibles, rayon = 80) {
  let meilleure = null;
  let meilleureDistance = Infinity;

  for (const cible of cibles) {
    if (cible.prise) continue;
    const r = cible.element.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = Math.hypot(point.x - cx, point.y - cy);
    if (d < meilleureDistance) { meilleureDistance = d; meilleure = cible; }
  }

  // Le rayon s'adapte à la taille de la cible : une grande forme se vise de
  // plus loin qu'une petite.
  if (!meilleure) return null;
  const r = meilleure.element.getBoundingClientRect();
  const tolerance = Math.max(rayon, Math.max(r.width, r.height) * 0.75);
  return meilleureDistance <= tolerance ? meilleure : null;
}
