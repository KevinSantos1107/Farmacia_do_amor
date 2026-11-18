export type SnakeThemeConfig = {
  cellA: string;
  cellB: string;
  boardBg: string;
  borderNeon: string;
  borderGlow: string;
  snakeBody: string;
  snakeOutline: string;
  snakeShade: string;
  food: string;
  foodShade: string;
  particles: string[];
  overlayBg: string;
  btnPrimary: string;
  btnDanger: string;
  textPrimary: string;
  // [novo] Cor das escamas semitransparentes ao longo do corpo da cobra
  scaleColor: string;
};

export const SNAKE_THEMES: Record<'meteors' | 'hearts' | 'aurora' | 'snow', SnakeThemeConfig> = {
  meteors: {
    cellA: '#211230',
    cellB: '#1a0e26',
    boardBg: '#150a1d',
    borderNeon: '#9d4edd',
    borderGlow: 'rgba(157, 78, 221, 0.4)',
    snakeBody: '#c77dff',
    snakeOutline: '#e0aaff',
    snakeShade: '#7b2cbf',
    food: '#ff9e00',
    foodShade: '#e85d04',
    particles: ['#ff9e00', '#e85d04', '#c77dff', '#9d4edd', '#ffffff'],
    overlayBg: 'rgba(21, 10, 29, 0.85)',
    btnPrimary: '#9d4edd',
    btnDanger: '#ff4d6d',
    textPrimary: '#e0aaff',
    // [novo] escamas: tom derivado de snakeOutline com baixa opacidade
    scaleColor: 'rgba(224, 170, 255, 0.18)',
  },
  hearts: {
    cellA: '#2f0d1b',
    cellB: '#250a15',
    boardBg: '#1f0812',
    borderNeon: '#ff0055',
    borderGlow: 'rgba(255, 0, 85, 0.4)',
    snakeBody: '#ff4d94',
    snakeOutline: '#ff80b3',
    snakeShade: '#c50042',
    food: '#ffffff',
    foodShade: '#ffb3c6',
    particles: ['#ff0055', '#ff4d94', '#ffffff', '#ff80b3'],
    overlayBg: 'rgba(31, 8, 18, 0.85)',
    btnPrimary: '#ff0055',
    btnDanger: '#ff4d6d',
    textPrimary: '#ffb3c6',
    // [novo] escamas: tom derivado de snakeOutline com baixa opacidade
    scaleColor: 'rgba(255, 128, 179, 0.18)',
  },
  aurora: {
    cellA: '#092a2a',
    cellB: '#062020',
    boardBg: '#031414',
    borderNeon: '#00ffc8',
    borderGlow: 'rgba(0, 255, 200, 0.4)',
    snakeBody: '#22d3ee',
    snakeOutline: '#a855f7',
    snakeShade: '#0e7490',
    food: '#ff00c8',
    foodShade: '#b3008c',
    particles: ['#00ffc8', '#22d3ee', '#a855f7', '#ff00c8', '#ffffff'],
    overlayBg: 'rgba(3, 20, 20, 0.85)',
    btnPrimary: '#00ffc8',
    btnDanger: '#ff0055',
    textPrimary: '#22d3ee',
    // [novo] escamas: tom derivado de snakeOutline com baixa opacidade
    scaleColor: 'rgba(168, 85, 247, 0.18)',
  },
  snow: {
    cellA: '#141d2b',
    cellB: '#0f1621',
    boardBg: '#0d131c',
    borderNeon: '#00f0ff',
    borderGlow: 'rgba(0, 240, 255, 0.4)',
    snakeBody: '#4a90e2',
    snakeOutline: '#8dc0ff',
    snakeShade: '#22559c',
    food: '#ffffff',
    foodShade: '#a0c4ff',
    particles: ['#00f0ff', '#4a90e2', '#ffffff', '#8dc0ff'],
    overlayBg: 'rgba(13, 19, 28, 0.85)',
    btnPrimary: '#00f0ff',
    btnDanger: '#e63946',
    textPrimary: '#8dc0ff',
    // [novo] escamas: tom derivado de snakeOutline com baixa opacidade
    scaleColor: 'rgba(141, 192, 255, 0.18)',
  }
};
