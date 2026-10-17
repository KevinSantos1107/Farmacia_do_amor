import {
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { siteCollection, siteDoc } from '../../../services/firestore/paths';
import { db } from '../../../services/firebase/config';
import type { JsMediaTagsResult, Track } from './types';
import { stripUndefined, parseFilename, formatAudioTime, resolveMediaCoverUrl } from './playlistPureUtils';

export { stripUndefined, parseFilename, formatAudioTime, resolveMediaCoverUrl };

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

export async function fetchAndRepairPlaylistTracks(playlistId: string, siteId?: string): Promise<Track[]> {
  const tSnap = await getDocs(
    query(siteCollection('playlist_tracks', siteId), where('playlistId', '==', playlistId))
  );
  const allTracks: Track[] = [];
  let needsRepair = false;

  tSnap.forEach((tDoc) => {
    if (tDoc.id.startsWith('_')) return;
    const data = tDoc.data();
    if (data.tracks && Array.isArray(data.tracks)) {
      allTracks.push(
        ...data.tracks.map((t: Track) => ({
          ...t,
          id: tDoc.id,
          coverUrl: t.coverUrl || t.cover || t.coverLarge || t.coverThumb || t.coverPublicId,
          cover: t.cover || t.coverUrl || t.coverLarge || t.coverThumb,
        }))
      );
      needsRepair = true;
    } else if (data.title) {
      allTracks.push({
        id: tDoc.id,
        ...data,
        coverUrl: (data.coverUrl || data.cover || data.coverLarge || data.coverThumb || data.coverPublicId) as string | undefined,
        cover: (data.cover || data.coverUrl || data.coverLarge || data.coverThumb) as string | undefined,
      } as Track);
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
        batch.set(siteDoc('playlist_tracks', undefined, siteId), clean);
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
  reordered: (Track & { id: string })[],
  siteId?: string
): Promise<void> {
  const batch = writeBatch(db);
  const tSnap = await getDocs(
    query(siteCollection('playlist_tracks', siteId), where('playlistId', '==', playlistId))
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
    batch.set(siteDoc('playlist_tracks', undefined, siteId), clean);
  });
  await batch.commit();
}
