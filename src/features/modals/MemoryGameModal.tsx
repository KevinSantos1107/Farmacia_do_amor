import { useEffect, useState } from 'react';
import { FullScreenOverlay } from '../../shared/ui/FullScreenOverlay';
import { Layers } from 'lucide-react';
import { MemoryGame } from '../games/memory/MemoryGame';
import type { AlbumForGame } from '../games/memory/selectPhotosForGame';
import { query, orderBy, getDocs, where } from 'firebase/firestore';
import { siteCollection } from '../../services/firestore/paths';
import { useSiteConfigStore } from '../../store/siteConfigStore';

/**
 * MemoryGameModal — wraps the MemoryGame component in the FullScreenOverlay
 * and handles fetching all album photos so the game can pick from them.
 */
export function MemoryGameModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { config } = useSiteConfigStore();
  const [albums, setAlbums] = useState<AlbumForGame[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch albums + photos once when the modal opens (and only if not loaded yet)
  useEffect(() => {
    if (!isOpen || albums.length > 0) return;

    const fetchAlbums = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(
          query(siteCollection('albums'), orderBy('orderIndex', 'asc')),
        );
        const validDocs = snapshot.docs.filter((d) => !d.id.startsWith('_'));
        if (validDocs.length === 0) { setLoading(false); return; }

        const albumIds = validDocs.map((d) => d.id);

        const photoSnapshots = await Promise.all(
          albumIds.map((id) =>
            getDocs(
              query(
                siteCollection('album_photos'),
                where('albumId', '==', id),
                orderBy('pageNumber', 'asc'),
              ),
            ),
          ),
        );

        const loaded: AlbumForGame[] = validDocs.map((doc, idx) => {
          const d = doc.data();
          const photos: AlbumForGame['photos'] = [];
          photoSnapshots[idx].forEach((pageDoc) => {
            if (pageDoc.id.startsWith('_')) return;
            const pd = pageDoc.data();
            if (Array.isArray(pd.photos)) {
              photos.push(...pd.photos);
            }
          });
          return { id: doc.id, title: d.title, photos };
        });

        setAlbums(loaded);
      } catch (e) {
        console.error('[MemoryGameModal] Erro ao carregar álbuns:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbums();
  }, [isOpen, albums.length]);

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="Jogo da Memória"
      subtitle="Encontre todos os pares das nossas fotos 💕"
      icon={<Layers className="w-6 h-6" />}
      fill
    >
      <div className="w-full h-full min-h-0 overflow-hidden flex flex-col max-w-6xl mx-auto px-1 sm:px-2 md:px-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--theme-primary)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <MemoryGame
            albums={albums}
            winMessage={
              config?.couple
                ? `${config.couple.partner1.name} e ${config.couple.partner2.name} — cada foto conta uma história! 💕`
                : 'Você lembra de cada momento nosso! 💕'
            }
          />
        )}
      </div>
    </FullScreenOverlay>
  );
}
