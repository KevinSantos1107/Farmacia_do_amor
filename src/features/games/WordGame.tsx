import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { cn } from '../../shared/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { saveWordGameResult } from '../../services/gameRecords';
import { usePlayerIdentityStore } from '../../store/usePlayerIdentityStore';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { RankingModal } from './ranking/RankingModal';
import {
  Heart,
  HeartCrack,
  Play,
  Delete,
  Check,
  Trophy,
  Flame,
  Target,
  Gamepad2,
  X,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'active' | 'typed';

interface WordData {
  palavra: string;
  mensagem: string;
}
interface Question {
  id: string;
  pergunta: string;
  palavras: WordData[];
}
interface LetterCell {
  letter: string;
  state: LetterState;
}

interface GameStats {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  winsByAttempt: number[]; // índice 0 = 1ª tentativa, 5 = 6ª tentativa
}

// ─── Constants ───────────────────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const MAX_ATTEMPTS = 6;

// ─── Style Maps ──────────────────────────────────────────────────────────────
// Classes estáticas apenas (sem var() em shadows — isso é injetado inline no style prop)
const CELL_BG: Record<LetterState, string> = {
  correct:
    'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.6)] [text-shadow:0_0_8px_rgba(255,255,255,0.8)]',
  present:
    'bg-yellow-500 border-yellow-400 text-white shadow-[0_0_20px_rgba(234,179,8,0.6)] [text-shadow:0_0_8px_rgba(255,255,255,0.8)]',
  absent:
    'bg-slate-400/5 border-slate-600 text-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.1)]',
  empty:
    'bg-[rgba(var(--theme-primary-rgb),0.05)] border-[rgba(var(--theme-primary-rgb),0.3)] text-[var(--theme-primary)]',
  // active usa border-primary (brilhante), bg mais intenso — glow via style prop inline
  active:
    'border-[var(--theme-primary)] text-white',
  typed:
    'bg-[rgba(var(--theme-primary-rgb),0.12)] border-[var(--theme-primary)] text-white',
};

const KEY_BG: Record<string, string> = {
  correct:
    'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] [text-shadow:0_0_8px_rgba(255,255,255,0.7)]',
  present:
    'bg-yellow-500 text-white border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] [text-shadow:0_0_8px_rgba(255,255,255,0.7)]',
  absent:
    'bg-slate-800/80 text-slate-500 border-slate-700/50',
  default:
    'bg-[rgba(var(--theme-primary-rgb),0.05)] text-white/80 border-[rgba(var(--theme-primary-rgb),0.2)] hover:bg-[rgba(var(--theme-primary-rgb),0.15)] hover:border-[var(--theme-primary)] hover:text-white active:scale-[0.92] transition-all',
};

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalizeWord(w: string): string {
  return w
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

function evaluateGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(answer.length).fill('absent');
  const answerArr = answer.split('');
  const guessArr = guess.split('');
  guessArr.forEach((l, i) => {
    if (l === answerArr[i]) {
      result[i] = 'correct';
      answerArr[i] = '*';
    }
  });
  guessArr.forEach((l, i) => {
    if (result[i] === 'correct') return;
    const idx = answerArr.indexOf(l);
    if (idx !== -1) {
      result[i] = 'present';
      answerArr[idx] = '*';
    }
  });
  return result;
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
function getDeviceId(): string {
  let id = localStorage.getItem('wg_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('wg_device_id', id);
  }
  return id;
}

function loadUsedWords(): string[] {
  const deviceId = getDeviceId();
  try {
    const data = JSON.parse(localStorage.getItem('wg_history') || 'null');
    if (data && data.deviceId === deviceId && Array.isArray(data.usedWords)) {
      return data.usedWords;
    }
    // Fallback/Migração do modelo antigo
    const old = JSON.parse(localStorage.getItem('wg_used_words') || '[]');
    if (Array.isArray(old)) return old;
  } catch {}
  return [];
}

function saveUsedWords(u: string[]) {
  const deviceId = getDeviceId();
  localStorage.setItem('wg_history', JSON.stringify({ deviceId, usedWords: u }));
  localStorage.removeItem('wg_used_words'); // Limpa a chave antiga para evitar conflitos
}

export interface ActiveGameState {
  word: string;
  question: string;
  message: string;
  guesses: LetterCell[][];
  currentInput: string;
  cursorPos: number;
}

function loadActiveGame(): ActiveGameState | null {
  const deviceId = getDeviceId();
  try {
    const data = JSON.parse(localStorage.getItem('wg_active_game') || 'null');
    if (data && data.deviceId === deviceId && data.gameState && data.gameState.word) {
      return data.gameState;
    }
  } catch {}
  return null;
}

function saveActiveGame(state: ActiveGameState) {
  const deviceId = getDeviceId();
  localStorage.setItem('wg_active_game', JSON.stringify({ deviceId, gameState: state }));
}

function clearActiveGame() {
  localStorage.removeItem('wg_active_game');
}

// ─── Default questions (fallback) ────────────────────────────────────────────
const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'q1',
    pergunta: 'O que mais gosto em você?',
    palavras: [
      { palavra: 'SORRISO', mensagem: '✨ É isso que eu mais amo em você!' },
      { palavra: 'OLHOS', mensagem: '👀 Seus olhos me encantam!' },
    ],
  },
  {
    id: 'q2',
    pergunta: 'O que sinto quando estou com você?',
    palavras: [
      { palavra: 'FELIZ', mensagem: '😊 Você me faz tão feliz!' },
      { palavra: 'COMPLETO', mensagem: '🧩 Você me completa!' },
    ],
  },
  {
    id: 'q3',
    pergunta: 'O que você é para mim?',
    palavras: [
      { palavra: 'TUDO', mensagem: '❤️ Você é tudo que eu sempre quis!' },
      { palavra: 'AMOR', mensagem: '💖 Você é meu grande amor!' },
    ],
  },
  {
    id: 'q4',
    pergunta: 'O que quero construir com você?',
    palavras: [
      { palavra: 'FUTURO', mensagem: '🏡 Quero todos os meus dias ao seu lado!' },
      { palavra: 'SONHOS', mensagem: '💭 Nossos sonhos juntos!' },
    ],
  },
];

// ─── Confetti Component ──────────────────────────────────────────────────────
function Confetti() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.8 + Math.random() * 1.5,
    size: 4 + Math.random() * 6,
    color: ['var(--theme-primary)', 'var(--theme-secondary)', 'var(--theme-accent)', '#16a34a', '#f59e0b', '#ec4899', '#818cf8'][
      Math.floor(Math.random() * 7)
    ],
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: '-5%',
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            rotate: p.rotation,
          }}
          initial={{ y: 0, opacity: 1 }}
          animate={{
            y: '120vh',
            opacity: [1, 1, 0.8, 0],
            rotate: p.rotation + 720,
            x: [0, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 120],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
}



// ─── Main Component ───────────────────────────────────────────────────────────
export function WordGame() {
  // Questions / game data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const usedWords = useRef<string[]>(loadUsedWords());
  const [_dictLoaded, setDictLoaded] = useState(false);

  // Active round state
  const [currentWord, setCurrentWord] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [wordLength, setWordLength] = useState(5);

  // Grid state
  const [guesses, setGuesses] = useState<LetterCell[][]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState('');
  const [revealingRow, setRevealingRow] = useState(-1);
  const [bounceRow, setBounceRow] = useState(-1);
  const [lastTypedIdx, setLastTypedIdx] = useState(-1);
  const [revealProgress, setRevealProgress] = useState(-1);
  const [showStats, setShowStats] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  // Stats & Streak (initial state is empty, will be hydrated from DB)
  const [stats, setStats] = useState<GameStats>({ gamesPlayed: 0, wins: 0, currentStreak: 0, bestStreak: 0, winsByAttempt: [0,0,0,0,0,0] });
  const statsRef = useRef<GameStats>(stats);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  
  // Jogador atual
  const player = usePlayerIdentityStore((s) => s.player);
  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; }, [player]);
  
  const { config } = useSiteConfigStore();

  // Sync stats from Firestore instead of localStorage
  useEffect(() => {
    import('../auth/playerIds').then(({ getPlayerIds }) => {
      const { p1Id, p2Id } = getPlayerIds(config);
      if (player === p1Id || player === p2Id || player === 'kevin' || player === 'iara') {
      import('../../services/gameRecords').then(({ getWordRecord }) => {
        getWordRecord(player).then(record => {
          if (record) {
            setStats({
              gamesPlayed: record.gamesPlayed,
              wins: record.wins,
              currentStreak: record.streak,
              bestStreak: record.bestStreak,
              winsByAttempt: record.winsByAttempt
            });
          }
        });
      });
      } else {
        // Visitante usa estado vazio / sem persistência
        setStats({ gamesPlayed: 0, wins: 0, currentStreak: 0, bestStreak: 0, winsByAttempt: [0,0,0,0,0,0] });
      }
    });
  }, [player]);

  // ── Load Dictionary ────────────────────────────────────────────────────────
  useEffect(() => {
    if ((window as any).VALID_PT_WORDS_STR) {
      setDictLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = '/assets/data/pt-5-letters.js';
    script.onload = () => setDictLoaded(true);
    script.onerror = () => setDictLoaded(true);
    document.head.appendChild(script);
  }, []);

  const isValidWord = useCallback((guess: string) => {
    const str = (window as any).VALID_PT_WORDS_STR;
    if (!str || str.length === 0) return true;
    let left = 0;
    let right = str.length / 5 - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const w = str.substring(mid * 5, mid * 5 + 5);
      if (w === guess) return true;
      if (w < guess) left = mid + 1;
      else right = mid - 1;
    }
    return false;
  }, []);

  // ── Load Firebase questions ────────────────────────────────────────────────
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
           setTimeout(() => {
             setQuestions(DEFAULT_QUESTIONS);
             setQuestionsLoaded(true);
           }, 600);
           return;
        }

        const snap = await getDocs(query(collection(db, 'word_game'), orderBy('createdAt', 'asc')));
        if (snap.empty) {
          setQuestions(DEFAULT_QUESTIONS);
          setQuestionsLoaded(true);
          return;
        }
        
        const loaded: Question[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.pergunta && data.palavras && Array.isArray(data.palavras)) {
            const valid = data.palavras.filter(
              (p: any) => p.palavra && p.mensagem && normalizeWord(p.palavra).length === 5
            );
            if (valid.length > 0)
              loaded.push({ id: d.id, pergunta: data.pergunta, palavras: valid });
          } else if (
            data.palavra &&
            data.pergunta &&
            data.mensagem &&
            normalizeWord(data.palavra).length === 5
          ) {
            loaded.push({
              id: d.id,
              pergunta: data.pergunta,
              palavras: [{ palavra: data.palavra, mensagem: data.mensagem }],
            });
          }
        });
        
        if (loaded.length > 0) {
          setQuestions(loaded);
        } else {
          setQuestions(DEFAULT_QUESTIONS);
        }
      } catch (e) {
        console.warn('Using default questions', e);
        setQuestions(DEFAULT_QUESTIONS);
      } finally {
        setQuestionsLoaded(true);
      }
    };
    fetchQuestions();
  }, []);

  // ── Start a round ──────────────────────────────────────────────────────────
  const startNewRound = useCallback((qs: Question[]) => {
    if (!questionsLoaded || qs.length === 0) return;

    // Tenta restaurar uma partida em andamento
    const activeGame = loadActiveGame();
    if (activeGame && activeGame.word) {
      const isWon = (activeGame.guesses || []).some((row: LetterCell[]) => row.every(c => c.state === 'correct'));
      const isLost = !isWon && (activeGame.guesses || []).length >= 6;

      setCurrentWord(activeGame.word);
      setCurrentQuestion(activeGame.question);
      setCurrentMessage(activeGame.message);
      setWordLength(activeGame.word.length);
      setGuesses(activeGame.guesses || []);
      setCurrentInput(activeGame.currentInput || '');
      setCursorPos(activeGame.cursorPos || 0);
      setWon(isWon);
      setGameOver(isWon || isLost);
      setRevealingRow(-1);
      setBounceRow(-1);
      setToast('');
      setLastTypedIdx(-1);

      if (isWon || isLost) clearActiveGame();
      return;
    }

    let currentUsed = [...usedWords.current];
    let pool: { question: Question; wordData: WordData; id: string }[] = [];
    
    qs.forEach((q) =>
      q.palavras.forEach((p) => {
        const w = normalizeWord(p.palavra);
        if (w.length === 5) {
          const id = `${q.id}:${w}`;
          if (!currentUsed.includes(id)) pool.push({ question: q, wordData: p, id });
        }
      })
    );

    // Se a pool estiver vazia, significa que todas as palavras foram usadas.
    // Inicia um novo ciclo liberando todas as palavras novamente.
    if (pool.length === 0) {
      currentUsed = [];
      qs.forEach((q) =>
        q.palavras.forEach((p) => {
          const w = normalizeWord(p.palavra);
          if (w.length === 5) pool.push({ question: q, wordData: p, id: `${q.id}:${w}` });
        })
      );
    }

    if (pool.length === 0) return;

    // Seleciona aleatoriamente entre as palavras disponíveis (ainda não usadas neste ciclo)
    const pick = pool[Math.floor(Math.random() * pool.length)];
    
    // Registra como usada
    currentUsed.push(pick.id);
    usedWords.current = currentUsed;
    saveUsedWords(currentUsed);

    const word = normalizeWord(pick.wordData.palavra);
    setCurrentWord(word);
    setCurrentQuestion(pick.question.pergunta);
    setCurrentMessage(pick.wordData.mensagem);
    setWordLength(word.length);
    setGuesses([]);
    setCurrentInput('');
    setGameOver(false);
    setWon(false);
    setRevealingRow(-1);
    setBounceRow(-1);
    setToast('');
    setLastTypedIdx(-1);
    setCursorPos(0);
    
    // Salva imediatamente o estado da nova partida
    saveActiveGame({
      word: word,
      question: pick.question.pergunta,
      message: pick.wordData.mensagem,
      guesses: [],
      currentInput: '',
      cursorPos: 0
    });
  }, [questionsLoaded]);

  useEffect(() => {
    if (questionsLoaded && questions.length > 0 && currentWord === '') {
      startNewRound(questions);
    }
  }, [questionsLoaded, questions, currentWord, startNewRound]);

  // Sincroniza estado atual da partida em andamento
  useEffect(() => {
    if (currentWord && !gameOver && !won) {
      saveActiveGame({
        word: currentWord,
        question: currentQuestion,
        message: currentMessage,
        guesses,
        currentInput,
        cursorPos
      });
    }
  }, [currentWord, currentQuestion, currentMessage, guesses, currentInput, cursorPos, gameOver, won]);

  // ── Keyboard handler ───────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleKey = useCallback(
    (key: string) => {
      if (gameOver || revealingRow >= 0 || currentInput === 'ANIMATING') return;

      let chars = currentInput.split('');
      while (chars.length < wordLength) chars.push(' ');

      // ── BACKSPACE ────────────────────────────────────────────────────────────
      if (key === '⌫' || key === 'BACKSPACE') {
        if (cursorPos < wordLength && chars[cursorPos] !== ' ') {
          // Current tile has a letter -> clear it, don't move cursor
          chars[cursorPos] = ' ';
          setCurrentInput(chars.join('').replace(/ +$/, ''));
          setLastTypedIdx(-1);
        } else if (cursorPos > 0) {
          // Current tile is empty (or we are past the end) -> clear previous tile and move back
          const prev = cursorPos - 1;
          chars[prev] = ' ';
          setCurrentInput(chars.join('').replace(/ +$/, ''));
          setCursorPos(prev);
          setLastTypedIdx(-1);
        }
        return;
      }

      // ── ENTER ────────────────────────────────────────────────────────────────
      if (key === 'ENTER') {
        const inputToValidate = chars.join('');
        if (inputToValidate.includes(' ')) {
          showToast('Preencha todas as letras!');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          return;
        }

        if (wordLength === 5 && !isValidWord(inputToValidate)) {
          showToast('Palavra inválida');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          return;
        }

        const states = evaluateGuess(inputToValidate, currentWord);
        const newRow: LetterCell[] = inputToValidate
          .split('')
          .map((letter, i) => ({ letter, state: states[i] }));
        const newGuesses = [...guesses, newRow];
        setGuesses(newGuesses);

        // Bloqueia o input durante a animação — a linha seguinte só ativa depois
        setCurrentInput('ANIMATING');
        setLastTypedIdx(-1);

        const rowIdx = newGuesses.length - 1;
        setRevealingRow(rowIdx);
        setRevealProgress(0);

        for (let i = 0; i < wordLength; i++) {
          setTimeout(() => {
            setRevealProgress(i + 1);
          }, i * 180 + 250);
        }

        const animationEnd = (wordLength - 1) * 180 + 500 + 100;

        setTimeout(() => {
          setRevealingRow(-1);
          setRevealProgress(-1);

          if (inputToValidate === currentWord) {
            const attemptIdx = newGuesses.length - 1;
            const latestStats = statsRef.current;
            const newWinsByAttempt = [...(latestStats.winsByAttempt || [0,0,0,0,0,0])];
            newWinsByAttempt[attemptIdx] = (newWinsByAttempt[attemptIdx] || 0) + 1;
            const newStats: GameStats = {
              gamesPlayed: latestStats.gamesPlayed + 1,
              wins: latestStats.wins + 1,
              currentStreak: latestStats.currentStreak + 1,
              bestStreak: Math.max(latestStats.bestStreak, latestStats.currentStreak + 1),
              winsByAttempt: newWinsByAttempt,
            };
            setStats(newStats);
            setStats(newStats);
            setBounceRow(rowIdx);
            
            // Pontuação: quanto menos tentativas, mais pontos (1ª tentativa = 6pts, 6ª = 1pt)
            const wordScore = MAX_ATTEMPTS - attemptIdx;
            const currentPlayer = playerRef.current;
            import('../auth/playerIds').then(({ getPlayerIds }) => {
              const { p1Id, p2Id } = getPlayerIds(config);
              if (currentPlayer === p1Id || currentPlayer === p2Id || currentPlayer === 'kevin' || currentPlayer === 'iara') {
                saveWordGameResult(
                  currentPlayer,
                  wordScore,
                  true, // isWin
                  newStats.currentStreak,
                  newStats.bestStreak,
                  newWinsByAttempt
                );
              }
            });
            
            setTimeout(() => {
              setWon(true);
              setGameOver(true);
              clearActiveGame();
              setCurrentInput('');
            }, 600);
          } else if (newGuesses.length >= 6) {
            const latestStats = statsRef.current;
            const newStats: GameStats = {
              ...latestStats,
              gamesPlayed: latestStats.gamesPlayed + 1,
              currentStreak: 0,
            };
            setStats(newStats);
            
            const currentPlayer = playerRef.current;
            import('../auth/playerIds').then(({ getPlayerIds }) => {
              const { p1Id, p2Id } = getPlayerIds(config);
              if (currentPlayer === p1Id || currentPlayer === p2Id || currentPlayer === 'kevin' || currentPlayer === 'iara') {
                saveWordGameResult(
                  currentPlayer,
                  0, // roundScore
                  false, // isWin
                  0, // currentStreak is broken
                  newStats.bestStreak,
                  newStats.winsByAttempt
                );
              }
            });
            setWon(false);
            setGameOver(true);
            clearActiveGame();
            setCurrentInput('');
          } else {
            // Jogo continua — só agora ativa a próxima linha
            setCurrentInput('');
            setCursorPos(0);
          }
        }, animationEnd);
        return;
      }

      // ── LETTER ───────────────────────────────────────────────────────────────
      if (/^[A-ZÁÉÍÓÚÀÂÊÎÔÛÃÕÇ]$/.test(key)) {
        if (cursorPos < wordLength) {
          chars[cursorPos] = key;
          setCurrentInput(chars.join('').replace(/ +$/, ''));
          setLastTypedIdx(cursorPos);
          setCursorPos(Math.min(cursorPos + 1, wordLength));
        }
      }
    },
    [gameOver, revealingRow, currentInput, wordLength, guesses, currentWord, isValidWord, cursorPos]
  );

  // Physical keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      const key = e.key.toUpperCase();
      if (key === 'ENTER') {
        e.preventDefault();
        handleKey(key);
      } else if (key === 'BACKSPACE') {
        handleKey(key);
      } else if (/^[A-ZÁÉÍÓÚÀÂÊÎÔÛÃÕÇ]$/.test(key)) {
        handleKey(key);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [handleKey]);

  // Share logic
  const shareOnWhatsApp = () => {
    // Domínio dinâmico: pega o domínio exato em que o usuário está acessando (sem o https://)
    const siteHost = window.location.host;

    // Codificações exatas dos Emojis para URL (evita qualquer problema de enconding do arquivo)
    const green = '%F0%9F%9F%A9';
    const yellow = '%F0%9F%9F%A8';
    const black = '%E2%AC%9B';
    const heart = '%E2%9D%A4%EF%B8%8F';
    const broken = '%F0%9F%92%94';
    const game = '%F0%9F%8E%AE';
    const link = '%F0%9F%94%97';

    // Monta a grade com os códigos diretamente
    const grid = guesses
      .map((row) =>
        row.map((c) => (c.state === 'correct' ? green : c.state === 'present' ? yellow : black)).join('')
      )
      .join('%0A'); // %0A = quebra de linha

    const resultLine = won
      ? `%22${heart} ${encodeURIComponent('Acertei em ' + guesses.length + ' tentativa' + (guesses.length > 1 ? 's' : '') + '!')}%22`
      : `%22${broken} ${encodeURIComponent('Não consegui dessa vez... a palavra era ' + currentWord)}%22`;

    const encodedMsg = [
      `${game} ${encodeURIComponent('Jogo de Palavras')}`,
      '',
      resultLine,
      '',
      grid,
      '',
      encodeURIComponent('Jogue também acessando:'),
      `${link} ${siteHost}`
    ].join('%0A');

    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
  };

  // ── Build keyboard state ───────────────────────────────────────────────────
  const keyStates: Record<string, string> = {};
  guesses.forEach((row, ri) =>
    row.forEach((cell, ci) => {
      // Don't show keyboard state if the tile hasn't visually flipped yet
      if (ri === revealingRow && ci >= revealProgress) return;
      
      const prev = keyStates[cell.letter];
      if (prev === 'correct') return;
      if (cell.state === 'correct' || prev !== 'correct') keyStates[cell.letter] = cell.state;
    })
  );

  // ── Build grid ─────────────────────────────────────────────────────────────
  const rows: { cells: LetterCell[]; isActive: boolean }[] = [];
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (i < guesses.length) {
      rows.push({ cells: guesses[i], isActive: false });
    } else if (i === guesses.length && !gameOver) {
      const isAnimating = currentInput === 'ANIMATING';
      const cells: LetterCell[] = Array(wordLength)
        .fill(null)
        .map((_, j) => {
          if (isAnimating) return { letter: '', state: 'empty' as LetterState };
          let st: LetterState = 'empty';
          if (j === cursorPos) st = 'active';
          else if (currentInput[j] && currentInput[j] !== ' ') st = 'typed';
          
          return {
            letter: currentInput[j] === ' ' ? '' : (currentInput[j] || ''),
            state: st,
          };
        });
      rows.push({ cells, isActive: !isAnimating });
    } else {
      rows.push({
        cells: Array(wordLength).fill({ letter: '', state: 'empty' as LetterState }),
        isActive: false,
      });
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!currentWord)
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm">Carregando jogo...</span>
        </motion.div>
      </div>
    );

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center h-full relative select-none">
      {/* ── Header / Stats ─────────────────────────────────────────────────── */}
      <div className="flex items-center w-full justify-between px-4 py-1.5">
        {/* Título minimalista */}
        <div className="flex items-center gap-1.5 opacity-50">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          />
          <span className="text-xs uppercase tracking-wide font-semibold text-white/40">Palavras</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Trophy / Ranking button */}
          <button
            onClick={() => setShowRanking(true)}
            className={cn(
              'flex items-center justify-center rounded-full w-9 h-9 transition-all duration-300 border',
              'bg-white/[0.03] border-white/10 hover:border-yellow-400 hover:shadow-[0_0_12px_rgba(250,204,21,0.2)] active:scale-90'
            )}
            title="Ranking do Casal"
            style={{ touchAction: 'manipulation' }}
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          </button>

          {/* Streak / Stats button */}
          <button
            onClick={() => setShowStats(true)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-all duration-300 border',
              'bg-white/[0.03] border-white/10 hover:border-[var(--theme-primary)] hover:shadow-[0_0_12px_rgba(var(--theme-primary-rgb),0.2)]',
              stats.currentStreak > 0 &&
                'border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
            )}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-white/80 text-xs">{stats.currentStreak}</span>
          </button>
        </div>
      </div>

      {/* ── Question ───────────────────────────────────────────────────────── */}
      <div className="w-full text-center px-6 pt-0 pb-2 relative">
        {/* Linha decorativa */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-px opacity-50"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        />
        <p
          className="text-xs leading-relaxed tracking-wide text-white/60 font-medium italic"
        >
          "{currentQuestion}"
        </p>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -12, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-[110px] z-50 px-4 py-2 rounded-full font-semibold text-xs text-white/90 backdrop-blur-md shadow-lg"
            style={{
              background: 'rgba(var(--theme-primary-rgb), 0.15)',
              border: '1px solid rgba(var(--theme-primary-rgb), 0.3)',
              boxShadow: '0 0 20px rgba(var(--theme-primary-rgb), 0.2)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Board ──────────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col gap-[5px] items-center py-1 flex-1 justify-center">
        {/* Fundo atmosférico do board */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, rgba(var(--theme-primary-rgb), 0.04) 0%, transparent 70%)`,
          }}
        />

        {rows.map((row, ri) => (
          <div
            key={ri}
            className={cn(
              'flex gap-[5px] transition-all duration-300 relative',
              shake && ri === guesses.length && 'wg-shake',
              !row.isActive && ri >= guesses.length && 'opacity-20 scale-[0.97]'
            )}
          >
            {row.cells.map((cell, ci) => {
              const isRevealing = ri === revealingRow;
              const isBouncing = ri === bounceRow;
              const isJustTyped = row.isActive && ci === lastTypedIdx && cell.letter !== '';

              let visualState = cell.state;
              if (isRevealing && ci >= revealProgress) {
                visualState = 'typed';
              }

              // Shadows dinâmicos via style inline.
              // IMPORTANTE: não usar rgba(var(...)) aqui — o browser rejeita var() aninhado em rgba() via element.style.
              // Usamos var(--theme-primary) direto no box-shadow, que funciona corretamente.
              const getDynamicStyle = (state: LetterState): React.CSSProperties => {
                const delay = isRevealing
                  ? `${ci * 180}ms`
                  : isBouncing
                    ? `${ci * 80}ms`
                    : '0ms';

                if (state === 'active') {
                  return {
                    animationDelay: delay,
                    backgroundColor: 'rgba(var(--theme-primary-rgb), 0.18)',
                    boxShadow: '0 0 0 1px var(--theme-primary), 0 0 20px var(--theme-primary), 0 0 40px var(--theme-primary)',
                    textShadow: '0 0 8px rgba(255,255,255,0.9)',
                  };
                }
                if (state === 'typed') {
                  return {
                    animationDelay: delay,
                    boxShadow: '0 0 12px var(--theme-primary)',
                    textShadow: '0 0 8px rgba(255,255,255,0.8)',
                  };
                }
                if (state === 'empty') {
                  return {
                    animationDelay: delay,
                    boxShadow: '0 0 6px var(--theme-primary)',
                  };
                }
                return { animationDelay: delay };
              };

              return (
                <div
                  key={ci}
                  className="wg-tile-wrapper cursor-pointer"
                  style={{ animationDelay: isBouncing ? `${ci * 80}ms` : '0ms' }}
                  onClick={() => {
                    if (row.isActive && !gameOver) {
                      setCursorPos(ci);
                    }
                  }}
                >
                  <div
                    className={cn(
                      'wg-tile',
                      isRevealing && 'wg-flip',
                      isBouncing && 'wg-bounce',
                      isJustTyped && 'wg-pop',
                      CELL_BG[visualState]
                    )}
                    style={getDynamicStyle(visualState)}
                  >
                    {cell.letter}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Action Buttons + Keyboard ───────────────────────────────────────── */}
      <div className="w-full pb-2 pt-0.5 px-2">
        {/* Botões de apagar e confirmar */}
        <div className="flex items-center justify-center gap-5 mb-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleKey('BACKSPACE'); }}
            className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 group"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.08)',
            }}
          >
            <Delete className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(239, 68, 68, 0.06)' }} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleKey('ENTER'); }}
            className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 group"
            style={{
              background: 'rgba(52, 211, 153, 0.08)',
              border: '1.5px solid rgba(52, 211, 153, 0.35)',
              boxShadow: '0 0 20px rgba(52, 211, 153, 0.12)',
            }}
          >
            <Check className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" strokeWidth={2.5} />
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(52, 211, 153, 0.06)' }} />
          </button>
        </div>

        {/* Linha divisória com glow */}
        <div className="relative flex items-center justify-center mb-2">
          <div className="w-full h-px bg-white/5" />
          <div
            className="absolute w-20 h-px"
            style={{
              background: `linear-gradient(to right, transparent, rgba(var(--theme-primary-rgb), 0.4), transparent)`,
            }}
          />
        </div>

        {/* Teclado */}
        <div className="flex flex-col gap-[5px] items-center w-full px-1">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-[3px] w-full justify-center">
              {ri === 1 && <div style={{ flex: 0.5 }} />}
              {ri === 2 && <div style={{ flex: 1.5 }} />}
              {row.map((key) => {
                const state = keyStates[key];
                return (
                  <button
                    key={key}
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={(e) => { e.stopPropagation(); handleKey(key); }}
                    className={cn(
                      'border rounded-[7px] font-semibold uppercase select-none flex items-center justify-center transition-all duration-150',
                      KEY_BG[state || 'default']
                    )}
                    style={{ flex: 1, height: 'clamp(38px, 10.5vw, 50px)' }}
                  >
                    <span className="text-[12px]">{key}</span>
                  </button>
                );
              })}
              {ri === 1 && <div style={{ flex: 0.5 }} />}
              {ri === 2 && <div style={{ flex: 1.5 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Game Over Overlay ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[rgba(7,5,15,0.92)] backdrop-blur-xl rounded-2xl overflow-hidden"
          >
            {won && <Confetti />}

            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.1 }}
              className="flex flex-col items-center text-center max-w-sm w-full px-6 z-20 relative"
            >
              {won ? (
                <>
                  {/* Victory icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-5 relative"
                    style={{
                      background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                      boxShadow: '0 0 50px rgba(var(--theme-primary-rgb), 0.5)',
                    }}
                  >
                    <Heart className="w-10 h-10 text-white fill-current" />
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-theme-primary" />
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-theme-primary to-theme-secondary mb-1"
                  >
                    Parabéns! 🎉
                  </motion.h2>

                  {/* Word */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="text-white/70 text-sm mb-1"
                  >
                    A palavra era
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl font-black text-white uppercase tracking-widest mb-4"
                  >
                    {currentWord}
                  </motion.p>

                  {/* Message */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-theme-secondary font-medium text-base mb-2 italic text-balance leading-relaxed"
                  >
                    {currentMessage}
                  </motion.p>

                  {/* Attempts badge */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center gap-1.5 text-white/40 text-xs mb-6"
                  >
                    <Target className="w-3.5 h-3.5" />
                    Acertou em {guesses.length}/{MAX_ATTEMPTS} tentativa{guesses.length > 1 ? 's' : ''}
                  </motion.div>

                  {/* Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex w-full gap-3"
                  >
                    <button
                      onClick={() => startNewRound(questions)}
                      className="flex-1 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                        boxShadow: '0 4px 20px rgba(var(--theme-primary-rgb), 0.35)',
                      }}
                    >
                      <Play className="w-4 h-4 fill-current" /> Próxima
                    </button>
                    <button
                      onClick={shareOnWhatsApp}
                      className="flex-1 py-3.5 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] hover:border-[var(--theme-primary)] text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                    >
                      <WhatsAppIcon className="w-4 h-4" /> Enviar
                    </button>
                  </motion.div>
                </>
              ) : (
                <>
                  {/* Defeat icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                    className="w-20 h-20 bg-[var(--theme-card-bg)] border-2 border-rose-500/40 rounded-full flex items-center justify-center mb-5"
                    style={{ boxShadow: '0 0 40px rgba(244,63,94,0.2)' }}
                  >
                    <HeartCrack className="w-10 h-10 text-rose-400" />
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="text-2xl font-bold text-white mb-2"
                  >
                    Quase lá!
                  </motion.h2>

                  {/* Word */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="mb-6"
                  >
                    <p className="text-white/50 text-sm mb-1">A palavra era</p>
                    <p className="text-xl font-black text-theme-primary uppercase tracking-widest">
                      {currentWord}
                    </p>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55 }}
                    className="text-white/40 text-sm mb-8"
                  >
                    Não desista! Tente a próxima 💪
                  </motion.p>

                  {/* Button */}
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                    onClick={() => startNewRound(questions)}
                    className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                      boxShadow: '0 4px 20px rgba(var(--theme-primary-rgb), 0.3)',
                    }}
                  >
                    <Play className="w-4 h-4 fill-current" /> Próxima Palavra
                  </motion.button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats Modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[rgba(7,5,15,0.8)] backdrop-blur-md rounded-2xl overflow-hidden p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowStats(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-white mb-6 text-center">Estatísticas</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl">
                  <Flame className="w-6 h-6 text-orange-400 mb-1" />
                  <span className="text-2xl font-black text-white">{stats.currentStreak}</span>
                  <span className="text-xs text-white/50 uppercase">Streak Atual</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl">
                  <Trophy className="w-6 h-6 text-yellow-400 mb-1" />
                  <span className="text-2xl font-black text-white">{stats.bestStreak}</span>
                  <span className="text-xs text-white/50 uppercase">Recorde</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl">
                  <Gamepad2 className="w-6 h-6 text-[var(--theme-primary)] mb-1" />
                  <span className="text-2xl font-black text-white">{stats.gamesPlayed}</span>
                  <span className="text-xs text-white/50 uppercase">Jogados</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl">
                  <Check className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-2xl font-black text-white">
                    {stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0}%
                  </span>
                  <span className="text-xs text-white/50 uppercase">Vitórias</span>
                </div>
              </div>

              {/* Distribuição de Vitórias */}
              <div className="w-full mb-6">
                <h4 className="text-white/80 font-bold mb-3 text-sm">Distribuição de Vitórias</h4>
                <div className="flex flex-col gap-1.5 w-full">
                  {(stats.winsByAttempt || [0,0,0,0,0,0]).map((count, i) => {
                    const maxCount = Math.max(...(stats.winsByAttempt || [0,0,0,0,0,0]), 1);
                    const widthPercent = Math.max(7, Math.round((count / maxCount) * 100));
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/60 font-bold">
                        <span className="w-3 text-right">{i + 1}</span>
                        <div className="flex-1 h-5 bg-white/5 rounded-sm overflow-hidden">
                          <div
                            className="h-full flex items-center justify-end px-2 text-white transition-all duration-500"
                            style={{
                              width: `${widthPercent}%`,
                              background: count > 0 ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)',
                            }}
                          >
                            {count}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <button
                onClick={() => setShowStats(false)}
                className="w-full py-3 bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] text-white font-bold rounded-xl transition-all"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inline Styles ──────────────────────────────────────────────────── */}
      <style>{`
        /* ── Tile sizing ────────────────────────────────────────── */
        .wg-tile-wrapper {
          width: clamp(40px, min(11.5vw, 8.5dvh), 60px);
          height: clamp(40px, min(11.5vw, 8.5dvh), 60px);
          position: relative;
          perspective: 900px;
        }

        .wg-tile {
          position: absolute;
          inset: 0;
          border-width: 1.5px;
          border-style: solid;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: clamp(15px, min(4vw, 3dvh), 22px);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border-radius: 9px;
          transition: background-color 0.25s, border-color 0.25s, box-shadow 0.25s, color 0.25s;
          transform-style: preserve-3d;
          will-change: transform;
        }


        /* ── Pop-in animation (typing) ────────────────────── */
        .wg-pop {
          animation: wg-pop-in 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes wg-pop-in {
          0% { transform: scale(0.85); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        /* ── Flip animation (reveal) ──────────────────────── */
        .wg-flip {
          animation: wg-flip-reveal 0.5s ease-in-out both;
        }

        @keyframes wg-flip-reveal {
          0% { transform: rotateX(0deg); }
          45% { transform: rotateX(-90deg); }
          55% { transform: rotateX(-90deg); }
          100% { transform: rotateX(0deg); }
        }

        /* ── Bounce animation (victory) ──────────────────── */
        .wg-bounce {
          animation: wg-bounce-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes wg-bounce-up {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-20px); }
          60% { transform: translateY(-10px); }
        }

        /* ── Shake animation (invalid) ────────────────────── */
        .wg-shake {
          animation: wg-shake 0.45s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes wg-shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-6px); }
          30%, 70% { transform: translateX(6px); }
        }
      `}</style>

      <RankingModal
        isOpen={showRanking}
        onClose={() => setShowRanking(false)}
        initialGame="word"
      />
    </div>
  );
}
