import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { CheckCircle2, XCircle, Flame, Clock } from 'lucide-react';
import { useQuizStore } from '../store/useQuizStore';

const TIMER_SECONDS = 20;

// Points based on remaining time (linear calculation)
function getPoints(elapsedSeconds: number): number {
  const timeLeft = Math.max(0, TIMER_SECONDS - elapsedSeconds);
  return Math.max(30, Math.round((timeLeft / TIMER_SECONDS) * 100));
}

// Color based on fraction remaining (1 = green, 0 = red)
function timerColor(fraction: number): string {
  const hue = Math.round(fraction * 120); // 120 = green, 0 = red
  return `hsl(${hue}, 85%, 55%)`;
}

export function QuizPlay() {
  const { 
    questions, currentIndex, score, currentCombo, 
    answerQuestion, advanceQuestion 
  } = useQuizStore();
  
  const question = questions[currentIndex];
  
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayTime, setDisplayTime] = useState(TIMER_SECONDS);
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);

  // Track exact start time for precise elapsed calculation
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guard against double-advance: cleared every time currentIndex changes
  const advanceScheduledRef = useRef(false);
  // Guard against double setTimeout call surviving across renders
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Framer Motion animation controls for smooth continuous bar
  const barControls = useAnimation();
  
  const isAnimatingRef = useRef(false);

  const stopTimer = () => {
    barControls.stop(); // freezes bar at current position
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  /** Agenda advanceQuestion() garantindo que só dispara UMA vez por pergunta. */
  const scheduleAdvance = () => {
    if (advanceScheduledRef.current) return; // já agendado
    advanceScheduledRef.current = true;
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = setTimeout(() => advanceQuestion(), 1800);
  };

  const handleTimeUp = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    stopTimer();
    setIsAnimating(true);
    setSelectedOptionId('__timeout__');
    setEarnedPoints(-50);
    answerQuestion(false, -50);
    scheduleAdvance();
  };

  // Reset and start everything when question changes
  useEffect(() => {
    setSelectedOptionId(null);
    setIsAnimating(false);
    isAnimatingRef.current = false;
    advanceScheduledRef.current = false;  // libera o guard para a nova pergunta
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);  // cancela avanço pendente da pergunta anterior
      advanceTimeoutRef.current = null;
    }
    setDisplayTime(TIMER_SECONDS);
    setEarnedPoints(null);
    startTimeRef.current = Date.now();

    // Restart smooth bar animation from 100% → 0% over exactly TIMER_SECONDS
    barControls.set({ width: '100%' });
    barControls.start({
      width: '0%',
      transition: { duration: TIMER_SECONDS, ease: 'linear' },
    });

    // Interval for both the digit counter and the exact timeout trigger
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, Math.ceil(TIMER_SECONDS - elapsed));
      setDisplayTime(remaining);
      
      if (remaining <= 0 && !isAnimatingRef.current) {
        handleTimeUp();
      }
    }, 250); // Checks more frequently for precision

    return () => stopTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  if (!question) return null;

  const handleOptionClick = (optionId: string) => {
    if (isAnimatingRef.current) return;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    stopTimer();

    isAnimatingRef.current = true;
    setSelectedOptionId(optionId);
    setIsAnimating(true);

    const isCorrect = optionId === question.correctOptionId;
    const pts = isCorrect ? getPoints(elapsed) : 0;
    setEarnedPoints(isCorrect ? pts : null);
    answerQuestion(isCorrect, pts);

    scheduleAdvance();
  };

  const isCorrectOption = (id: string) => id === question.correctOptionId;
  const timerFraction = displayTime / TIMER_SECONDS;
  const color = timerColor(timerFraction);

  return (
    <div className="flex-1 flex flex-col h-full w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-white/60 font-mono text-sm">
          Pergunta {currentIndex + 1} / {questions.length}
        </div>
        <div className="flex items-center gap-4">
          {currentCombo >= 2 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              key={currentCombo}
              className="flex items-center gap-1 text-orange-400 font-bold text-sm"
            >
              <Flame className="w-4 h-4" /> x{currentCombo}
            </motion.div>
          )}
          <div className="font-mono text-[var(--theme-primary)] font-bold">
            {score} pts
          </div>
        </div>
      </div>

      {/* Timer — continuous bar + digit */}
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-4 h-4 shrink-0 transition-colors duration-500" style={{ color }} />
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            animate={barControls}
            style={{ backgroundColor: color }}
          />
        </div>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={displayTime}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="font-mono text-sm font-bold w-6 text-right tabular-nums"
            style={{ color }}
          >
            {displayTime}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col justify-center"
        >
          <h3 className="text-2xl md:text-3xl font-serif font-bold text-white mb-8 text-center leading-tight">
            {question.question}
          </h3>

          <div className="flex flex-col gap-3">
            {question.options.map(opt => {
              const isSelected = selectedOptionId === opt.id;
              const isRight = isSelected && isCorrectOption(opt.id);
              const isWrong = isSelected && !isCorrectOption(opt.id);
              // Only reveal right answer if user actually clicked an option, not on timeout
              const revealRight = isAnimating && isCorrectOption(opt.id) && !isSelected && selectedOptionId !== '__timeout__';
              
              let btnClass = "relative w-full p-4 rounded-2xl text-left transition-all border border-white/10 overflow-hidden ";
              if (!isAnimating) {
                btnClass += "bg-white/5 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]";
              } else if (isRight || revealRight) {
                btnClass += "bg-green-500/20 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]";
              } else if (isWrong) {
                btnClass += "bg-red-500/20 border-red-500/50";
              } else {
                btnClass += "bg-white/5 opacity-50";
              }

              return (
                <motion.button
                  key={opt.id}
                  onClick={() => handleOptionClick(opt.id)}
                  disabled={isAnimating}
                  animate={isWrong ? { x: [-5, 5, -5, 5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className={btnClass}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-white md:text-lg">{opt.text}</span>
                    {isAnimating && (isRight || revealRight) && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      </motion.div>
                    )}
                    {isAnimating && isWrong && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <XCircle className="w-6 h-6 text-red-400" />
                      </motion.div>
                    )}
                  </div>
                  {isRight && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="absolute inset-0 bg-green-500/10 pointer-events-none"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Feedback */}
          <div className="h-14 mt-4 flex items-center justify-center">
            <AnimatePresence>
              {isAnimating && selectedOptionId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center flex flex-col items-center gap-1"
                >
                  {selectedOptionId === '__timeout__' ? (
                    <>
                      <p className="text-yellow-300 font-bold">Tempo esgotado! ⏱️</p>
                      {earnedPoints !== null && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-xs font-mono text-red-400"
                        >
                          {earnedPoints} pts
                        </motion.span>
                      )}
                    </>
                  ) : isCorrectOption(selectedOptionId) ? (
                    <>
                      <p className="text-green-400 font-bold">Você lembra mesmo! ❤️</p>
                      {earnedPoints !== null && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-xs font-mono text-green-300"
                        >
                          +{earnedPoints} pts
                        </motion.span>
                      )}
                    </>
                  ) : (
                    <p className="text-red-300">Quase! Essa memória escapou 😅</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
