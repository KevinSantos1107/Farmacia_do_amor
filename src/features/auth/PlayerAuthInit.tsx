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
import { getTopToastOffset } from '../../shared/utils/safeArea';


export function PlayerAuthInit() {
  const { setPlayer, setTokenId, setUid, setTokenStatus, clearSession } = usePlayerIdentityStore();
  const { config } = useSiteConfigStore();
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
    // Prossegue assim que o config estiver disponível (seja do cache local ou do servidor)
    if (!config) return;

    let isSubscribed = true;
    let unsubscribeSnapshot: (() => void) | null = null;

    const { p1Id, p2Id } = getPlayerIds(config);
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const { tokenId: storedTokenId, player: currentPlayer } = usePlayerIdentityStore.getState();

    // Helper para remover o token da URL sem recarregar a página
    const cleanUrlToken = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        const newUrl = url.pathname + (url.search ? url.search : '') + url.hash;
        const currentState =
          window.history.state && typeof window.history.state === 'object'
            ? window.history.state
            : {};
        window.history.replaceState({ ...currentState, path: newUrl }, '', newUrl);
      } catch (err) {
        console.warn('Erro ao limpar token da URL:', err);
      }
    };

    // Revoga o acesso, limpando credenciais locais e forçando a tela de bloqueio
    const handleRevoke = () => {
      if (!isSubscribed) return;
      clearSession();
      sessionStorage.removeItem('greeted');
      setTokenStatus('unauthorized');
    };

    // 1. Otimização de carregamento instantâneo:
    // Se não há token na URL, mas já temos um token armazenado válido e jogador reconhecido,
    // autoriza de imediato para não piscar a tela, mas inicia a validação no Firestore logo em seguida.
    if (!urlToken && storedTokenId && (currentPlayer === p1Id || currentPlayer === p2Id)) {
      setTokenStatus('authorized');
      if (!sessionStorage.getItem('greeted')) {
        const syncMsg = getWelcomeMessage(currentPlayer, config);
        showGreeting(syncMsg);
      }
    } else if (!urlToken && !storedTokenId && currentPlayer === 'visitante') {
      setTokenStatus('unauthorized');
    }

    const initAuth = async () => {
      try {
        let uid = auth.currentUser?.uid || '';
        // Garante autenticação anônima em background (necessária para regras do Firestore)
        if (!uid) {
          try {
            const userCredential = await signInAnonymously(auth);
            uid = userCredential.user.uid;
          } catch (error) {
            console.error('Erro ao autenticar anonimamente:', error);
          }
        }
        if (uid && isSubscribed) {
          setUid(uid);
        }

        // Determina qual token verificar (prioridade para a URL, fallback para o store)
        let tokenToVerify = urlToken || storedTokenId;

        // Migração legacy: se não há token na URL nem no store, tenta recuperar via player_links/{uid}
        if (!tokenToVerify && uid) {
          try {
            const linkSnap = await getDoc(siteDoc('player_links', uid));
            if (linkSnap.exists()) {
              const linkData = linkSnap.data();
              if (linkData?.tokenId) {
                tokenToVerify = linkData.tokenId as string;
              }
            }
          } catch (e) {
            console.warn('Erro ao consultar player_links para migração:', e);
          }
        }

        // Se não há token ativo em nenhum lugar, revoga o acesso
        if (!tokenToVerify) {
          if (isSubscribed) {
            handleRevoke();
          }
          return;
        }

        // Valida o token diretamente no Firestore
        const tokenRef = siteDoc('player_tokens', tokenToVerify);
        const tokenSnap = await getDoc(tokenRef);

        if (!isSubscribed) return;

        if (tokenSnap.exists()) {
          const data = tokenSnap.data();
          if (data.player === p1Id || data.player === p2Id) {
            const currentPlayerId = data.player as string;

            // Grava o vínculo no Firestore usando o token como prova de identidade
            if (uid) {
              try {
                const { setDoc } = await import('firebase/firestore');
                await setDoc(siteDoc('player_links', uid), {
                  player: currentPlayerId,
                  tokenId: tokenToVerify,
                });
              } catch (linkErr) {
                console.warn('Erro ao salvar player_links:', linkErr);
              }
            }

            setPlayer(currentPlayerId);
            setTokenId(tokenToVerify);
            setTokenStatus('authorized');

            if (!sessionStorage.getItem('greeted')) {
              const syncMsg = getWelcomeMessage(currentPlayerId, config);
              showGreeting(syncMsg);
            }

            // Listener em tempo real: se o administrador excluir o token em /admin/tokens,
            // o usuário conectado é desconectado instantaneamente.
            try {
              const { onSnapshot } = await import('firebase/firestore');
              if (isSubscribed) {
                unsubscribeSnapshot = onSnapshot(
                  tokenRef,
                  (snap) => {
                    if (!snap.exists()) {
                      console.warn('[PlayerAuthInit] Token foi revogado ou excluído em tempo real.');
                      handleRevoke();
                    }
                  },
                  (snapErr) => {
                    console.warn('[PlayerAuthInit] Erro no listener do token:', snapErr);
                    if (snapErr.code === 'permission-denied') {
                      handleRevoke();
                    }
                  }
                );
              }
            } catch (snapInitErr) {
              console.warn('[PlayerAuthInit] Falha ao registrar onSnapshot:', snapInitErr);
            }
          } else {
            console.warn('[PlayerAuthInit] Token associado a jogador desconhecido:', data.player);
            handleRevoke();
          }
        } else {
          // Token foi excluído do Firestore ou é inválido!
          console.warn('[PlayerAuthInit] Token inválido, inexistente ou revogado.');
          handleRevoke();
        }
      } catch (error) {
        console.error('[PlayerAuthInit] Erro ao verificar o token:', error);
        if (isSubscribed) {
          const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
          const currentToken = usePlayerIdentityStore.getState().tokenId;
          const currentP = usePlayerIdentityStore.getState().player;
          // Em caso de offline, se o usuário já possuía token armazenado e jogador válido, mantém temporariamente
          if (isOffline && currentToken && (currentP === p1Id || currentP === p2Id)) {
            setTokenStatus('authorized');
          } else {
            handleRevoke();
          }
        }
      } finally {
        if (urlToken && isSubscribed) {
          cleanUrlToken();
        }
      }
    };

    initAuth();

    return () => {
      isSubscribed = false;
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [setPlayer, setTokenId, setUid, setTokenStatus, clearSession, config]);

  const [topOffset, setTopOffset] = useState(() => getTopToastOffset());

  useEffect(() => {
    const updateOffset = () => setTopOffset(getTopToastOffset());
    window.addEventListener('resize', updateOffset);
    window.addEventListener('orientationchange', updateOffset);
    return () => {
      window.removeEventListener('resize', updateOffset);
      window.removeEventListener('orientationchange', updateOffset);
    };
  }, []);

  return (
    <AnimatePresence>
      {welcomeMsg && (
        <motion.div
          key={welcomeMsg}
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          style={{ top: topOffset }}
          className="fixed left-1/2 -translate-x-1/2 z-[9999] pointer-events-none w-max max-w-[90vw]"
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
