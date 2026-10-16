/**
 * ❌ OBSOLETO — NÃO EXECUTAR.
 * Este script foi substituído por scripts/migrate-to-site-layout.mjs.
 * Ele usava nomes de coleções e schemas incompatíveis ('album' em vez de 'albums', publicId, etc.).
 */
console.error('❌ OBSOLETO: Este script foi substituído por migrate-to-site-layout.mjs. Não execute.');
process.exit(1);

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ID = 'meu-site';

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8'));
} catch {
  console.error('❌ ERRO: Arquivo serviceAccountKey.json não encontrado em scripts/');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const newSiteRef = db.collection('sites').doc(SITE_ID);

async function migrateTimeline() {
  console.log('\n⏳ Migrando TIMELINE...');
  const oldTimeline = await db.collection('timeline').get();
  
  if (oldTimeline.empty) {
    console.log('   Nenhum evento encontrado na timeline antiga.');
    return;
  }

  let count = 0;
  for (const doc of oldTimeline.docs) {
    const data = doc.data();
    
    const newEvent = {
      date: data.date || '',
      title: data.title || '',
      description: data.caption || data.secret || '',
      publicId: data.photoLarge || data.photo || '', // O CloudinaryImage suporta URL direta
      createdAt: data.createdAt || new Date().toISOString(),
      orderIndex: data.orderIndex || 0,
      side: data.side || 'left'
    };

    await newSiteRef.collection('timeline').doc(doc.id).set(newEvent);
    count++;
  }
  console.log(`   ✅ Migrados ${count} eventos da timeline.`);
}

async function migrateAlbums() {
  console.log('\n⏳ Migrando ÁLBUNS DE FOTOS...');
  const oldAlbums = await db.collection('albums').get();

  if (oldAlbums.empty) {
    console.log('   Nenhum álbum encontrado.');
    return;
  }

  let count = 0;
  for (const doc of oldAlbums.docs) {
    const data = doc.data();
    
    // Buscar fotos deste álbum
    const photosSnapshot = await db.collection('album_photos').where('albumId', '==', doc.id).get();
    
    let allPhotos = [];
    photosSnapshot.forEach(photoDoc => {
      const pageData = photoDoc.data();
      if (pageData.photos && Array.isArray(pageData.photos)) {
        allPhotos.push(...pageData.photos);
      }
    });

    const newAlbum = {
      title: data.title || 'Álbum',
      description: data.description || '',
      coverPublicId: data.coverLarge || data.cover || '',
      date: data.date || '',
      createdAt: data.createdAt || new Date().toISOString(),
      photos: allPhotos.map(photo => ({
        id: photo.id || Math.random().toString(36).substr(2, 9),
        publicId: photo.src || photo,
        caption: photo.description || ''
      }))
    };

    await newSiteRef.collection('album').doc(doc.id).set(newAlbum);
    count++;
  }
  console.log(`   ✅ Migrados ${count} álbuns.`);
}

async function migratePlaylists() {
  console.log('\n⏳ Migrando PLAYLISTS...');
  const oldPlaylists = await db.collection('custom_playlists').get();

  if (oldPlaylists.empty) {
    console.log('   Nenhuma playlist encontrada.');
    return;
  }

  let count = 0;
  for (const doc of oldPlaylists.docs) {
    const data = doc.data();

    // Buscar tracks
    const tracksSnapshot = await db.collection('playlist_tracks').where('playlistId', '==', doc.id).get();
    
    let allTracks = [];
    tracksSnapshot.forEach(trackDoc => {
      const pageData = trackDoc.data();
      if (pageData.tracks && Array.isArray(pageData.tracks)) {
        allTracks.push(...pageData.tracks);
      }
    });

    const newPlaylist = {
      name: data.name || 'Playlist',
      description: data.description || '',
      coverUrl: data.cover || '',
      icon: data.icon || 'Music',
      createdAt: data.createdAt || new Date().toISOString(),
      tracks: allTracks.map(track => ({
        id: track.id || Math.random().toString(36).substr(2, 9),
        title: track.title || 'Música',
        artist: track.artist || 'Artista',
        url: track.src || '',
        coverUrl: track.coverLarge || track.cover || ''
      }))
    };

    await newSiteRef.collection('playlist').doc(doc.id).set(newPlaylist);
    count++;
  }
  console.log(`   ✅ Migradas ${count} playlists.`);
}

async function migrateMapPins() {
  console.log('\n⏳ Migrando MAP PINS...');
  const oldPins = await db.collection('map_pins').get();

  if (oldPins.empty) {
    console.log('   Nenhum pin de mapa encontrado.');
    return;
  }

  let count = 0;
  for (const doc of oldPins.docs) {
    const data = doc.data();

    const newPin = {
      title: data.title || 'Lugar Especial',
      description: data.description || '',
      date: data.date || '',
      lat: data.lat || 0,
      lng: data.lng || 0,
      image: data.image || '',
      createdAt: data.createdAt || new Date().toISOString(),
    };

    await newSiteRef.collection('map_pins').doc(doc.id).set(newPin);
    count++;
  }
  console.log(`   ✅ Migrados ${count} pins de mapa.`);
}

async function runMigration() {
  console.log('🚀 Iniciando script de Migração de Dados (Romantic Engine V2)...\n');
  
  try {
    await migrateTimeline();
    await migrateAlbums();
    await migratePlaylists();
    await migrateMapPins();
    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('   Você já pode ver os dados antigos no site novo.');
  } catch (error) {
    console.error('\n❌ ERRO NA MIGRAÇÃO:', error);
  }
}

runMigration();
