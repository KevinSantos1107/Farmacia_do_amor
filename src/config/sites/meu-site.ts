import type { SiteConfig } from '../siteConfig.schema';

export const meuSiteConfig: SiteConfig = {
  id: 'meu-site',
  couple: {
    // playerId is STABLE — never changes even if the display name changes.
    // These match the existing Firestore document keys (snake_kevin, word_iara, etc.)
    partner1: { name: 'Kevin', playerId: 'kevin', birthDate: '1998-05-15', gender: 'M', avatar: '/avatars/avatar_1.webp' },
    partner2: { name: 'Iara',  playerId: 'iara',  birthDate: '2000-09-22', gender: 'F', avatar: '/avatars/avatar_2.webp' },
  },
  relationship: {
    startDate: '2025-10-27', // Corrected date as confirmed
  },
  theme: {
    colors: {
      bg: '#07050f',                     // Roxo noturno profundo
      primary: '#9d4edd',                // Roxo neon (tema meteoro = padrão)
      secondary: '#e0aaff',              // Lilás claro
      accent: '#c77dff',                 // Violeta médio
      text: '#ffffff',                   // Branco puro
      textSecondary: '#a1a1aa',          // Cinza claro
      cardBg: 'rgba(15, 10, 30, 0.4)',   // Vidro roxo escuro
      cardBorder: 'rgba(157, 78, 221, 0.4)', // Borda roxa translúcida
    },
  },
  features: {
    enableTimeline: true,
    enableGames: true,
    enableMusic: true,
    enableAlbum: true,
  },
};
