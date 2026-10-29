import { useEffect, useState } from 'react';
import { getDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../../services/firebase/config';
import { siteDoc } from '../../services/firestore/paths';
import { usePlayerIdentityStore } from '../../store/usePlayerIdentityStore';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { getWelcomeMessage } from './welcomeMessage';
import { getPlayerIds } from './playerIds';
import { AnimatePresence, motion } from 'framer-motion';


export function PlayerAuthInit() {
  const { setPlayer, setUid, setTokenStatus } = usePlayerIdentityStore();
  const { config, isLoading } = useSiteConfigStore();
  const [welcomeMsg, setWelcomeMsg] = useState<string | null>(null);
  const [isCelebration, setIsCelebration] = useState(false);

  const showGreeting = (msg: string) => {
    // Detect if this is a special-day message (birthday, anniversary, holiday)
    const special = /feliz|natal|ano novo|namorados|mulher|mês|aniversário|valentine/i.test(msg);
    setIsCelebration(special);
    setWelcomeMsg(msg);
    sessionStorage.setItem('greeted', 'true');
    // Show longer for celebrations
    setTimeout(() => setWelcomeMsg(null), special ? 7000 : 5000);
  };

  useEffect(() => {
    // Só prossegue quando o config estiver carregado!
    if (isLoading || !config) return;

    const { p1Id, p2Id } = getPlayerIds(config);

    const initAuth = async () => {
      let uid = auth.currentUser?.uid || '';
      // 1. Só autentica anonimamente se não houver usuário logado ainda
      if (!uid) {
        try {
          const userCredential = await signInAnonymously(auth);
          uid = userCredential.user.uid;
        } catch (error) {
          console.error('Erro ao autenticar anonimamente:', error);
        }
      }
      if (uid) {
        setUid(uid);
      }

      // 2. Check for token in URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (token) {
        try {
          // Verify token in Firestore
          const tokenRef = siteDoc('player_tokens', token);
          const tokenSnap = await getDoc(tokenRef);
          
          if (tokenSnap.exists()) {
            const data = tokenSnap.data();
            if (data.player === p1Id || data.player === p2Id) {
              const currentPlayerId = data.player;

              // Grava o vínculo no Firestore usando o token como prova de identidade (Fase 3)
              if (uid) {
                const { setDoc } = await import('firebase/firestore');
                await setDoc(siteDoc('player_links', uid), {
                  player: currentPlayerId,
                  tokenId: token
                });
              }

              setPlayer(currentPlayerId);
              setTokenStatus('authorized');

              // Show sync message immediately
              const syncMsg = getWelcomeMessage(currentPlayerId, config);
              showGreeting(syncMsg);
            } else {
              setPlayer('visitante');
              setTokenStatus('unauthorized');
            }
          } else {
            console.warn('Token inválido ou expirado.');
            setPlayer('visitante');
            setTokenStatus('unauthorized');
          }
        } catch (error) {
          console.error('Erro ao verificar o token:', error);
          // Se houve erro de rede, mas já tem player conhecido no store, não bloqueia
          const currentP = usePlayerIdentityStore.getState().player;
          if (currentP === p1Id || currentP === p2Id) {
            setTokenStatus('authorized');
          } else {
            setTokenStatus('unauthorized');
          }
        } finally {
          // Remove token from URL securely sem refresh
          const newUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
          const currentState = (window.history.state && typeof window.history.state === 'object')
            ? window.history.state
            : {};
          window.history.replaceState({ ...currentState, path: newUrl }, '', newUrl);
        }
      } else {
        // Se não tem token na URL, verifica se já é um jogador conhecido (salvo no Zustand/localStorage)
        const currentPlayer = usePlayerIdentityStore.getState().player;
        if (currentPlayer === p1Id || currentPlayer === p2Id) {
          setTokenStatus('authorized');
          if (!sessionStorage.getItem('greeted')) {
            const syncMsg = getWelcomeMessage(currentPlayer, config);
            showGreeting(syncMsg);
          }
        } else {
          setTokenStatus('unauthorized');
        }
      }
    };

    initAuth();
  }, [setPlayer, setUid, setTokenStatus, config, isLoading]);

  return (
    <AnimatePresence>
      {welcomeMsg && (
        <motion.div
          key={welcomeMsg}
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none w-max max-w-[90vw]"
        >
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border ${
              isCelebration
                ? 'bg-gradient-to-r from-pink-900/80 to-purple-900/80 border-pink-500/40 shadow-[0_0_40px_rgba(236,72,153,0.35)]'
                : 'bg-white/10 border-white/20 shadow-[0_0_30px_rgba(236,72,153,0.2)]'
            } backdrop-blur-xl`}
          >
            {isCelebration && (
              <motion.span
                animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 2 }}
                className="text-xl flex-shrink-0"
              >
                🎉
              </motion.span>
            )}
            <span
              className={`font-medium tracking-wide font-sans text-sm md:text-base ${
                isCelebration ? 'text-pink-100' : 'text-white'
              }`}
            >
              {welcomeMsg}
            </span>
          </div>

          {/* Celebration glow ring */}
          {isCelebration && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{ boxShadow: ['0 0 0px rgba(236,72,153,0)', '0 0 25px rgba(236,72,153,0.5)', '0 0 0px rgba(236,72,153,0)'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
