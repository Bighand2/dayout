# DAYOUT

> Trouver quoi faire quand on ne sait pas quoi faire, sans dépasser son budget.

DAYOUT est une application web qui compose automatiquement une **sortie à Paris** à partir de quelques contraintes : budget maximum, temps disponible, centres d'intérêt, arrondissement de départ et contexte (seul, en couple ou entre amis).

L'objectif n'est pas d'afficher un catalogue de lieux, mais de proposer un **parcours cohérent en plusieurs étapes**, proches les unes des autres, avec un coût total estimé qui ne dépasse jamais le budget indiqué.

> ⚠️ **Données de démonstration.** Les lieux, prix et durées du catalogue actuel sont **fictifs**. Ils servent uniquement à faire fonctionner et à tester l'application.

## État du projet

| Étape | Contenu | Statut |
|---|---|---|
| 1 | Base du projet, modèle de données, catalogue de démonstration validé et testé | ✅ Terminé |
| 2 | Moteur de génération des sorties (fonction pure et testée) | ✅ Terminé |
| 3 | Interface : page d'accueil, formulaire, page de résultats, responsive | ✅ Terminé |
| 4 | Finitions de la V1 : accessibilité, cas limites, mise en ligne | ⏳ À venir |

## Stack technique

| Outil | Rôle | Pourquoi ce choix |
|---|---|---|
| HTML, CSS, JavaScript (modules ES) | Interface et logique | Pas de framework en V1 : l'essentiel du projet est l'algorithme, et le JavaScript moderne suffit pour une interface d'une page |
| [Vite](https://vite.dev) 8 | Serveur de développement et compilation | Rechargement automatique et production d'une version optimisée ; ce n'est pas un framework |
| JSON | Catalogue d'activités | Simple à modifier ; l'accès aux données est isolé dans un seul module pour passer plus tard à une API |
| `node:test` | Tests automatisés | Intégré à Node.js, aucune dépendance supplémentaire |
| [Lucide](https://lucide.dev) (ISC) | Icônes SVG | Rendu identique sur tous les systèmes (contrairement aux emojis) ; seules les icônes utilisées sont embarquées |
| [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) (OFL), via Fontsource | Police des titres | Hébergée avec le site : aucune requête vers un service tiers comme Google Fonts |

Évolution prévue : une **API Node.js + Express** avec une base **SQLite** (V2), qui réutilisera le même moteur de génération sans réécriture.

## Prérequis

- [Node.js](https://nodejs.org) **22.12 ou plus récent** (version LTS recommandée)
- npm (installé avec Node.js)

## Installation et lancement

```bash
# 1. Installer les dépendances (une seule fois, ou après chaque modification de package.json)
npm install

# 2. Lancer le serveur de développement
npm run dev
```

Ouvrir ensuite l'adresse affichée dans le terminal (par défaut http://localhost:5173).

> Ouvrir directement `index.html` en double-cliquant ne fonctionne pas : les navigateurs bloquent le chargement des modules et du JSON depuis un fichier local (`file://`). Il faut passer par le serveur de développement.

### Autres commandes

| Commande | Effet |
|---|---|
| `npm test` | Lance les tests automatisés |
| `npm run demo` | Génère deux sorties dans le terminal (préférences modifiables dans `scripts/demo-generator.js`) |
| `npm run build` | Produit la version optimisée dans `dist/` |
| `npm run preview` | Sert localement la version de `dist/` pour la vérifier |

## Structure du projet

```text
.
├── index.html                    Page unique de l'application
├── public/
│   └── data/
│       └── activities.json       Catalogue d'activités (démonstration)
├── src/
│   ├── main.js                   Point d'entrée : relie données, formulaire, générateur et affichage
│   ├── config/
│   │   ├── categories.js         Catégories, types de coût, publics (codes et libellés)
│   │   ├── formOptions.js        Valeurs proposées dans le formulaire (budgets, durées)
│   │   ├── paris.js              Centres des arrondissements, limites de Paris
│   │   └── transport.js          Hypothèses de trajet (vitesses, ticket de métro)
│   ├── data/
│   │   ├── activitySchema.js     Validation d'une activité et du catalogue
│   │   └── activityRepository.js Chargement des activités (seul module qui connaît la source)
│   └── engine/
│       ├── generator.js          Générateur de sorties (fonction pure)
│       ├── preferences.js        Validation des préférences de l'utilisateur
│       ├── geo.js                Distances et estimation des trajets
│   │   └── random.js             Hasard reproductible (tests) et tirage pondéré
│   ├── ui/
│   │   ├── form.js               Formulaire : boutons, lecture des choix, erreurs
│   │   ├── results.js            Affichage de la sortie en « ligne de métro »
│   │   ├── messages.js           Codes du générateur → phrases pour l'utilisateur
│   │   ├── format.js             Mise en forme des prix, durées, trajets
│   │   ├── icons.js              Icônes Lucide utilisées par l'interface
│   │   └── dom.js                Création d'éléments HTML sans innerHTML
│   └── styles/
│       └── main.css              Styles (variables, composants, responsive)
├── scripts/
│   └── demo-generator.js         Essai du générateur dans le terminal (`npm run demo`)
└── tests/                        Tests automatisés (node:test)
```

**Séparation des responsabilités :** `engine/` ne connaît ni la page ni le réseau, `data/` est le seul module qui sait d'où viennent les activités, `ui/` est la seule partie qui touche au HTML. On peut ainsi changer l'interface (ou passer à un framework) sans toucher au générateur, et inversement.

## Interface

Une seule page qui défile : présentation, formulaire, puis résultats. La direction artistique s'inspire d'un **plan de métro** : chaque étape est une station, chaque catégorie a sa couleur de ligne, le fond rappelle un plan quadrillé et le résumé d'une sortie prend la forme d'un ticket jaune.

- **Présentation** : mini plan de métro en SVG dont le trajet se dessine à l'ouverture de la page.
- **Thèmes** : clair ou sombre selon le réglage du système, grâce à des variables CSS (seules les variables changent d'un thème à l'autre).
- **Animations** : la ligne et les stations apparaissent l'une après l'autre ; tout est désactivé si l'utilisateur a demandé à réduire les animations.

- **Formulaire** : boutons de valeurs prédéfinies (budget avec un montant libre « Autre », temps disponible, public), cartes d'envies à cocher, choix de l'arrondissement et option pass Navigo. Les erreurs s'affichent sous le champ concerné et le focus s'y place.
- **Résultats** : résumé (budget, durée, nombre d'étapes), remarques du générateur, parcours étape par étape avec les trajets entre deux stations, lien vers la carte OpenStreetMap, bouton « Générer une autre sortie » qui évite toutes les activités déjà proposées depuis la dernière recherche.
- **Accessibilité** : vrais champs de formulaire (utilisables au clavier et par les lecteurs d'écran), contours de focus visibles, contrastes de texte d'au moins 4,5:1, information jamais portée par la seule couleur, respect du réglage « réduire les animations ».

## Modèle de données

Chaque activité du fichier `public/data/activities.json` suit ce format :

```json
{
  "id": "gaming-001",
  "name": "Pixel Zone",
  "category": "gaming",
  "description": "Salle d'arcade avec bornes rétro et jeux de rythme.",
  "cost": { "type": "consumption", "min_eur": 5, "max_eur": 12 },
  "duration_minutes": { "min": 60, "max": 90 },
  "location": { "arrondissement": 11, "address": null, "latitude": 48.857, "longitude": 2.381 },
  "suitable_for": ["solo", "couple", "friends"],
  "is_fictional": true
}
```

| Champ | Obligatoire | Valeurs |
|---|---|---|
| `id` | oui | minuscules, chiffres et tirets, unique |
| `category` | oui | `food`, `thrift`, `gaming`, `culture`, `sport`, `cinema`, `shows`, `nature` |
| `cost.type` | oui | `free`, `ticket`, `consumption`, `mixed` |
| `cost.min_eur` / `cost.max_eur` | oui | nombres positifs, ou tous deux `null` si le prix est inconnu |
| `duration_minutes.min` / `.max` | oui | entiers en minutes |
| `location.arrondissement` | oui | 1 à 20 |
| `location.latitude` / `.longitude` | oui | coordonnées situées dans Paris |
| `location.address` | non | texte ou `null` |
| `suitable_for` | oui | au moins un parmi `solo`, `couple`, `friends` |
| `is_fictional` | oui | `true` pour les données de démonstration |
| `image_url`, `info_url` | non | URL `https://` uniquement |

**Conventions :**
- les **codes** (catégories, types, publics) sont en anglais, et leurs **libellés français** se trouvent dans `src/config/categories.js` ;
- **`null` signifie « inconnu »** : on n'invente jamais une valeur.

### Ajouter une activité

1. Ajouter un objet dans `public/data/activities.json` en respectant le format ci-dessus.
2. Lancer `npm test` : le test du catalogue signale toute erreur (champ manquant, prix incohérent, coordonnées hors de Paris, id en double…). Il vérifie aussi la couverture : au moins 3 activités par catégorie, et au moins 4 activités par arrondissement dont une gratuite.

Une activité invalide n'empêche pas le site de fonctionner : elle est ignorée, et un avertissement apparaît dans la console du navigateur.

## Le générateur de sorties

Le générateur (`src/engine/generator.js`) est une **fonction pure** : il reçoit le catalogue et les préférences, et renvoie une sortie ou la raison de l'échec. Il ne touche ni à la page ni au réseau, ce qui permet de le tester et de le réutiliser tel quel sur un serveur.

### Algorithme

1. **Filtrer** les activités compatibles : catégories choisies, public (seul, couple, amis), prix connu, prix haut dans le budget, durée minimale dans le temps disponible.
2. **Réduire** à un vivier de 16 activités environ : les plus proches de l'arrondissement choisi, ou tirées au hasard s'il n'y en a pas. Chaque catégorie choisie y est représentée.
3. **Énumérer** toutes les combinaisons de 1 à 4 activités. Une combinaison qui dépasse déjà le budget ou le temps n'est pas agrandie (élagage).
4. **Ordonner** chaque combinaison : on teste tous les ordres possibles et on garde le trajet le plus court qui respecte encore budget et temps, trajets compris. Un repas placé en fin de parcours reçoit un bonus.
5. **Noter** chaque sortie : nombre d'étapes visé, envies servies, temps bien utilisé, trajets courts, proximité de l'arrondissement, activités déjà proposées juste avant.
6. **Choisir** par tirage pondéré parmi les meilleures : la mieux notée sort environ 2 fois sur 3, ce qui varie les propositions sans dégrader leur qualité.

### Règles

| Règle | Fonctionnement |
|---|---|
| **Budget** (strict) | Somme des prix hauts (`max_eur`) + tickets de métro ≤ budget par personne |
| **Temps** (strict) | Somme des durées minimales + trajets estimés ≤ temps disponible |
| **Nombre d'étapes** | Moins de 2 h : 1 à 2 ; de 2 h à 4 h : 2 à 3 ; plus de 4 h : 3 à 4. Une seule étape est proposée (et signalée) si c'est la seule possibilité |
| **Variété** | Des catégories différentes sont privilégiées, mais une catégorie peut se répéter ; jamais deux fois la même activité |
| **Repas** | Si la nourriture est cochée et possible, la sortie contient un repas, de préférence en dernière étape |
| **Localisation** | L'arrondissement choisi est privilégié ; les étapes situées ailleurs sont signalées (`OUTSIDE_SELECTED_AREA`), avec une remarque spécifique si l'arrondissement n'a aucune activité compatible (`NO_MATCH_IN_AREA`) |
| **Autre sortie** | L'appelant transmet les activités déjà proposées (`previousActivityIds`) ; elles sont pénalisées pour faire apparaître d'autres combinaisons |
| **Trajets** | Estimés à vol d'oiseau × 1,3 : à pied jusqu'à 1,5 km, sinon métro (ticket à 2,55 €, gratuit avec un pass Navigo) |
| **Prix inconnu** | Activité exclue, car le budget ne pourrait pas être garanti |
| **Échec** | Le générateur renvoie un code (`BUDGET_TOO_LOW`, `TIME_TOO_SHORT`…) avec, si possible, le budget ou la durée minimale nécessaire |

Les poids de la note (`SCORE_WEIGHTS`) et les réglages (`GENERATOR_SETTINGS`) sont regroupés en tête du fichier pour pouvoir ajuster les priorités sans toucher à la logique. Les hypothèses de trajet se trouvent dans `src/config/transport.js`.

## Sécurité

Mesures déjà en place :

- **Validation par liste blanche** de chaque activité chargée : types, plages de valeurs, codes autorisés. Seuls les champs connus sont conservés.
- **URL limitées à `https://`**, pour éviter qu'un lien `javascript:` exécute du code au clic (XSS).
- **Affichage par `textContent`**, jamais par `innerHTML` avec des données : le texte n'est jamais interprété comme du HTML (voir `src/ui/dom.js`).
- **Liens externes en `rel="noopener noreferrer"`** : la page ouverte ne peut pas agir sur DAYOUT et ne reçoit pas son adresse.
- **Préférences revalidées** avant chaque génération, même si elles viennent de notre propre formulaire (le module sera réutilisé côté serveur en V2).
- **Erreurs séparées** : un message clair pour l'utilisateur, et le détail technique uniquement dans la console.
- **Aucun secret** dans le code front ; les fichiers `.env` sont exclus du dépôt.
- **Dépendances** : trois seulement (Vite pour le développement, Lucide et la police pour le site), en versions exactes, avec un `package-lock.json` versionné. Une version n'est adoptée qu'après environ deux semaines de publication, pour limiter le risque de paquet piégé (attaque de la chaîne d'approvisionnement).
- **Pas de ressource externe** : police et icônes sont servies par le site lui-même ; aucune donnée des visiteurs (adresse IP, page visitée) n'est transmise à un tiers au chargement.

## Limites connues

- Données fictives ; aucune information (prix, horaires, adresse) n'est vérifiée.
- Pas de gestion des horaires d'ouverture : il faut vérifier qu'un lieu est ouvert avant de s'y rendre.
- Temps de trajet estimés à vol d'oiseau, sans calcul d'itinéraire réel.
- Le trajet jusqu'à la première étape n'est pas compté (on ne connaît pas le point de départ exact).
- L'énumération de toutes les combinaisons convient à un catalogue de quelques centaines d'activités ; au-delà, il faudra présélectionner davantage ou passer à une recherche approchée.

## Feuille de route après la V1

- **V2 :** API Node.js + Express, base SQLite (requêtes paramétrées), validation côté serveur.
- **V3 :** favoris, partage d'une sortie, carte interactive, temps de trajet réels, météo, éventuellement TypeScript.
