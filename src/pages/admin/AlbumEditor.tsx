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
import { cn } from '../../shared/utils/cn';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortableList } from '../../shared/hooks/useSortableList';
import { SortableItem } from '../../shared/ui/SortableItem';
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Pencil,
  Save,
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
        onChange={(e) => e.target.files && onFiles(Array.from(e.target.files))}
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
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);

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

  // photo upload
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  
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

  // ─ Reorder photos (using dnd-kit hook defined later in render) ─
  const handlePhotoReorder = async (reordered: Photo[]) => {
    setPhotos(reordered);
    const reorderedPhotos = reordered.map((p) => ({ ...p }));
    const pSnap = await getDocs(
      query(siteCollection('album_photos', siteId), where('albumId', '==', activeAlbum!.id), orderBy('pageNumber', 'asc'))
    );
    if (!pSnap.empty) {
      const batch = writeBatch(db);
      batch.update(pSnap.docs[0].ref, { photos: reorderedPhotos, pageNumber: 0 });
      for (let i = 1; i < pSnap.docs.length; i++) {
        batch.delete(pSnap.docs[i].ref);
      }
      await batch.commit();
    } else {
      await addDoc(siteCollection('album_photos', siteId), {
        albumId: activeAlbum!.id,
        pageNumber: 0,
        photos: reorderedPhotos,
      });
    }
    loadAlbums(); // refresh state
  };
  const photoSortable = useSortableList(photos.map(p => ({ ...p, id: p.publicId || p.url || p.src || Math.random().toString() })), handlePhotoReorder);

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
    try {
      const newPhotos: Photo[] = [];
      for (let i = 0; i < uploadFiles.length; i++) {
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

      // ── Re-lê TODAS as páginas do álbum ordenadas por pageNumber ──────────
      // CRÍTICO: álbuns legados têm múltiplos docs (pageNumber:0, pageNumber:1…).
      // Usar activeAlbum.photos poderia estar incompleto se carregado sem ordem.
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
      setUploadFiles([]);
      setUploadPreviews([]);
      setUploadProgress([]);
      loadAlbums();
    } catch (e: unknown) {
      show('Erro no upload: ' + (e instanceof Error ? e.message : String(e)), 'err');
    }
    setUploading(false);
  };

  // ─ Delete photo ─
  const handleDeletePhoto = (photo: Photo) => {
    if (!activeAlbum) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Deletar Foto',
      message: 'Tem certeza que deseja deletar esta foto? Esta ação não pode ser desfeita.',
      confirmText: 'Deletar',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => executeDeletePhoto(photo),
    });
  };

  const executeDeletePhoto = async (photo: Photo) => {
    if (!activeAlbum) return;
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    try {
      if (photo.publicId) {
        await addDoc(siteCollection('cloudinary_deletions_queue', siteId), {
          publicId: photo.publicId,
          createdAt: serverTimestamp(),
        });
      }

      // ── Re-lê TODAS as páginas para garantir que nenhuma foto seja perdida ─
      const pSnap = await getDocs(
        query(siteCollection('album_photos', siteId), where('albumId', '==', activeAlbum.id), orderBy('pageNumber', 'asc'))
      );

      // Coleta todas as fotos de todas as páginas
      const allExistingPhotos: Photo[] = [];
      pSnap.forEach((pDoc) => {
        const pData = pDoc.data();
        if (pData.photos && Array.isArray(pData.photos)) {
          allExistingPhotos.push(...pData.photos);
        }
      });

      // Filtra removendo apenas a foto deletada
      const photoKey = photo.publicId || photo.url || photo.src;
      const updatedPhotos = allExistingPhotos.filter(
        (p) => (p.publicId || p.url || p.src) !== photoKey
      );

      if (!pSnap.empty) {
        const batch = writeBatch(db);
        // Consolida tudo no primeiro doc e deleta as outras páginas
        batch.update(pSnap.docs[0].ref, { photos: updatedPhotos, pageNumber: 0 });
        for (let i = 1; i < pSnap.docs.length; i++) {
          batch.delete(pSnap.docs[i].ref);
        }
        await batch.commit();
      }

      setPhotos(updatedPhotos);
      show('Foto deletada!');
      loadAlbums();
    } catch (e: unknown) {
      show('Erro ao deletar: ' + (e instanceof Error ? e.message : String(e)), 'err');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Photo editor (inside an album)
  // ─────────────────────────────────────────────────────────────────────────────
  if (activeAlbum) {
    const uploadedCount = uploadProgress.filter(p => p === 100).length;
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveAlbum(null)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Álbuns
          </button>
          <span className="text-slate-600">/</span>
          <h1 className="text-2xl font-bold text-white">{activeAlbum.title}</h1>
          <span className="text-slate-500 text-sm font-mono">{photos.length} fotos</span>
        </div>

        {/* Upload zone */}
        {uploadFiles.length === 0 ? (
          <DropZone
            onFiles={handlePhotoFiles}
            label="Solte as fotos aqui ou clique para selecionar. Você pode selecionar várias de uma vez."
          />
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white flex items-center gap-2">
                {uploadFiles.length} foto(s) na fila
                {uploading && <span className="text-sm font-normal text-rose-400 ml-2">Enviando {uploadedCount + 1} de {uploadFiles.length}...</span>}
              </p>
              {!uploading && (
                <button
                  onClick={() => {
                    setUploadFiles([]);
                    setUploadPreviews([]);
                    setUploadProgress([]);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
              {uploadPreviews.map((src, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg overflow-hidden relative bg-slate-900 group"
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover relative z-10"
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
                      onClick={() => handleRemoveFromQueue(i)}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-white font-mono">
                      {uploadProgress[i] || 0}%
                    </div>
                  )}
                </div>
              ))}
            </div>
            {uploading && (
              <ProgressBar
                pct={Math.round(uploadProgress.reduce((a, b) => a + (b || 0), 0) / uploadProgress.length)}
              />
            )}
            <div className="flex gap-3 mt-4 border-t border-slate-700/50 pt-4">
              <Button onClick={handleConfirmUpload} isLoading={uploading} className="gap-2 flex-1 md:flex-none">
                <Upload className="w-4 h-4" /> Fazer Upload
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setUploadFiles([]);
                  setUploadPreviews([]);
                  setUploadProgress([]);
                }}
                className="bg-slate-700 text-white flex-1 md:flex-none"
                disabled={uploading}
              >
                Limpar Fila
              </Button>
              <DropZone
                onFiles={handlePhotoFiles}
                label="Adicionar mais"
                accept={IMAGE_ACCEPT}
                multiple
              />
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
        ) : (
          <DndContext sensors={photoSortable.sensors} onDragEnd={photoSortable.handleDragEnd}>
            <SortableContext items={photoSortable.ids} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {photos.map((photo, idx) => {
                  const pId = photo.publicId || photo.url || photo.src || String(idx);
                  return (
                    <SortableItem key={pId} id={pId}>
                      {({ isDragging, setNodeRef, style, handleProps }) => (
                        <div
                          ref={setNodeRef}
                          style={{ ...style, touchAction: 'pan-y' }}
                          {...handleProps}
                          onClick={() => setActivePhotoId(activePhotoId === pId ? null : pId)}
                          className={cn(
                            "group relative aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700 cursor-grab active:cursor-grabbing",
                            isDragging ? "shadow-2xl shadow-rose-500/20 ring-2 ring-rose-500 z-10" : ""
                          )}
                        >
                          {photo.publicId ? (
                            <img
                              src={cloudinaryUrl(photo.publicId, { w: 400, q: 70 })}
                              alt=""
                              className="w-full h-full object-cover transition-transform lg:group-hover:scale-105 duration-300 pointer-events-none"
                            />
                          ) : photo.url || photo.src ? (
                            <img
                              src={photo.url || photo.src}
                              alt=""
                              className="w-full h-full object-cover transition-transform lg:group-hover:scale-105 duration-300 pointer-events-none"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-700 flex items-center justify-center pointer-events-none">
                              <ImageIcon className="w-8 h-8 text-slate-500" />
                            </div>
                          )}
                          <div className={cn(
                            "absolute inset-0 transition-all duration-200 flex items-center justify-center z-10",
                            activePhotoId === pId ? "bg-black/40 opacity-100" : "bg-black/0 opacity-0 lg:group-hover:bg-black/40 lg:group-hover:opacity-100"
                          )}>
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeletePhoto(photo); }}
                              className="p-3 bg-red-500/90 rounded-full text-white hover:bg-red-600 transition-transform hover:scale-105 shadow-lg"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          <div 
                            className={cn(
                              "absolute top-2 left-2 transition-opacity p-1.5 bg-black/50 rounded text-white z-20 pointer-events-none",
                              activePhotoId === pId ? "opacity-100" : "opacity-0 lg:group-hover:opacity-100"
                            )}
                          >
                            <GripVertical className="w-4 h-4 drop-shadow" />
                          </div>
                        </div>
                      )}
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Álbuns de Fotos</h1>
          <p className="text-slate-400 mt-1">Crie e organize os álbuns exibidos no site.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Novo Álbum
        </Button>
      </div>

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
