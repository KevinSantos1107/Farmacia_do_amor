/**
 * useMusicSearch.ts
 *
 * Hook para busca e adição de músicas via YouTube (estilo LovePanda).
 * Busca as músicas no YouTube e adiciona diretamente à playlist no Firestore.
 */

import { useState, useCallback, useRef } from 'react';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { siteCollection } from '../../../services/firestore/paths';
import type { Track, Playlist } from './types';

export interface MusicSearchResult {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  durationSeconds: number;
}

interface SearchApiResponse {
  tracks: MusicSearchResult[];
  error?: string;
}

export function useMusicSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Busca com debounce de 400ms ──────────────────────────────────────────
  const search = useCallback((q: string) => {
    setQuery(q);
    setError(null);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!q.trim()) {
      setResults([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const url = `/api/music-search?q=${encodeURIComponent(q.trim())}`;
        const res = await fetch(url);
        let data: SearchApiResponse | null = null;
        try {
          data = await res.json();
        } catch {
          // resposta não-JSON
        }

        if (!res.ok) {
          throw new Error(data?.error ?? `Erro ${res.status} ao buscar músicas.`);
        }

        setResults(data?.tracks ?? []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao buscar músicas.';
        setError(msg);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  // ── Adicionar faixa à playlist (Instantâneo no Firestore) ────────────────
  const addTrack = useCallback(
    async (
      result: MusicSearchResult,
      activePlaylist: Playlist,
      siteId: string,
      tracks: Track[],
      onSuccess: () => void
    ): Promise<void> => {
      if (addingId) return;

      setAddingId(result.videoId);
      setError(null);

      try {
        const orderIndex = tracks.length;
        const youtubeUrl = `https://www.youtube.com/watch?v=${result.videoId}`;

        await addDoc(siteCollection('playlist_tracks', siteId), {
          title: result.title,
          artist: result.artist,
          url: youtubeUrl,
          src: youtubeUrl,
          videoId: result.videoId,
          cover: result.thumbnail,
          coverUrl: result.thumbnail,
          duration: result.durationSeconds,
          date: new Date().toISOString().split('T')[0],
          orderIndex,
          playlistId: activePlaylist.id,
          createdAt: serverTimestamp(),
          source: 'youtube',
        });

        setAddedIds((prev) => new Set([...prev, result.videoId]));
        onSuccess();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao adicionar música.';
        setError(msg);
      } finally {
        setAddingId(null);
      }
    },
    [addingId]
  );

  return {
    query,
    results,
    isSearching,
    addingId,
    error,
    addedIds,
    search,
    addTrack,
  };
}
