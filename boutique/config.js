// ============================================================================
//  CONFIGURATION DE LA BOUTIQUE — c'est le seul fichier à modifier.
// ============================================================================
window.SHOP = {
  // Nom et slogan affichés partout
  name: 'OBSESSION STORE',
  tagline: 'Des objets pour ceux qui ne lâchent rien.',

  // Domaine Shopify (ex. "ma-boutique.myshopify.com"). Tant qu'il est vide,
  // le bouton « Commander » affiche « Boutique bientôt ouverte ».
  shopifyDomain: '',

  // Contact affiché sur le site
  instagram: '', // ex. "https://instagram.com/tonpseudo"
  tiktok: '', // ex. "https://www.tiktok.com/@tonpseudo"
  email: '', // un e-mail pro, pas ton e-mail perso

  // Livraison (affichée sur les fiches et dans le panier)
  delivery: 'Livraison offerte · 5 à 10 jours ouvrés',

  // Produits. "variantId" = l'identifiant de la variante dans Shopify
  // (Produits → ouvrir le produit → l'URL de la variante se termine par son numéro).
  // "icon" = l'illustration affichée : lamp, stars, watch, notebook, desk, frame.
  products: [
    { id: 'lampe-halo', name: 'Lampe Halo', price: 29.9, compareAt: null, icon: 'lamp', variantId: '', desc: "Une lumière dorée et douce pour ton bureau ou ta table de chevet. Variateur tactile, câble USB-C." },
    { id: 'projecteur-ciel', name: 'Projecteur Ciel Étoilé', price: 34.9, compareAt: null, icon: 'stars', variantId: '', desc: "Transforme ta chambre en ciel de nuit. Plusieurs couleurs, minuteur et télécommande." },
    { id: 'tapis-setup', name: 'Tapis de bureau XXL', price: 24.9, compareAt: null, icon: 'desk', variantId: '', desc: "90 × 40 cm, surface lisse et base antidérapante. Pour un setup propre et sobre." },
    { id: 'carnet-objectifs', name: 'Carnet 90 jours', price: 19.9, compareAt: null, icon: 'notebook', variantId: '', desc: "Un carnet pour fixer tes objectifs et suivre tes progrès chaque jour pendant 90 jours." },
    { id: 'montre-noire', name: 'Montre Minimal Noire', price: 39.9, compareAt: null, icon: 'watch', variantId: '', desc: "Cadran noir, aiguilles dorées, bracelet maille. Sobre et élégante." },
    { id: 'cadre-led', name: 'Cadre lumineux', price: 27.9, compareAt: null, icon: 'frame', variantId: '', desc: "Un cadre rétroéclairé pour afficher ta citation ou ton objectif. Alimentation USB." },
  ],
};
