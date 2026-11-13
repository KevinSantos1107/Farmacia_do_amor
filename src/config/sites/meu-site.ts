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
  loveMessages: [
    'Cada dia ao seu lado é uma página nova em nosso livro de amor, escrita com sorrisos, carinho e cumplicidade.',
    'Se eu pudesse escolher novamente entre todas as pessoas do mundo, escolheria você, sempre você.',
    'Nos seus olhos encontro meu lugar favorito no mundo, onde posso ser apenas eu e saber que sou amado.',
    'O amor que sinto por você não cabe em palavras, mas transborda em cada gesto, cada olhar, cada momento juntos.',
    'Mesmo de longe, você conseguiu fazer eu me sentir mais amado do que nunca.',
    'Você transformou a distância em mais uma prova de que fomos feitos um para o outro.',
    'Amar você é a coisa mais natural e bonita que já aconteceu na minha vida.',
    'Você chegou na minha vida e, sem perceber, se tornou meu lugar favorito.',
    'Não importa a distância, meu coração sempre encontra o caminho até você.',
    'Com você, até os dias comuns se tornam especiais.',
    'Você é a melhor coincidência que a vida colocou no meu caminho.',
    'Entre tantas pessoas no mundo, foi você quem fez meu coração se sentir em casa.',
    'Seu amor mudou completamente a forma como eu vejo a vida.',
    'Toda vez que penso no futuro, é você que eu imagino ao meu lado.',
    'Você conseguiu ser minha paz mesmo estando quilômetros de distância.',
  ],
  acrostic: [
    {
      letter: 'I',
      color: 'text-[var(--theme-primary)]',
      short: 'ncrível — você é boa em tudo que faz',
      long: 'Sua dedicação, seu esforço e o carinho fazem eu admirar você cada dia mais. Estar ao seu lado me inspira a querer ser alguém melhor todos os dias.',
    },
    {
      letter: 'A',
      color: 'text-[var(--theme-secondary)]',
      short: 'mor — você me mostrou o que é o verdadeiro amor',
      long: 'Com você, amar deixou de ser apenas uma palavra e virou sentimento, cuidado, reciprocidade e paz. Seu amor melhorou a minha vida em todos os sentidos.',
    },
    {
      letter: 'R',
      color: 'text-[var(--theme-accent)]',
      short: 'ara — não é fácil encontrar alguém como você',
      long: 'Quanto mais eu te conheço, mais percebo o quão única e especial você é. Você é como uma joia rara: difícil de encontrar, impossível de substituir.',
    },
    {
      letter: 'A',
      color: 'text-[var(--theme-primary)]',
      short: 'utêntica — a sua essência é única',
      long: 'O seu jeitinho, sua personalidade e a forma sincera com que você vive a vida me deixam completamente apaixonado. Você consegue ser diferente de todo mundo da melhor forma possível.',
    },
  ],
};
