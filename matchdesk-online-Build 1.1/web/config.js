// ===== MatchDesk settings you can edit =====
// ADS (Home screen only). Leave "banners" empty and "adsense.client" blank to show no ads.
// Add direct sponsor / affiliate banners by dropping images into the "ads" folder and listing them here:
//   { img: 'ads/sponsor1.png', href: 'https://sponsor.example/?ref=YOURID', alt: 'Sponsor name', sponsor: 'Sponsor name' }
window.MD_CONFIG = {
  licensing: {
    enforce: true,    // Free-plan limits ON (1 analysis/day, 5 saved slips). Pro keys and the 7-day trial are never limited
    publicKeyHex: '7df9dc9a8f90e1d79f7840ebac4ce69ee5ca8f84ffcb3030c2ffef36d4cccee1'   // same public key as the desktop app
  },
  // PayFast (South African payments) - OFF until you connect it.
  //   preview: true  = show PayFast buttons for evaluation (no real payment).
  //   checkoutUrl    = licence server PayFast checkout page. Leave blank until live.
  //   prices         = rand prices charged by PayFast.
  // When ready: set checkoutUrl and/or preview: true. Until then only PayPal is shown.
  payfast: {
    preview: false,
    checkoutUrl: '',
    prices: { monthly: 91.99, annual: 829.00 }
  },
  ads: {
    enabled: true,
    rotateSeconds: 12,
    banners: [],
    adsense: { client: '', slot: '' }   // fill in only after Google approves your site, e.g. client: 'ca-pub-1234567890123456'
  }
};
