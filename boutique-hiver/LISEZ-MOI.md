# FRIMAS — thème Shopify

Thème Shopify Online Store 2.0 sur mesure (Liquid, sections et blocs éditables) pour une boutique d'accessoires d'hiver.
Fichier à importer : `frimas-theme.zip`.

## 1. Installer le thème (2 minutes)
1. Shopify → **Boutique en ligne → Thèmes → Ajouter un thème → Importer un fichier ZIP** → choisis `frimas-theme.zip`.
2. Clique sur **Personnaliser** pour voir et modifier la boutique, puis **Publier** quand tout est prêt.

## 2. Créer les collections (Produits → Collections)
Crée ces collections avec exactement ces identifiants (« handle » en bas de page, section SEO) :
`bonnets`, `gants`, `echarpes`, `cache-cou`, `chaussettes-thermiques`, `accessoires-froid`, `best-sellers`, `nouveautes`.
Astuce : collections **automatiques** par « Type de produit » (Bonnets, Gants, Écharpes…), et pour `nouveautes` : « Balise = nouveau ».

## 3. Importer les produits
Produits → **Importer** → `produits-a-importer.csv`. Les produits arrivent **en brouillon**, sans stock.
Pour chacun : ajoute **plusieurs photos**, la **vraie composition**, le **stock**, vérifie le **prix**, puis passe-le en **Actif**.
Les variantes s'appellent « Couleur » et « Taille » : les pastilles de couleur s'affichent automatiquement
(couleurs reconnues : Noir, Blanc, Gris, Anthracite, Crème, Beige, Camel, Marron, Bleu glacier, Marine, Vert, Bordeaux, Rouge, Rose).

## 4. Menus (Boutique en ligne → Navigation)
- `main-menu` : Bonnets, Gants, Écharpes, Cache-cou, Chaussettes, Nouveautés.
- `footer` : Livraison, Retours, CGV, Mentions légales, Contact.

## 5. Filtres (catégorie, couleur, taille, prix)
Installe l'application gratuite **Shopify Search & Discovery** → Filtres → ajoute : Type de produit, Couleur, Taille, Prix, Disponibilité.
Le thème les affiche automatiquement sur les collections et la recherche.

## 6. Images de la page d'accueil (Personnaliser)
- **Bannière principale** : une photo hivernale en paysage (2400 px de large), plus une version portrait pour mobile si possible.
- **Catégories**, **Qualité et confort**, **Bannière promotionnelle** : une photo chacune.
Utilise des photos dont tu as les droits : tes propres photos, celles de ton fournisseur avec son accord, ou une banque d'images libre de droits.

## 7. Confiance et conformité
- **Avis clients** : la section reste invisible tant qu'elle est vide. N'y ajoute que de vrais avis, ou installe une app d'avis (Judge.me, Shopify Product Reviews).
- **Prix barré** : il ne s'affiche que si tu renseignes un « Prix avant réduction » dans Shopify, à n'utiliser que pour une vraie promotion.
- **« Plus que X en stock »** : basé sur ton vrai stock Shopify.
- **Paramètres → Politiques** : génère remboursement, confidentialité, conditions de vente et expédition (liens automatiques en pied de page).
- **Mentions légales** (page obligatoire en France) : nom, adresse, SIRET, e-mail, hébergeur (Shopify).
- **Paramètres → Paiements** : Shopify Payments et/ou PayPal. **Paramètres → Expédition** : tes vrais tarifs et délais.
- **Thème → Paramètres du thème → Panier et livraison** : mets le seuil de livraison offerte seulement s'il existe vraiment.

## Ce que contient le thème
Page d'accueil (bannière, réassurance, best-sellers, catégories, nouveautés, qualité, avis, promo, footer),
fiche produit (galerie, variantes, stock réel, paiement express, accordéons, produits associés, barre d'achat mobile),
collections avec filtres natifs et tri, recherche prédictive, panier latéral dynamique, page panier,
animations discrètes au défilement (désactivées si l'utilisateur préfère moins d'animations), conçu d'abord pour le mobile.
