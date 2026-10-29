import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  updateDoc,
  writeBatch,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { siteCollection, siteDoc, useSiteId } from '../../services/firestore/paths';
import { uploadImage, cloudinaryUrl } from '../../services/cloudinary/upload';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Spinner } from '../../shared/ui/Spinner';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Modal } from '../../shared/ui/Modal';
import { SideSheet } from '../../shared/ui/SideSheet';
import { useToast } from '../../shared/ui/ToastProvider';
import { AdminPageHeader } from './AdminPageHeader';
import { useOverlayHistory } from '../../shared/hooks/useOverlayHistory';
import { cn } from '../../shared/utils/cn';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortableList } from '../../shared/hooks/useSortableList';
import { SortableItem } from '../../shared/ui/SortableItem';
import {
  Plus,
  Trash2,
  GripVertical,
  Upload,
  X,
  Image as ImageIcon,
  Pencil,
  Save,
  Check,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Album {
  id: string;
  title: string;
  description?: string;
  date: string;
  coverPublicId?: string;
  coverUrl?: string;
  orderIndex: number;
  photos?: Photo[];
  photoCount?: number;
}

interface Photo {
  publicId: string;
  url?: string;
  src?: string;
  srcLarge?: string;   // Campo legado do site antigo (1600px)
  srcThumb?: string;   // Campo legado do site antigo (thumbnail)
  caption?: string;
  description?: string; // Campo legado alternativo ao caption
  date?: string;
  lat?: number;
  lng?: number;
}



// ─── Upload Drop Zone ─────────────────────────────────────────────────────────
const IMAGE_ACCEPT = 'image/*,.heic,.heif,.HEIC,.HEIF';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
}
function DropZone({
  onFiles,
  accept = IMAGE_ACCEPT,
  multiple = true,
  label = 'Solte as fotos aqui ou clique para selecionar',
}: DropZoneProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => {
      if (f.type.startsWith('image/')) return true;
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'svg'].includes(ext || '');
    });
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handle}
      onClick={() => ref.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all',
        dragging
          ? 'border-rose-400 bg-rose-500/10'
          : 'border-slate-600 hover:border-slate-400 bg-slate-900/40'
      )}
    >
      <Upload className="w-8 h-8 text-slate-400" />
      <p className="text-slate-400 text-sm text-center">{label}</p>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-rose-500 transition-all duration-300 rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── ALBUM EDITOR ─────────────────────────────────────────────────────────────
export default function AlbumEditor() {
  const { show } = useToast();

  // ─ State ─
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  // new album form
  const [creating, setCreating] = useState(false);
  const [newAlbum, setNewAlbum] = useState({ title: '', description: '', date: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // edit album form
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [editAlbum, setEditAlbum] = useState({ title: '', description: '', date: '' });
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // selection mode (Samsung Gallery long-press style)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [activeDragPhotoId, setActiveDragPhotoId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPressRef = useRef(false);
  const isDraggingRef = useRef(false);

  // photo upload tracking
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [isSavingUpload, setIsSavingUpload] = useState(false);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  
  // confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const siteId = useSiteId();

  useOverlayHistory({
    id: 'admin-album-detail',
    isOpen: !!activeAlbum,
    onClose: () => setActiveAlbum(null),
  });

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(siteCollection('albums', siteId)));
      const loaded: Album[] = [];

      const albumDocs = snap.docs.filter((d) => !d.id.startsWith('_'));
      const albumIds = albumDocs.map((d) => d.id);

      // Load photos from album_photos in parallel
      const photoPromises = albumIds.map((id) =>
        getDocs(query(siteCollection('album_photos', siteId), where('albumId', '==', id), orderBy('pageNumber', 'asc')))
      );
      const photoSnapshots = await Promise.all(photoPromises);

      albumDocs.forEach((d, index) => {
        const data = d.data();
        const pSnap = photoSnapshots[index];
        const allPhotos: Photo[] = [];
        pSnap.docs.forEach((pDoc) => {
          if (pDoc.id.startsWith('_')) return;
          const pData = pDoc.data();
          if (pData.photos && Array.isArray(pData.photos)) {
            allPhotos.push(...pData.photos);
          }
        });

        if (data.photoCount === undefined || data.photoCount !== allPhotos.length) {
          updateDoc(siteDoc('albums', d.id, siteId), { photoCount: allPhotos.length }).catch(() => {});
        }

        loaded.push({
          id: d.id,
          title: data.title,
          description: data.description,
          date: data.date,
          coverPublicId: data.coverPublicId,
          coverUrl: data.cover || data.coverUrl || data.coverLarge,
          orderIndex: data.orderIndex ?? 0,
          photos: allPhotos,
        });
      });
      // Sort locally for old data without orderIndex
      loaded.sort((a, b) => a.orderIndex - b.orderIndex);
      setAlbums(loaded);
    } catch {
      show('Erro ao carregar álbuns', 'err');
    }
    setLoading(false);
  }, [siteId, show]);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  // ─ Load photos of active album ─
  useEffect(() => {
    if (activeAlbum) {
      // Find the latest state of the active album from albums list
      const latest = albums.find((a) => a.id === activeAlbum.id);
      setPhotos(latest?.photos || []);
    } else {
      setPhotos([]);
      setIsSelectionMode(false);
      setSelectedPhotoIds(new Set());
    }
  }, [activeAlbum, albums]);

  // ─ Cover file preview ─
  const handleCoverFile = (files: File[]) => {
    if (!files[0]) return;
    setCoverFile(files[0]);
    setCoverPreview(URL.createObjectURL(files[0]));
  };

  // ─ Create album ─
  const handleCreateAlbum = async () => {
    if (!newAlbum.title || !newAlbum.date) {
      show('Título e data são obrigatórios', 'err');
      return;
    }
    setSaving(true);
    try {
      let coverUrl: string | undefined;
      let coverPublicId: string | undefined;
      if (coverFile) {
        const res = await uploadImage(coverFile, `${siteId}/albums/covers`);
        coverPublicId = res.publicId;
        coverUrl = res.secureUrl;
      }
      await addDoc(siteCollection('albums', siteId), {
        title: newAlbum.title,
        description: newAlbum.description,
        date: newAlbum.date,
        cover: coverUrl, // usa campo legado
        coverPublicId,
        coverUrl,
        orderIndex: albums.length,
        photoCount: 0,
        createdAt: serverTimestamp(),
      });
      show('Álbum criado com sucesso!');
      setCreating(false);
      setNewAlbum({ title: '', description: '', date: '' });
      setCoverFile(null);
      setCoverPreview(null);
      loadAlbums();
    } catch (e: unknown) {
      show('Erro ao criar álbum: ' + (e instanceof Error ? e.message : String(e)), 'err');
    }
    setSaving(false);
  };

  // ─ Update album ─
  const handleUpdateAlbum = async () => {
    if (!editingAlbumId || !editAlbum.title || !editAlbum.date) {
      show('Título e data são obrigatórios', 'err');
      return;
    }
    setSavingEdit(true);
    try {
      const updates: {
        title: string;
        description: string;
        date: string;
        coverPublicId?: string;
        coverUrl?: string;
        cover?: string;
      } = {
        title: editAlbum.title,
        description: editAlbum.description,
        date: editAlbum.date,
      };

      if (editCoverFile) {
        const res = await uploadImage(editCoverFile, `${siteId}/albums/covers`);
        updates.coverPublicId = res.publicId;
        updates.coverUrl = res.secureUrl;
        updates.cover = res.secureUrl;
      }

      await updateDoc(siteDoc('albums', editingAlbumId, siteId), updates);
      show('Álbum atualizado com sucesso!');
      setEditingAlbumId(null);
      setEditCoverFile(null);
      setEditCoverPreview(null);
      loadAlbums();
    } catch (e: unknown) {
      show('Erro ao atualizar: ' + (e instanceof Error ? e.message : String(e)), 'err');
    }
    setSavingEdit(false);
  };

  const openEdit = (album: Album) => {
    setEditingAlbumId(album.id);
    setEditAlbum({
      title: album.title,
      description: album.description || '',
      date: album.date || '',
    });
    setEditCoverPreview(
      album.coverUrl ||
        (album.coverPublicId ? cloudinaryUrl(album.coverPublicId, { w: 300 }) : null)
    );
    setEditCoverFile(null);
  };

  // ─ Delete album (cascade) ─
  const handleDeleteAlbum = (album: Album) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deletar Álbum',
      message: `Tem certeza que deseja deletar o álbum "${album.title}"? Todas as fotos dentro dele serão apagadas. Esta ação não pode ser desfeita.`,
      confirmText: 'Deletar Álbum',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => executeDeleteAlbum(album),
    });
  };

  const executeDeleteAlbum = async (album: Album) => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    try {
      // 1. Deletar todos os docs de album_photos em batch ANTES do álbum e enfileirar fotos para deleção
      const pSnap = await getDocs(
        query(siteCollection('album_photos', siteId), where('albumId', '==', album.id))
      );
      
      const deletionsQueue = [];
      if (album.coverPublicId) {
        deletionsQueue.push({ publicId: album.coverPublicId, createdAt: serverTimestamp() });
      }

      if (!pSnap.empty) {
        const batch = writeBatch(db);
        pSnap.forEach((d) => {
          const data = d.data();
          if (data.photos && Array.isArray(data.photos)) {
            data.photos.forEach((p: Photo) => {
              if (p.publicId) {
                deletionsQueue.push({ publicId: p.publicId, createdAt: serverTimestamp() });
              }
            });
          }
          batch.delete(d.ref);
        });
        await batch.commit();
      }

      // Salva itens na fila de deleção do Cloudinary
      if (deletionsQueue.length > 0) {
        const delBatch = writeBatch(db);
        deletionsQueue.forEach(item => {
          delBatch.set(siteDoc('cloudinary_deletions_queue', undefined, siteId), item);
        });
        await delBatch.commit();
      }

      // 2. Só então deletar o documento do álbum
      await deleteDoc(siteDoc('albums', album.id, siteId));

      show('Álbum deletado!');
      if (activeAlbum?.id === album.id) setActiveAlbum(null);
      loadAlbums();
    } catch (e: unknown) {
      show('Erro ao deletar: ' + (e instanceof Error ? e.message : String(e)), 'err');
    }
  };

  // ─ Reorder albums (using dnd-kit hook defined later in render) ─
  const handleAlbumReorder = async (reordered: Album[]) => {
    const indexed = reordered.map((a, i) => ({ ...a, orderIndex: i }));
    setAlbums(indexed);
    const batch = writeBatch(db);
    indexed.forEach((a) => batch.update(siteDoc('albums', a.id, siteId), { orderIndex: a.orderIndex }));
    await batch.commit();
  };
  const albumSortable = useSortableList(albums, handleAlbumReorder);

  // ─ Reorder photos (dnd-kit) ─
  // ─ Reorder photos (Samsung style: reordena no drag durante a seleção e persiste automaticamente) ─
  const handlePhotoReorder = async (reordered: (Photo & { id: string })[]) => {
    const newPhotos = reordered.map((item) => {
      return photos.find((p) => (p.publicId || p.url || p.src) === item.id) || (item as unknown as Photo);
    });
    setPhotos(newPhotos);
    if (!activeAlbum) return;
    try {
      const pSnap = await getDocs(
        query(siteCollection('album_photos', siteId), where('albumId', '==', activeAlbum.id), orderBy('pageNumber', 'asc'))
      );
      if (!pSnap.empty) {
        const batch = writeBatch(db);
        batch.update(pSnap.docs[0].ref, { photos: newPhotos, pageNumber: 0 });
        for (let i = 1; i < pSnap.docs.length; i++) {
          batch.delete(pSnap.docs[i].ref);
        }
        batch.update(siteDoc('albums', activeAlbum.id, siteId), { photoCount: newPhotos.length });
        await batch.commit();
      } else {
        await addDoc(siteCollection('album_photos', siteId), {
          albumId: activeAlbum.id,
          pageNumber: 0,
          photos: newPhotos,
        });
        await updateDoc(siteDoc('albums', activeAlbum.id, siteId), { photoCount: newPhotos.length });
      }
      setAlbums((prev) =>
        prev.map((a) =>
          a.id === activeAlbum.id ? { ...a, photos: newPhotos, photoCount: newPhotos.length } : a
        )
      );
      show('Ordem das fotos salva!');
    } catch {
      show('Erro ao salvar nova ordem', 'err');
    }
  };

  const photoItemsWithId = photos.map((p, idx) => ({
    ...p,
    id: p.publicId || p.url || p.src || String(idx),
  }));

  const photoSortable = useSortableList(photoItemsWithId, handlePhotoReorder);

  const photoSensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    })
  );

  const activeDragPhoto = activeDragPhotoId
    ? photos.find((p, idx) => (p.publicId || p.url || p.src || String(idx)) === activeDragPhotoId) || null
    : null;

  // ─ Selection mode & Gestures (Samsung Gallery style long-press) ─
  const handlePointerDown = (e: React.PointerEvent, photoId: string) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    didLongPressRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(35);
        } catch {}
      }
      setIsSelectionMode(true);
      setSelectedPhotoIds((prev) => {
        const next = new Set(prev);
        if (next.has(photoId)) {
          next.delete(photoId);
        } else {
          next.add(photoId);
        }
        return next;
      });
    }, 350);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPosRef.current || !longPressTimerRef.current) return;
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (dx > 8 || dy > 8) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      startPosRef.current = null;
    }
  };

  const handlePointerUpOrLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    startPosRef.current = null;
  };

  const handleCardClick = (photoId: string) => {
    if (isDraggingRef.current) return;
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }

    if (isSelectionMode) {
      setSelectedPhotoIds((prev) => {
        const next = new Set(prev);
        if (next.has(photoId)) {
          next.delete(photoId);
        } else {
          next.add(photoId);
        }
        if (next.size === 0) {
          setIsSelectionMode(false);
        }
        return next;
      });
      return;
    }

    // Regra fundamental: Tocar rapidamente em uma foto no modo normal NÃO abre a imagem
  };

  const handleSelectAllToggle = () => {
    if (selectedPhotoIds.size === photos.length) {
      setSelectedPhotoIds(new Set());
      setIsSelectionMode(false);
    } else {
      const allIds = new Set<string>();
      photos.forEach((p, idx) => {
        const id = p.publicId || p.url || p.src || String(idx);
        allIds.add(id);
      });
      setSelectedPhotoIds(allIds);
    }
  };

  // ─ Photo upload files selected ─
  const handlePhotoFiles = (files: File[]) => {
    setUploadFiles((prev) => [...prev, ...files]);
    setUploadPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    setUploadProgress((prev) => [...prev, ...files.map(() => 0)]);
  };

  const handleRemoveFromQueue = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadPreviews((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => prev.filter((_, i) => i !== index));
  };

  // ─ Confirm photo upload ─
  const handleConfirmUpload = async () => {
    if (!activeAlbum || uploadFiles.length === 0) return;
    setUploading(true);
    setIsSavingUpload(false);
    try {
      const newPhotos: Photo[] = [];
      for (let i = 0; i < uploadFiles.length; i++) {
        setCurrentUploadIndex(i);
        const res = await uploadImage(
          uploadFiles[i],
          `${siteId}/albums/${activeAlbum.id}`,
          (pct) => {
            setUploadProgress((prev) => {
              const n = [...prev];
              n[i] = pct;
              return n;
            });
          }
        );
        newPhotos.push({
          publicId: res.publicId,
          url: res.secureUrl,
          src: res.secureUrl, // Legacy compatibilidade
          date: new Date().toISOString(),
        });
      }

      setIsSavingUpload(true);
      // ── Re-lê TODAS as páginas do álbum ordenadas por pageNumber ──────────
      const pSnap = await getDocs(
        query(siteCollection('album_photos', siteId), where('albumId', '==', activeAlbum.id), orderBy('pageNumber', 'asc'))
      );

      // Coleta todas as fotos existentes de todas as páginas
      const existingPhotos: Photo[] = [];
      pSnap.forEach((pDoc) => {
        if (pDoc.id.startsWith('_')) return;
        const pData = pDoc.data();
        if (pData.photos && Array.isArray(pData.photos)) {
          existingPhotos.push(...pData.photos);
        }
      });

      // Mescla fotos existentes + novas
      const updatedPhotos = [...existingPhotos, ...newPhotos];

      if (!pSnap.empty) {
        // Consolida tudo no primeiro doc e deleta as outras páginas
        const batch = writeBatch(db);
        batch.update(pSnap.docs[0].ref, { photos: updatedPhotos, pageNumber: 0 });
        for (let i = 1; i < pSnap.docs.length; i++) {
          batch.delete(pSnap.docs[i].ref);
        }
        await batch.commit();
      } else {
        await addDoc(siteCollection('album_photos', siteId), {
          albumId: activeAlbum.id,
          pageNumber: 0,
          photos: updatedPhotos,
        });
      }
      show(`${uploadFiles.length} foto(s) enviada(s) com sucesso!`);
      // Atualiza o photoCount no documento do álbum para o carrossel não precisar buscar as fotos
      await updateDoc(siteDoc('albums', activeAlbum.id, siteId), { photoCount: updatedPhotos.length });
      setUploadFiles([]);
      setUploadPreviews([]);
      setUploadProgress([]);
      setCurrentUploadIndex(0);
      setIsSavingUpload(false);
      loadAlbums();
    } catch (e: unknown) {
      show('Erro no upload: ' + (e instanceof Error ? e.message : String(e)), 'err');
    }
    setUploading(false);
    setIsSavingUpload(false);
  };

  // ─ Batch delete photos ─
  const handleBatchDelete = () => {
    if (selectedPhotoIds.size === 0 || !activeAlbum) return;
    const count = selectedPhotoIds.size;
    setConfirmDialog({
      isOpen: true,
      title: `Excluir ${count} foto${count > 1 ? 's' : ''}`,
      message: `Tem certeza que deseja deletar ${count === 1 ? 'a foto selecionada' : `as ${count} fotos selecionadas`}? Esta ação não pode ser desfeita.`,
      confirmText: `Excluir ${count} foto${count > 1 ? 's' : ''}`,
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => executeBatchDelete(),
    });
  };

  const executeBatchDelete = async () => {
    if (!activeAlbum || selectedPhotoIds.size === 0) return;
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    try {
      const photosToDelete = photos.filter((p, idx) => {
        const pId = p.publicId || p.url || p.src || String(idx);
        return selectedPhotoIds.has(pId);
      });

      if (photosToDelete.length > 0) {
        const deletionsQueue = photosToDelete
          .filter((p) => p.publicId)
          .map((p) => ({ publicId: p.publicId, createdAt: serverTimestamp() }));

        if (deletionsQueue.length > 0) {
          const delBatch = writeBatch(db);
          deletionsQueue.forEach((item) => {
            delBatch.set(siteDoc('cloudinary_deletions_queue', undefined, siteId), item);
          });
          await delBatch.commit();
        }
      }

      const pSnap = await getDocs(
        query(siteCollection('album_photos', siteId), where('albumId', '==', activeAlbum.id), orderBy('pageNumber', 'asc'))
      );

      const allExistingPhotos: Photo[] = [];
      pSnap.forEach((pDoc) => {
        if (pDoc.id.startsWith('_')) return;
        const pData = pDoc.data();
        if (pData.photos && Array.isArray(pData.photos)) {
          allExistingPhotos.push(...pData.photos);
        }
      });

      const updatedPhotos = allExistingPhotos.filter((p, idx) => {
        const pId = p.publicId || p.url || p.src || String(idx);
        return !selectedPhotoIds.has(pId);
      });

      if (!pSnap.empty) {
        const batch = writeBatch(db);
        batch.update(pSnap.docs[0].ref, { photos: updatedPhotos, pageNumber: 0 });
        for (let i = 1; i < pSnap.docs.length; i++) {
          batch.delete(pSnap.docs[i].ref);
        }
        await batch.commit();
      }

      setPhotos(updatedPhotos);
      show(`${photosToDelete.length} foto(s) deletada(s) com sucesso!`);
      await updateDoc(siteDoc('albums', activeAlbum.id, siteId), { photoCount: updatedPhotos.length });
      setSelectedPhotoIds(new Set());
      setIsSelectionMode(false);
      loadAlbums();
    } catch (e: unknown) {
      show('Erro ao deletar fotos: ' + (e instanceof Error ? e.message : String(e)), 'err');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Photo editor (inside an album)
  // ─────────────────────────────────────────────────────────────────────────────
  if (activeAlbum) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header da sessão do álbum - minimalista sem botão */}
        <div className="flex items-center gap-2 sm:gap-3 pb-3 border-b border-slate-800">
          <button
            onClick={() => {
              setIsSelectionMode(false);
              setSelectedPhotoIds(new Set());
              setActiveAlbum(null);
            }}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm shrink-0"
          >
            ← Álbuns
          </button>
          <span className="text-slate-600 shrink-0">/</span>
          <h1 className="text-lg sm:text-xl font-bold text-white truncate">{activeAlbum.title}</h1>
          <span className="text-slate-500 text-xs sm:text-sm font-mono shrink-0">({photos.length} fotos)</span>
        </div>

        {/* Upload zone */}
        {uploadFiles.length === 0 ? (
          <DropZone
            onFiles={handlePhotoFiles}
            label="Solte as fotos aqui ou clique para selecionar. Você pode selecionar várias de uma vez."
          />
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
                {uploadFiles.length} foto(s) na fila
                {uploading && (
                  <span className="text-xs sm:text-sm font-normal text-rose-400 ml-2">
                    {isSavingUpload
                      ? 'Salvando no banco de dados...'
                      : `Enviando foto ${Math.min(currentUploadIndex + 1, uploadFiles.length)} de ${uploadFiles.length}...`}
                  </span>
                )}
              </p>
              {!uploading && (
                <button
                  onClick={() => {
                    setUploadFiles([]);
                    setUploadPreviews([]);
                    setUploadProgress([]);
                  }}
                  className="text-slate-400 hover:text-white p-1"
                  aria-label="Limpar fila"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {uploadPreviews.map((src, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg overflow-hidden relative bg-slate-900 group"
                >
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    className="w-full h-full object-cover relative z-10 pointer-events-none select-none"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 text-slate-400 p-1 text-center">
                    <ImageIcon className="w-5 h-5 mb-1 text-rose-400" />
                    <span className="text-[10px] font-mono leading-tight truncate max-w-full px-1">
                      {uploadFiles[i]?.name.split('.').pop()?.toUpperCase() || 'FOTO'}
                    </span>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFromQueue(i)}
                      className="absolute top-1 right-1 p-1 bg-black/80 rounded-full text-white hover:bg-red-600 transition-colors z-20"
                      aria-label="Remover foto da fila"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs text-white font-mono z-20">
                      {uploadProgress[i] || 0}%
                    </div>
                  )}
                </div>
              ))}
            </div>

            {uploading && (
              <ProgressBar
                pct={Math.round(uploadProgress.reduce((a, b) => a + (b || 0), 0) / (uploadProgress.length || 1))}
              />
            )}

            {/* Input oculto para "Adicionar Mais" sem romper a responsividade */}
            <input
              ref={addMoreInputRef}
              type="file"
              className="hidden"
              accept={IMAGE_ACCEPT}
              multiple
              onChange={(e) => {
                if (e.target.files) handlePhotoFiles(Array.from(e.target.files));
                e.target.value = '';
              }}
            />

            <div className="flex flex-col sm:flex-row gap-2.5 mt-4 border-t border-slate-700/50 pt-4 w-full">
              <Button
                onClick={handleConfirmUpload}
                isLoading={uploading}
                className="gap-2 w-full sm:w-auto"
              >
                <Upload className="w-4 h-4" /> Fazer Upload ({uploadFiles.length})
              </Button>
              <Button
                variant="secondary"
                onClick={() => addMoreInputRef.current?.click()}
                disabled={uploading}
                className="bg-slate-700 hover:bg-slate-600 text-white gap-2 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" /> Adicionar Mais
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setUploadFiles([]);
                  setUploadPreviews([]);
                  setUploadProgress([]);
                }}
                className="bg-slate-800 text-slate-300 hover:text-white w-full sm:w-auto sm:ml-auto"
                disabled={uploading}
              >
                Limpar Fila
              </Button>
            </div>
          </div>
        )}

        {/* Photos grid */}
        {photos.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="Álbum vazio"
            description="Nenhuma foto ainda. Use a área acima para fazer upload das suas fotos."
          />
        ) : isSelectionMode ? (
          /* Grid no Modo Seleção: arrasto ativado para reordenar (Samsung Gallery) */
          <DndContext
            sensors={photoSensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => {
              isDraggingRef.current = true;
              setActiveDragPhotoId(String(event.active.id));
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                  navigator.vibrate(25);
                } catch {}
              }
            }}
            onDragEnd={(event) => {
              setActiveDragPhotoId(null);
              setTimeout(() => {
                isDraggingRef.current = false;
              }, 100);
              photoSortable.handleDragEnd(event);
            }}
            onDragCancel={() => {
              setActiveDragPhotoId(null);
              isDraggingRef.current = false;
            }}
          >
            <SortableContext items={photoSortable.ids} strategy={rectSortingStrategy}>
              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 select-none pb-24"
              >
                {photos.map((photo, idx) => {
                  const pId = photo.publicId || photo.url || photo.src || String(idx);
                  const isSelected = selectedPhotoIds.has(pId);
                  return (
                    <SortableItem key={pId} id={pId}>
                      {({ isDragging, setNodeRef, style, handleProps, handleStyle }) => (
                        <div
                          ref={setNodeRef}
                          style={{
                            ...style,
                            ...handleStyle,
                            touchAction: 'manipulation',
                            WebkitTouchCallout: 'none',
                            userSelect: 'none',
                          }}
                          {...handleProps}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => handleCardClick(pId)}
                          className={cn(
                            "group relative aspect-square rounded-xl overflow-hidden bg-slate-800 border select-none cursor-pointer",
                            // Animação de bordas e opacidade apenas — sem animar transform para o drag ser a 60fps sem oscilação
                            "transition-[border-color,box-shadow,opacity] duration-150",
                            isSelected
                              ? "ring-2 ring-indigo-500 border-indigo-500 scale-[0.98]"
                              : "border-slate-700 hover:border-slate-500",
                            isDragging
                              ? "opacity-25 border-dashed border-indigo-400/60 ring-2 ring-indigo-400/40"
                              : ""
                          )}
                        >
                          {photo.publicId ? (
                            <img
                              src={cloudinaryUrl(photo.publicId, { w: 400, q: 70 })}
                              alt=""
                              draggable={false}
                              onContextMenu={(e) => e.preventDefault()}
                              style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                              className="w-full h-full object-cover pointer-events-none select-none"
                            />
                          ) : photo.url || photo.src ? (
                            <img
                              src={photo.url || photo.src}
                              alt=""
                              draggable={false}
                              onContextMenu={(e) => e.preventDefault()}
                              style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                              className="w-full h-full object-cover pointer-events-none select-none"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-700 flex items-center justify-center pointer-events-none select-none">
                              <ImageIcon className="w-8 h-8 text-slate-500" />
                            </div>
                          )}

                          {/* Indicador de Seleção discreto no topo-esquerdo */}
                          <div className="absolute top-2 left-2 z-20 pointer-events-none">
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                isSelected
                                  ? "bg-indigo-600 text-white shadow-md ring-2 ring-white/50"
                                  : "bg-black/50 border-2 border-white/70"
                              )}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      )}
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>

            {/* DragOverlay com renderização suave e desacoplada da grade */}
            <DragOverlay adjustScale={false} zIndex={100}>
              {activeDragPhoto ? (
                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-800 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/50 ring-4 ring-indigo-500/30 scale-105 cursor-grabbing pointer-events-none select-none">
                  {activeDragPhoto.publicId ? (
                    <img
                      src={cloudinaryUrl(activeDragPhoto.publicId, { w: 400, q: 70 })}
                      alt=""
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : activeDragPhoto.url || activeDragPhoto.src ? (
                    <img
                      src={activeDragPhoto.url || activeDragPhoto.src}
                      alt=""
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-slate-500" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 z-20">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md ring-2 ring-white/50">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          /* Grid Normal (toque longo entra na seleção, toque rápido não abre nada, zero poluição visual) */
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 select-none"
          >
            {photos.map((photo, idx) => {
              const pId = photo.publicId || photo.url || photo.src || String(idx);

              return (
                <div
                  key={pId}
                  onPointerDown={(e) => handlePointerDown(e, pId)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUpOrLeave}
                  onPointerCancel={handlePointerUpOrLeave}
                  onClick={() => handleCardClick(pId)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all select-none cursor-pointer"
                >
                  {photo.publicId ? (
                    <img
                      src={cloudinaryUrl(photo.publicId, { w: 400, q: 70 })}
                      alt=""
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                      className="w-full h-full object-cover pointer-events-none select-none"
                    />
                  ) : photo.url || photo.src ? (
                    <img
                      src={photo.url || photo.src}
                      alt=""
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                      className="w-full h-full object-cover pointer-events-none select-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center pointer-events-none select-none">
                      <ImageIcon className="w-8 h-8 text-slate-500" />
                    </div>
                  )}
                  {/* ZERO botões na foto em modo normal! */}
                </div>
              );
            })}
          </div>
        )}

        {/* Barra contextual inferior minimalista flutuante (Samsung Gallery style) */}
        {isSelectionMode && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-5 py-2.5 shadow-2xl flex items-center gap-3 sm:gap-4 text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
            <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
              {selectedPhotoIds.size} selecionada{selectedPhotoIds.size > 1 ? 's' : ''}
            </span>
            <span className="w-px h-4 bg-slate-700 shrink-0" />
            <button
              type="button"
              onClick={handleSelectAllToggle}
              className="text-xs text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            >
              {selectedPhotoIds.size === photos.length ? 'Desmarcar' : 'Todas'}
            </button>
            <span className="w-px h-4 bg-slate-700 shrink-0" />
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={selectedPhotoIds.size === 0}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Excluir</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPhotoIds(new Set());
                setIsSelectionMode(false);
              }}
              className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors ml-1"
              aria-label="Cancelar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Confirmation Dialog for Photo View */}
        <Modal
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
          title={confirmDialog.title}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm py-1.5 px-3"
              >
                {confirmDialog.cancelText || 'Cancelar'}
              </Button>
              <Button
                onClick={confirmDialog.onConfirm}
                className={cn(
                  "text-white text-sm py-1.5 px-3",
                  confirmDialog.isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {confirmDialog.confirmText || 'Confirmar'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Album list
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <AdminPageHeader
        title="Álbuns de Fotos"
        description="Crie e organize os álbuns exibidos no site."
        actions={
          <Button onClick={() => setCreating(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Novo Álbum
          </Button>
        }
      />

      {/* Create album form */}
      <SideSheet
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="Criar Novo Álbum"
        description="Adicione as informações básicas do seu novo álbum."
      >
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Título *</label>
              <Input
                value={newAlbum.title}
                onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
                className="bg-slate-900 border-slate-700 text-slate-200"
                placeholder="Ex: Nosso Natal 2024"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Data *</label>
              <Input
                type="date"
                value={newAlbum.date}
                onChange={(e) => setNewAlbum({ ...newAlbum, date: e.target.value })}
                className="bg-slate-900 border-slate-700 text-slate-200"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Descrição</label>
            <textarea
              value={newAlbum.description}
              onChange={(e) => setNewAlbum({ ...newAlbum, description: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-rose-500/50 focus:outline-none resize-none"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Foto de Capa</label>
            {coverPreview ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-600">
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <DropZone
                onFiles={handleCoverFile}
                multiple={false}
                label="Clique para selecionar a capa"
              />
            )}
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-800 mt-6">
            <Button onClick={handleCreateAlbum} isLoading={saving} className="flex-1 gap-2">
              <Plus className="w-4 h-4" /> Criar Álbum
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCreating(false)}
              className="flex-1 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </SideSheet>

      {/* Albums list */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : albums.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Nenhum álbum criado"
          description="Crie seu primeiro álbum para começar a adicionar fotos aos seus momentos inesquecíveis."
          actionLabel="Criar Primeiro Álbum"
          onAction={() => setCreating(true)}
        />
      ) : (
        <>
          <DndContext sensors={albumSortable.sensors} onDragEnd={albumSortable.handleDragEnd}>
            <SortableContext items={albumSortable.ids} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {albums.map((album) => (
                  <div key={album.id}>
                    <SortableItem id={album.id}>
                      {({ isDragging, setNodeRef, style, handleProps, handleStyle }) => (
                        <div
                          ref={setNodeRef}
                          style={style}
                          className={cn(
                            "flex items-center gap-4 p-4 bg-slate-800 border border-slate-700 rounded-xl transition-colors group",
                            isDragging ? "shadow-2xl shadow-blue-500/10 ring-2 ring-blue-500 z-10" : "hover:border-slate-600"
                          )}
                        >
                          <div {...handleProps} style={handleStyle} className="p-1 -ml-1 cursor-grab active:cursor-grabbing hover:bg-slate-700 rounded">
                            <GripVertical className="w-5 h-5 text-slate-600 flex-shrink-0 hover:text-slate-400" />
                          </div>

                          {/* Área clicável para abrir o álbum */}
                          <div
                            className="flex-1 min-w-0 flex items-center gap-4 cursor-pointer group/click"
                            onClick={() => setActiveAlbum(album)}
                          >
                            {album.coverPublicId ? (
                              <img
                                src={cloudinaryUrl(album.coverPublicId, { w: 80, h: 80, c: 'fill', q: 70 })}
                                alt=""
                                className="w-14 h-14 rounded-lg object-cover flex-shrink-0 group-hover/click:opacity-80 transition-opacity"
                              />
                            ) : album.coverUrl ? (
                              <img
                                src={album.coverUrl}
                                alt=""
                                className="w-14 h-14 rounded-lg object-cover flex-shrink-0 group-hover/click:opacity-80 transition-opacity"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover/click:bg-slate-600 transition-colors">
                                <ImageIcon className="w-6 h-6 text-slate-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white truncate group-hover/click:text-rose-400 transition-colors">
                                {album.title}
                              </p>
                              <p className="text-xs text-slate-500 font-mono mt-0.5">{album.date}</p>
                              {album.description && (
                                <p className="text-sm text-slate-400 truncate mt-0.5">
                                  {album.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Ações (Editar e Deletar) */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => openEdit(album)}
                              className="p-2 text-slate-500 hover:text-blue-400 transition-colors opacity-50 group-hover:opacity-100"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAlbum(album)}
                              className="p-2 text-slate-500 hover:text-red-400 transition-colors opacity-50 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </SortableItem>

                {/* Edit form expands below the album row */}
                {editingAlbumId === album.id && (
                  <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-6 space-y-4 ml-9 mt-2 animate-in fade-in zoom-in-95 duration-200">
                    <h2 className="font-bold text-white text-lg">Editar Álbum</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Título *</label>
                        <Input
                          value={editAlbum.title}
                          onChange={(e) => setEditAlbum({ ...editAlbum, title: e.target.value })}
                          className="bg-slate-900 border-slate-700 text-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Data *</label>
                        <Input
                          type="date"
                          value={editAlbum.date}
                          onChange={(e) => setEditAlbum({ ...editAlbum, date: e.target.value })}
                          className="bg-slate-900 border-slate-700 text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Descrição</label>
                      <textarea
                        value={editAlbum.description}
                        onChange={(e) =>
                          setEditAlbum({ ...editAlbum, description: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Foto de Capa</label>
                      {editCoverPreview ? (
                        <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-600">
                          <img
                            src={editCoverPreview}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => {
                              setEditCoverFile(null);
                              setEditCoverPreview(null);
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <DropZone
                          onFiles={(f) => {
                            if (f[0]) {
                              setEditCoverFile(f[0]);
                              setEditCoverPreview(URL.createObjectURL(f[0]));
                            }
                          }}
                          multiple={false}
                          label="Selecionar nova capa"
                        />
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleUpdateAlbum}
                        isLoading={savingEdit}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      >
                        <Save className="w-4 h-4" /> Salvar Alterações
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setEditingAlbumId(null)}
                        className="bg-slate-700 text-white"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* Confirmation Dialog */}
      <Modal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        title={confirmDialog.title}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400 leading-relaxed">{confirmDialog.message}</p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
              className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm py-1.5 px-3"
            >
              {confirmDialog.cancelText || 'Cancelar'}
            </Button>
            <Button
              onClick={confirmDialog.onConfirm}
              className={cn(
                "text-white text-sm py-1.5 px-3",
                confirmDialog.isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {confirmDialog.confirmText || 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
