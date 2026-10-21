import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { query, getDocs } from 'firebase/firestore';
import { siteCollection } from '../../services/firestore/paths';
import { Timeline } from './Timeline';
import type { TimelineEvent } from './Timeline';
import { X, Clock } from 'lucide-react';
import { Spinner } from '../../shared/ui/Spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { lockBodyScroll } from '../../shared/utils/scrollLock';
import { useOverlayHistory } from '../../shared/hooks/useOverlayHistory';

// ─── Modal via Portal (bypasses overflow-x-hidden stacking context) ────────────
export function TimelineModalContent({
  events,
  loading,
  onClose,
}: {
  events: TimelineEvent[];
  loading: boolean;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const isDedicatedRoute = typeof window !== 'undefined' && 
    (window.location.pathname === '/timeline' || window.location.pathname === '/historia' || window.location.pathname === '/nossa-historia');

  const { handleDismiss: overlayDismiss } = useOverlayHistory({
    id: 'timeline-modal',
    isOpen: !isDedicatedRoute,
    onClose,
  });

  const handleDismiss = () => {
    if (isDedicatedRoute) {
      onClose();
    } else {
      overlayDismiss();
    }
  };

  useEffect(() => {
    const unlock = lockBodyScroll();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => {
      unlock();
      window.removeEventListener('keydown', onKey);
    };
  }, [handleDismiss]);

  const modal = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.4)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#fff', fontFamily: 'serif' }}>
              Nossa História
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Cada momento juntos é um capítulo especial
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Fechar"
          title="Fechar"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>
      </div>

      {/* Body com scroll */}
      <div
        ref={scrollRef}
        className="no-scrollbar"
        style={{ flex: 1, overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
            <Spinner size="lg" />
          </div>
        ) : (
          <Timeline events={events} />
        )}
      </div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export function TimelineModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(siteCollection('timeline')));
      const loaded: (TimelineEvent & { orderIndex?: number })[] = [];
      snap.forEach((doc) => {
        if (doc.id.startsWith('_')) return;
        const d = doc.data();
        loaded.push({
          id: doc.id,
          date: d.date,
          title: d.title,
          description: d.caption || d.description || '',
          location: d.location,
          photoUrl: d.photoLarge || d.photo,
          publicId: d.publicId,
          secretMessage: typeof d.secret === 'string' ? d.secret : (d.secretMessage || ''),
          orderIndex: d.orderIndex ?? 0,
        });
      });
      loaded.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      setEvents(loaded);
      
    } catch (e) {
      console.error('Erro ao carregar timeline:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchEvents();
  };

  const handleClose = () => setIsOpen(false);

  return (
    <>
      {/* Botão de abertura */}
      <button
        onClick={handleOpen}
        className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl border transition-all duration-300 hover:scale-105"
        style={{
          borderColor: 'rgba(var(--theme-primary-rgb, 157,78,221), 0.3)',
          backgroundColor: 'rgba(var(--theme-primary-rgb, 157,78,221), 0.05)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(var(--theme-primary-rgb, 157,78,221), 0.1)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--theme-primary-rgb, 157,78,221), 0.5)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(var(--theme-primary-rgb, 157,78,221), 0.05)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--theme-primary-rgb, 157,78,221), 0.3)';
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'rgba(var(--theme-primary-rgb, 157,78,221), 0.1)' }}
        >
          <Clock className="w-5 h-5" style={{ color: 'var(--theme-secondary, #e0aaff)' }} />
        </div>
        <div className="text-left">
          <p className="text-white font-bold text-base">Nossa História</p>
          <p className="text-slate-400 text-sm">Relembra nossos momentos juntos</p>
        </div>
        <div
          className="w-2 h-2 rounded-full animate-pulse ml-2"
          style={{ backgroundColor: 'var(--theme-primary, #9d4edd)' }}
        />
      </button>

      {/* Modal via Portal — renderizado direto no document.body */}
      <AnimatePresence>
        {isOpen && (
          <TimelineModalContent
            events={events}
            loading={loading}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </>
  );
}
