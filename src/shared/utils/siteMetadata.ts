/**
 * Utilitário para gerenciamento dinâmico de metadados, título da página
 * e manifesto PWA de acordo com o nome do casal atual.
 */

export const DEFAULT_COUPLE_NAME = 'Kevin & Iara';

export function getCoupleDisplayName(couple?: {
  partner1?: { name?: string };
  partner2?: { name?: string };
}): string {
  const p1 = couple?.partner1?.name?.trim();
  const p2 = couple?.partner2?.name?.trim();

  if (p1 && p2) {
    return `${p1} & ${p2}`;
  }
  if (p1) return p1;
  if (p2) return p2;
  return DEFAULT_COUPLE_NAME;
}

export function applySiteMetadata(coupleName: string, siteId?: string, description?: string): void {
  if (typeof document === 'undefined') return;

  const title = coupleName.trim() || DEFAULT_COUPLE_NAME;
  try {
    document.title = title;
  } catch {}

  if (typeof document.querySelector !== 'function' || typeof document.createElement !== 'function') {
    return;
  }

  // Nome do aplicativo no iOS (Adicionar à Tela de Início) e navegadores móveis/desktop
  const updateMetaName = (name: string, content: string) => {
    try {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head?.appendChild(tag);
      }
      tag.setAttribute('content', content);
    } catch {}
  };

  updateMetaName('apple-mobile-web-app-title', title);
  updateMetaName('application-name', title);

  const desc = description || `O nosso espaço especial — ${title}`;
  updateMetaName('description', desc);

  // Tags OpenGraph / Redes Sociais
  const updateOgTag = (property: string, content: string) => {
    try {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head?.appendChild(tag);
      }
      tag.setAttribute('content', content);
    } catch {}
  };

  updateOgTag('og:title', title);
  updateOgTag('og:description', desc);
  updateOgTag('og:type', 'website');

  // Atualiza dinamicamente o Web App Manifest (PWA) para que o download/instalação
  // utilize sempre o nome atualizado do casal
  try {
    const manifestUrl = `/api/manifest?name=${encodeURIComponent(title)}&site=${encodeURIComponent(siteId || 'meu-site')}`;
    const existingLink = document.querySelector('link[rel="manifest"]');
    if (existingLink) {
      if (existingLink.getAttribute('href') !== manifestUrl) {
        existingLink.setAttribute('href', manifestUrl);
      }
    } else {
      const newLink = document.createElement('link');
      newLink.setAttribute('rel', 'manifest');
      newLink.setAttribute('href', manifestUrl);
      document.head?.appendChild(newLink);
    }
  } catch {}
}
