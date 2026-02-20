export const HOMEPAGE_URL = 'https://jwt-decode.github.io/jwt-decoder/';

export function openHomepage() {
  window.open(HOMEPAGE_URL, '_blank');
}

if (typeof chrome !== 'undefined' && chrome?.runtime?.id && typeof window !== 'undefined') {
  openHomepage();
}
