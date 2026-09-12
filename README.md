# Les activités — lots 1 à 3

Application web d'activités éducatives et de récréations, pour trois enfants
d'une même famille. Aucun serveur, aucun compte, aucune donnée qui sort de
l'appareil.

> **Ce dépôt ne contient aucune donnée personnelle**, et ne doit jamais en
> contenir : ni prénoms, ni âges, ni photos. Les enfants sont saisis une seule
> fois sur la tablette, à la première ouverture, et restent dessus.

## Ce qui est en place

| Brique | Fichier | Rôle |
|---|---|---|
| Coquille PWA | `index.html`, `manifest.webmanifest` | Installation sur l'écran d'accueil, plein écran, paysage |
| Hors ligne | `sw.js` | Cache local ; code « réseau d'abord », médias « cache d'abord » |
| Stockage | `src/core/store.js` | IndexedDB : profils, difficulté 1-10 par enfant et par matière, sessions, réglages, export/import JSON |
| Navigation | `src/core/router.js` | Pile d'écrans, transitions attendues avant démontage |
| Animation | `src/core/anim.js` | Glissement d'écran, arrivée en cascade, récompense, retour d'appui |
| Audio | `src/core/audio.js` | Déblocage iOS, effets synthétisés, voix fr-FR, silence global |
| Univers | `src/core/univers.js` + `assets/univers/` | Palette et typographie pilotées par manifeste JSON |
| Moteur de séance | `src/core/session.js` | Enchaînement effort / détente, temps imparti, bilan |
| Sablier | `src/ui/sablier.js` | Un segment par minute, visible en permanence |
| Pavé numérique | `src/ui/pave-numerique.js` | Dix touches dessinées, jamais le clavier iOS |
| Roue de difficulté | `src/ui/reglage-difficulte.js` | Appui long pendant la séance, effet à l'exercice suivant |
| Activités | `src/activities/` | Registre + contrat commun à toutes les activités |

Parcours complet : démarrage → première configuration → choix du profil →
choix de la durée → séance → fin de séance. Plus l'espace parent, protégé par
un code, accessible par **appui long sur la roue dentée** de l'écran d'accueil.

### La règle qui structure tout

Le temps restant n'est consulté **qu'entre deux activités** (`seance.prochaine()`).
Quand il est écoulé, l'activité en cours va à son terme, puis la séance
s'achève. Aucun autre endroit du code ne doit décider d'interrompre.

### Ajouter une activité

Créer un module dans `src/activities/` exposant `meta`, `generer(niveau)` et
`monter(conteneur, exercice, ctx)`, puis l'ajouter à `CATALOGUE` dans
`src/activities/index.js`. Le moteur s'occupe du reste : rien d'autre à
modifier. Voir `etoiles.js` comme patron.

### Le catalogue

| Activité | Axe | Catégorie | Âges | Paramètre piloté par le niveau |
|---|---|---|---|---|
| Calcul mental | calcul_mental | effort | 5-12 | opérations, plafond, retenue, jetons d'aide |
| Suites logiques | logique | effort | 4-12 | formes → nombres → intrus |
| Les paires | memoire | effort | 3-12 | 3 à 12 paires |
| Combien ? | calcul_mental | effort | 3-6 | quantité jusqu'à 3 → 10 |
| Le labyrinthe | labyrinthe | détente | 3-12 | 5×5 à 17×17, impasses à partir du niveau 3 |
| Les étoiles | adresse | détente | 3-12 | taille, durée de vie, cadence |

Reste à écrire (lot 4, seconde passe) : lecture, tangram, nœuds marins,
scoutisme, culture, tri et associations Montessori.

### Les dix niveaux du calcul mental

Décrits dans `PALIERS`, en tête de `calcul-mental.js` — c'est le seul endroit à
toucher pour réétalonner la progression :

| Niveau | Opérations | Plafond | Retenue | Jetons à compter |
|---|---|---|---|---|
| 1-2 | + | 5 puis 10 | non | oui |
| 3-4 | + − | 10 puis 20 | non | oui |
| 5 | + − | 20 | non | non |
| 6 | + − | 20 | oui | non |
| 7-8 | + − × | 50 puis 100 | oui | non |
| 9-10 | + − × | 100 puis 200 | oui | non |

Générateur vérifié sur 20 000 tirages : aucun résultat négatif, aucun
dépassement de plafond, aucune retenue là où elle est exclue.

## Tester sur le PC

```bash
node outils/serveur.mjs
```

Puis ouvrir `http://localhost:5173`.

## Tester sur l'iPad

Le PC et l'iPad doivent être sur le même Wi-Fi. La commande ci-dessus affiche
une seconde adresse du type `http://192.168.1.xx:5173` : c'est celle-là qu'on
ouvre dans Safari sur l'iPad.

**Une limite à connaître** : en `http://`, Safari refuse d'activer le mode hors
ligne (il l'exige en `https://`). Tout le reste — son, voix, animations,
stockage, installation sur l'écran d'accueil — se teste normalement.
Le fonctionnement hors ligne ne se vérifie donc qu'une fois l'app publiée.

## Publier

Adresse en ligne : **https://m2lav.github.io/activites/**
Dépôt : https://github.com/m2lav/activites

Chaque envoi met l'app à jour sur l'iPad, sans rien réinstaller. Compter une à
deux minutes entre le `push` et la mise en ligne :

```bash
git add -A && git commit -m "Mise à jour" && git push
```

## Installer sur l'iPad

Ouvrir https://m2lav.github.io/activites/ dans **Safari** (pas Chrome : sur
iOS, lui seul sait installer une application). Bouton Partager → faire défiler
→ « Sur l'écran d'accueil ». L'app s'ouvre ensuite sans barre d'URL.

## À savoir

- **Code parent par défaut : `1234`.** À changer depuis l'espace parent (lot 2).
- **Les données vivent uniquement sur l'iPad.** Retirer l'app de l'écran
  d'accueil les efface. D'où le bouton « Copier la sauvegarde » : il met tout
  l'historique dans le presse-papiers, à coller dans une note.
- **À chaque livraison**, incrémenter `VERSION` en tête de `sw.js`, sinon les
  anciens fichiers restent en cache sur l'iPad.

## Reste à faire

Lot 4 : le reste du catalogue (lecture, logique, labyrinthes, tangram, mémoire,
nœuds, scoutisme, Montessori). Lot 5 : assets définitifs, déclinaison par
univers, musiques et finition.
