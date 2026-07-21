## Module "Informations Chantier"

Nouveau module de diffusion d'informations générales (broadcast one-way) pour les intervenants d'un chantier. Consultation seule côté entreprises, création réservée aux conducteurs/chefs de chantier/admins.

### 1. Base de données (migration)

Nouvelles tables :

- `publication_categories` — catégories modifiables (nom, icône, ordre). Pré-remplie avec les 16 catégories du cahier des charges.
- `publications` — table principale :
  - `chantier_id`, `auteur_id`, `titre`, `description` (HTML), `resume` (texte court)
  - `category_id`, `priorite` (enum: `information` | `important` | `urgent`)
  - `zone_type` (`chantier` | `batiment` | `bloc` | `niveau` | `zone_libre`), `zone_ref_id` (uuid nullable), `zone_libre` (texte)
  - `destinataires_type` (`toutes` | `entreprises` | `corps_etat` | `fournisseurs` | `transporteurs` | `equipes_internes`)
  - `date_debut`, `date_fin` (nullable), `epingle` (bool)
  - `archivee` (bool, calculée automatiquement par date_fin passée)
- `publication_entreprises` — join table (publication_id, entreprise_id) pour ciblage multi-entreprises
- `publication_pieces_jointes` — (publication_id, nom, url, mime_type, taille)
- `publication_settings` — chantier_id, durees_validite_defaut, couleurs_priorite (JSON), modeles (JSON)

Politiques RLS :
- SELECT : membres du chantier + admins ; pour entreprises, filtre supplémentaire sur destinataires
- INSERT/UPDATE/DELETE : conducteur du chantier + admin

Trigger : notifications automatiques aux membres concernés à la création (réutilise table `notifications` existante).

Nouveau bucket storage : `publication-attachments` (privé, RLS par chantier).

### 2. Routes

Ajout d'une nouvelle entrée dans la sidebar "Informations" avec sous-navigation :

- `/informations` — tableau de bord (KPIs, épinglées, dernières, recherche rapide)
- `/informations/actives` — fil d'actualité (cartes chronologiques + filtres)
- `/informations/archives` — publications expirées
- `/informations/nouvelle` — formulaire de création (éditeur riche, upload multiple)
- `/informations/$id` — vue détaillée d'une publication
- `/informations/parametres` — gestion catégories/couleurs/modèles/durées

Toutes sous `_authenticated/informations.*`.

### 3. Composants clés

- `PublicationCard` — carte du fil (icône catégorie, bandeau couleur priorité, méta, badge pièces jointes)
- `PublicationForm` — formulaire multi-sections avec `react-quill` (ou textarea + markdown si conflit Worker) pour la description
- `PublicationDetail` — vue lecture avec galerie images et téléchargement docs
- `UrgentBanner` — bannière rouge globale dans `__root.tsx` si publications urgentes actives non lues
- `CategoryPicker`, `PriorityBadge`, `ZoneSelector`, `DestinatairesSelector`

### 4. Notifications

À la création d'une publication, trigger DB insère dans `notifications` pour chaque utilisateur des entreprises destinataires (ou tous les membres du chantier). Le composant `NotificationBell` existant les affiche.

### 5. Architecture évolutive

- Table `publications` conçue pour recevoir plus tard des tables filles `publication_commentaires`, `publication_taches`.
- Colonne `type` réservée pour distinguer futurs types (publication/tâche/discussion).

### 6. Design

Cohérent avec le style Fluxop actuel (shadcn + tokens). Codes couleur priorité via variables CSS sémantiques :
- Information : neutre (muted)
- Important : orange/amber
- Urgent : rouge (destructive)

Cartes empilables verticalement sur mobile, tableau élargi sur desktop.

### Étapes de livraison

1. Migration DB (tables, RLS, trigger notifications, bucket storage)
2. Sidebar + routes squelettes + tableau de bord
3. Formulaire de création + upload pièces jointes + éditeur riche
4. Fil actives + détail + filtres/recherche
5. Archives + paramètres + bannière urgente

Je démarre par la migration une fois le plan approuvé.
