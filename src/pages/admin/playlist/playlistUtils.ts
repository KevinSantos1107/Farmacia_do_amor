import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import type { JsMediaTagsResult, Track } from './types';
import { stripUndefined, parseFilename, formatAudioTime } from './playlistPureUtils';

export { stripUndefined, parseFilename, formatAudioTime };

// @ts-ignore
import * as jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

export function readMp3Tags(
  file: File
): Promise<{ title?: string; artist?: string; coverUrl?: string }> {
  return new Promise((resolve) => {
    try {
      if (!jsmediatags) {
        console.error('jsmediatags module not found!');
        resolve({});
        return;
      }
      jsmediatags.read(file, {
        onSuccess: (tag: JsMediaTagsResult) => {
          console.log('ID3 tags lidas com sucesso:', tag.tags);
          const tags = tag.tags;
          let coverUrl: string | undefined;
          if (tags.picture) {
            try {
              const { data, format } = tags.picture;
              const bytes = new Uint8Array(data);
              const blob = new Blob([bytes], { type: format });
              coverUrl = URL.createObjectURL(blob);
              console.log('Capa extraída com sucesso:', coverUrl);
            } catch (e) {
              console.error('Erro ao processar a capa:', e);
            }
          }
          resolve({ title: tags.title, artist: tags.artist, coverUrl });
        },
        onError: (error: unknown) => {
          console.error('Erro ao ler tags ID3:', error);
          resolve({});
        },
      });
    } catch (e) {
      console.error('Exceção geral ao tentar ler ID3:', e);
      resolve({});
    }
  });
}

export async function fetchAndRepairPlaylistTracks(playlistId: string): Promise<Track[]> {
  const tSnap = await getDocs(
    query(collection(db, 'playlist_tracks'), where('playlistId', '==', playlistId))
  );
  const allTracks: Track[] = [];
  let needsRepair = false;

  tSnap.forEach((tDoc) => {
    const data = tDoc.data();
    if (data.tracks && Array.isArray(data.tracks)) {
      allTracks.push(...data.tracks.map((t: Track) => ({ ...t, id: tDoc.id })));
      needsRepair = true;
    } else if (data.title) {
      allTracks.push({ id: tDoc.id, ...data } as Track);
    }
  });

  allTracks.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  if (needsRepair && allTracks.length > 0) {
    try {
      const batch = writeBatch(db);
      tSnap.forEach((d) => batch.delete(d.ref));
      allTracks.forEach((t, i) => {
        const toClean: Record<string, unknown> = { ...t, orderIndex: i, playlistId };
        delete toClean.id;
        delete toClean.tracks;
        const clean = stripUndefined(toClean);
        batch.set(doc(collection(db, 'playlist_tracks')), clean);
      });
      await batch.commit();
    } catch (e) {
      console.error('Auto repair failed', e);
    }
  }

  return allTracks;
}

export async function reorderPlaylistTracks(
  playlistId: string,
  reordered: (Track & { id: string })[]
): Promise<void> {
  const batch = writeBatch(db);
  const tSnap = await getDocs(
    query(collection(db, 'playlist_tracks'), where('playlistId', '==', playlistId))
  );
  tSnap.forEach((d) => batch.delete(d.ref));

  reordered.forEach((t, i) => {
    const toClean: Record<string, unknown> = {
      ...t,
      orderIndex: i,
      playlistId,
    };
    delete toClean.id;
    delete toClean.tracks;
    const clean = stripUndefined(toClean);
    batch.set(doc(collection(db, 'playlist_tracks')), clean);
  });
  await batch.commit();
}
