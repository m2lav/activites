/* =========================================================================
   Minuterie d'activité.

   Règle du projet, et elle vaut à tous les niveaux : **on ne coupe jamais un
   enfant au milieu de ce qu'il fait.** La séance l'applique entre deux
   activités ; cette minuterie l'applique à l'intérieur d'une activité.

   Le temps écoulé n'arrête donc rien tout seul. Il lève un drapeau, et
   l'activité s'arrête d'elle-même au prochain **point de rupture naturel** :
   labyrinthe résolu, question répondue, plateau de paires terminé. Un
   labyrinthe qui disparaît alors qu'on est à deux cases de la sortie, c'est
   exactement ce qu'il ne faut pas faire.

   Un garde-fou borne quand même le dépassement : si aucun point de rupture
   n'arrive, on finit par conclure.
   ========================================================================= */

/**
 * @param {object} o
 * @param {number} o.duree      budget alloué, en millisecondes
 * @param {() => void} o.terminer  appelé par le garde-fou uniquement
 * @param {number} [o.marge]    dépassement toléré, en part du budget
 */
export function creerMinuterie({ duree, terminer, marge = 0.8 }) {
  const debut = Date.now();
  let ecoule = false;

  const battement = setInterval(() => {
    const passe = Date.now() - debut;
    if (passe >= duree) ecoule = true;
    // Garde-fou : une activité sans point de rupture ne doit pas durer
    // indéfiniment non plus.
    if (passe >= duree * (1 + marge)) { clearInterval(battement); terminer(); }
  }, 500);

  return {
    /** À consulter à chaque point de rupture naturel. */
    doitFinir: () => ecoule,
    ecoule: () => Date.now() - debut,
    arreter: () => clearInterval(battement)
  };
}
