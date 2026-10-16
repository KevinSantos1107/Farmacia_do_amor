import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import { useSiteConfigStore } from '../../../store/siteConfigStore';
import { useSiteId } from '../../../services/firestore/paths';
import type { StarMapConfig } from './types';

export function useStarMapConfig() {
  const { config } = useSiteConfigStore();
  const siteId = useSiteId();
  const [mapConfig, setMapConfig] = useState<StarMapConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMapConfig = async () => {
      try {
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
          setTimeout(() => {
            setMapConfig({
              specialDate: config?.relationship.startDate || '2025-10-27',
              time: '19:42',
              customLocation: { lat: -23.5505, lng: -46.6333, name: 'São Paulo, Brasil' },
              romanticQuote: 'De todas as possibilidades do universo, nossas trajetórias se cruzaram aqui.',
              constellations: ['Órion', 'Touro', 'Cão Maior', 'Gêmeos'],
            });
            setLoading(false);
          }, 500);
          return;
        }
        const docRef = doc(db, 'sites', siteId, 'config', 'star_map');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<StarMapConfig>;
          setMapConfig({
            specialDate: data.specialDate || config?.relationship.startDate || '',
            time: data.time || '',
            customLocation: data.customLocation || { lat: 0, lng: 0, name: '' },
            romanticQuote: data.romanticQuote || '',
            constellations: data.constellations || [],
          });
        } else {
          setMapConfig({
            specialDate: config?.relationship.startDate || '',
            time: '',
            customLocation: { lat: 0, lng: 0, name: 'Local não definido' },
            romanticQuote: 'De todas as possibilidades do universo, nossas trajetórias se cruzaram aqui.',
            constellations: [],
          });
        }
      } catch (e) {
        console.error('StarMap fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMapConfig();
  }, [config, siteId]);

  return { mapConfig, loading };
}
