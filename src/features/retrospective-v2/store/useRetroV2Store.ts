import { create } from 'zustand';
import { collection, getDocs, query, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { db } from '../../../services/firebase/config';

interface RawAlbumPhoto {
  publicId?: string;
  src?: string;
  url?: string;
  date?: unknown;
  caption?: string;
  lat?: number;
  lng?: number;
}

/** Safely converts Firestore Timestamp or any date-like value to a JS Date */
function toDate(value: unknown): Date {
  if (!value) return new Date();
  // Firestore Timestamp object
  if (typeof value === 'object' && value !== null) {
    if ('toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate();
    }
    // Firestore Timestamp as plain object {seconds, nanoseconds}
    if ('seconds' in value && typeof (value as { seconds: unknown }).seconds === 'number') {
      return new Date((value as { seconds: number }).seconds * 1000);
    }
  }
  // ISO string or numeric timestamp
  const d = new Date(value as string | number | Date);
  return isNaN(d.getTime()) ? new Date() : d;
}

export interface RetroPhoto {
  url: string;
  caption: string;
  date: Date;
}

export interface RetroEvent {
  title: string;
  date: Date;
}

export interface MapPin {
  lat: number;
  lng: number;
  photoUrl: string;
  title: string;
  date: Date;
}

export interface RetroConfig {
  rouletteOptions: string[];
  musicUrl: string;
  musicName: string;
  wordGameAnswer: string;
  wordGameQuestion: string;
  outroTitle: string;
  outroMessage: string;
}

interface RetroState {
  isOpen: boolean;
  isReady: boolean;
  photos: RetroPhoto[];
  totalPhotos: number;
  events: RetroEvent[];
  mapPins: MapPin[];
  config: RetroConfig;

  openRetro: (siteId: string) => Promise<void>;
  closeRetro: () => void;
}

export const useRetroV2Store = create<RetroState>((set, get) => ({
  isOpen: false,
  isReady: false,
  photos: [],
  totalPhotos: 0,
  events: [],
  mapPins: [],
  config: {
    rouletteOptions: ['Jantar', 'Cinema', 'Parque', 'Viagem', 'Ficar em Casa', 'Surpresa'],
    musicUrl: '',
    musicName: 'Nossa Trilha',
    wordGameAnswer: 'O amor da minha vida',
    wordGameQuestion: 'O QUE EU ACHO DE VOCÊ?',
    outroTitle: 'Feliz 1 ano pra nós, meu amor!',
    outroMessage: 'Obrigado por cada momento incrível. Essa é só uma parte da nossa história.',
  },

  openRetro: async (siteId: string) => {
    set({ isOpen: true, isReady: false });

    try {
      // 1. Fetch Timeline Events — mesma coleção raiz que o TimelineEditor usa
      const tlSnap = await getDocs(query(collection(db, 'timeline')));
      const events: RetroEvent[] = [];
      tlSnap.forEach((d) => {
        if (d.id === '_placeholder') return;
        const data = d.data();
        if (data.date || data.createdAt) {
          events.push({
            title: data.title || '',
            date: toDate(data.date || data.createdAt),
          });
        }
      });

      // 2. Fetch Albums & Map Pins — mesmas coleções raiz que o AlbumEditor usa
      const albumSnap = await getDocs(query(collection(db, 'albums'), orderBy('orderIndex', 'asc')));
      const allPhotosRaw: RetroPhoto[] = [];
      const mapPins: MapPin[] = [];

      if (!albumSnap.empty) {
        const albumIds = albumSnap.docs.map((d) => d.id);

        // Busca fotos de todos os albums em paralelo
        const photoSnapshots = await Promise.all(
          albumIds.map((id) =>
            getDocs(query(collection(db, 'album_photos'), where('albumId', '==', id)))
          )
        );

        albumSnap.docs.forEach((albumDoc, albumIdx) => {
          if (albumDoc.id === '_placeholder') return;
          const d = albumDoc.data();
          const pSnap = photoSnapshots[albumIdx];

          // Junta fotos de todos os docs album_photos desse album
          const albumPhotos: RawAlbumPhoto[] = [];
          pSnap.forEach((pDoc) => {
            const pData = pDoc.data();
            if (Array.isArray(pData.photos)) albumPhotos.push(...(pData.photos as RawAlbumPhoto[]));
          });

          albumPhotos.forEach((p, idx) => {
            // Suporta fotos legadas (src/url) e novas (publicId)
            const photoRef = p.publicId || p.src || p.url;
            if (photoRef) {
              const photoDate = toDate(p.date || d.createdAt);
              allPhotosRaw.push({
                url: photoRef,
                caption: p.caption || d.title || '',
                date: photoDate,
              });
              // Map pins de álbuns com coordenadas geográficas
              if (idx === 0 && (p.lat || d.lat) && (p.lng || d.lng)) {
                mapPins.push({
                  lat: p.lat || d.lat,
                  lng: p.lng || d.lng,
                  photoUrl: photoRef,
                  title: d.title || 'Nosso Lugar',
                  date: photoDate,
                });
              }
            }
          });
        });
      }

      // Smart Photo Selection: group by month-epoch, select balanced spread
      allPhotosRaw.sort((a, b) => a.date.getTime() - b.date.getTime());

      let photos: RetroPhoto[];
      if (allPhotosRaw.length <= 30) {
        photos = allPhotosRaw;
      } else {
        const byEpoch = new Map<string, RetroPhoto[]>();
        allPhotosRaw.forEach((p) => {
          const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`;
          if (!byEpoch.has(key)) byEpoch.set(key, []);
          byEpoch.get(key)!.push(p);
        });
        const epochs = Array.from(byEpoch.keys()).sort();
        const TARGET = 25;
        const perEpoch = Math.max(1, Math.floor(TARGET / epochs.length));
        const selected: RetroPhoto[] = [];
        epochs.forEach((epochKey) => {
          const pool = byEpoch.get(epochKey)!;
          const count = Math.min(perEpoch + 1, pool.length);
          const step = pool.length / count;
          for (let i = 0; i < count; i++) {
            selected.push(pool[Math.floor(i * step)]);
          }
        });
        photos = selected.slice(0, 30);
      }

      // 3. Fetch specific retro config
      let mergedConfig = get().config;
      try {
        const configRef = doc(db, 'sites', siteId, 'retrospective_config', 'v2');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          mergedConfig = { ...mergedConfig, ...configSnap.data() } as RetroConfig;
        }

        // Fetch wheels collection to sync with Admin
        const wheelSnap = await getDocs(query(collection(db, 'sites', siteId, 'wheels')));
        if (!wheelSnap.empty) {
          const firstWheel = wheelSnap.docs[0].data();
          if (firstWheel.options && typeof firstWheel.options === 'string') {
            mergedConfig.rouletteOptions = firstWheel.options
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
          }
        } else {
          // If no wheels are registered, empty the options so it doesn't show default
          mergedConfig.rouletteOptions = [];
        }
      } catch (e) {
        console.warn('No custom retro v2 config found', e);
      }

      set({
        events,
        photos,
        totalPhotos: allPhotosRaw.length,
        mapPins,
        config: mergedConfig,
        isReady: true,
      });
    } catch (error) {
      console.error('Failed to load retrospective data', error);
      // Fallback ready state even if error
      set({ isReady: true });
    }
  },

  closeRetro: () => {
    set({ isOpen: false });
  },
}));
