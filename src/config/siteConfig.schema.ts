export interface SiteConfig {
  id: string;
  couple: {
    partner1: {
      /** Display name shown in UI — can change freely */
      name: string;
      /**
       * Stable internal ID used as Firestore document key.
       * Set ONCE when the site is created; NEVER change afterwards.
       * Existing sites: 'kevin'. New sites default to 'partner1'.
       */
      playerId: string;
      photoUrl?: string;
      _photoPublicId?: string;
      birthDate?: string;
      gender?: 'M' | 'F';
      avatar?: string;
    };
    partner2: {
      name: string;
      playerId: string;
      photoUrl?: string;
      _photoPublicId?: string;
      birthDate?: string;
      gender?: 'M' | 'F';
      avatar?: string;
    };
  };
  relationship: {
    startDate: string; // ISO format e.g., '2025-10-27'
  };
  theme: {
    colors: {
      bg: string;
      primary: string;
      secondary: string;
      accent: string;
      text: string;
      textSecondary: string;
      cardBg: string;
      cardBorder: string;
    };
    font?: {
      heading: string;
      body: string;
    };
  };
  features: {
    enableTimeline: boolean;
    enableGames: boolean;
    enableMusic: boolean;
    enableAlbum: boolean;
  };
}
