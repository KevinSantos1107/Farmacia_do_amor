import { useState, useRef } from 'react';
import { addDoc } from 'firebase/firestore';
import { siteCollection } from '../../../services/firestore/paths';
import { uploadImage, uploadAudio } from '../../../services/cloudinary/upload';
import type { TrackSlot, Playlist, Track } from './types';
import { parseFilename, readMp3Tags, stripUndefined } from './playlistUtils';

interface UseTrackUploadProps {
  siteId: string;
  activePlaylist: Playlist | null;
  tracks: Track[];
  onUploadSuccess: () => void;
}

export function useTrackUpload({
  siteId,
  activePlaylist,
  tracks,
  onUploadSuccess,
}: UseTrackUploadProps) {
  const [creatingTrack, setCreatingTrack] = useState(false);
  const [trackSlots, setTrackSlots] = useState<TrackSlot[]>([]);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const cancelControllers = useRef<Map<string, AbortController>>(new Map());

  const handleAudioFilesSelect = async (files: FileList) => {
    const newSlots: TrackSlot[] = [];
    for (const file of Array.from(files)) {
      const { parsedArtist, parsedTitle } = parseFilename(file.name);
      const id = crypto.randomUUID();
      newSlots.push({
        id,
        file,
        title: parsedTitle,
        artist: parsedArtist,
        coverFile: null,
        coverPreview: null,
        uploading: false,
        progress: 0,
        done: false,
        error: null,
      });

      readMp3Tags(file).then((tags) => {
        setTrackSlots((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  title: tags.title || s.title,
                  artist: tags.artist || s.artist,
                  coverPreview: tags.coverUrl || s.coverPreview,
                }
              : s
          )
        );
      });
    }
    setTrackSlots((prev) => [...prev, ...newSlots]);
    if (newSlots.length > 0) setExpandedSlotId(newSlots[0].id);
  };

  const handleSlotCoverSelect = (slotId: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setTrackSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, coverFile: file, coverPreview: preview } : s))
    );
  };

  const handleRemoveCoverForSlot = (slotId: string) => {
    setTrackSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, coverFile: null, coverPreview: null } : s))
    );
  };

  const removeSlot = (slotId: string) => {
    cancelControllers.current.get(slotId)?.abort();
    cancelControllers.current.delete(slotId);
    setTrackSlots((prev) => prev.filter((s) => s.id !== slotId));
    if (expandedSlotId === slotId) setExpandedSlotId(null);
  };

  const cancelSlotUpload = (slotId: string) => {
    cancelControllers.current.get(slotId)?.abort();
  };

  const uploadSlot = async (slot: TrackSlot) => {
    if (!activePlaylist || !slot.title) return;
    const controller = new AbortController();
    cancelControllers.current.set(slot.id, controller);
    setTrackSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, uploading: true, error: null, progress: 0 } : s))
    );
    try {
      const audioRes = await uploadAudio(
        slot.file,
        `${siteId}/music`,
        (pct) =>
          setTrackSlots((prev) =>
            prev.map((s) => (s.id === slot.id ? { ...s, progress: pct } : s))
          ),
        controller.signal
      );

      let coverUrl: string | undefined;
      let coverPublicId: string | undefined;

      if (slot.coverFile) {
        const coverRes = await uploadImage(
          slot.coverFile,
          `${siteId}/music/covers`,
          undefined,
          controller.signal
        );
        coverPublicId = coverRes.publicId;
        coverUrl = coverRes.secureUrl;
      } else if (slot.coverPreview?.startsWith('blob:')) {
        try {
          const blobRes = await fetch(slot.coverPreview);
          const blob = await blobRes.blob();
          const blobFile = new File([blob], 'cover.jpg', { type: blob.type });
          const coverRes = await uploadImage(
            blobFile,
            `${siteId}/music/covers`,
            undefined,
            controller.signal
          );
          coverPublicId = coverRes.publicId;
          coverUrl = coverRes.secureUrl;
        } catch {
          /* ignore cover error */
        }
      }

      await addDoc(
        siteCollection('playlist_tracks', siteId),
        stripUndefined({
          title: slot.title,
          artist: slot.artist || undefined,
          src: audioRes.secureUrl,
          url: audioRes.secureUrl,
          publicId: audioRes.publicId,
          cover: coverUrl,
          coverPublicId,
          date: new Date().toISOString(),
          orderIndex: tracks.length,
          playlistId: activePlaylist.id,
        })
      );

      setTrackSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id ? { ...s, uploading: false, done: true, progress: 100 } : s
        )
      );
      onUploadSuccess();
    } catch (e: unknown) {
      const isAbort = e instanceof Error && e.name === 'AbortError';
      if (isAbort) {
        setTrackSlots((prev) =>
          prev.map((s) => (s.id === slot.id ? { ...s, uploading: false, progress: 0 } : s))
        );
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        setTrackSlots((prev) =>
          prev.map((s) => (s.id === slot.id ? { ...s, uploading: false, error: msg } : s))
        );
      }
    } finally {
      cancelControllers.current.delete(slot.id);
    }
  };

  const uploadAllSlots = async () => {
    const pending = trackSlots.filter((s) => !s.done && !s.uploading && s.title);
    for (const slot of pending) {
      await uploadSlot(slot);
    }
  };

  const resetCreating = () => {
    cancelControllers.current.forEach((c) => c.abort());
    cancelControllers.current.clear();
    setTrackSlots([]);
    setExpandedSlotId(null);
    setCreatingTrack(false);
  };

  return {
    creatingTrack,
    setCreatingTrack,
    trackSlots,
    setTrackSlots,
    expandedSlotId,
    setExpandedSlotId,
    handleAudioFilesSelect,
    handleSlotCoverSelect,
    handleRemoveCoverForSlot,
    removeSlot,
    cancelSlotUpload,
    uploadSlot,
    uploadAllSlots,
    resetCreating,
  };
}
