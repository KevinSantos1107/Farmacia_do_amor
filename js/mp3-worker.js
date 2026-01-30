// mp3-worker.js - Web Worker for MP3 cover extraction
importScripts('https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js');

self.onmessage = function(e) {
    const { mp3File } = e.data;

    // Convert ArrayBuffer back to File-like object
    const file = new File([mp3File], 'temp.mp3', { type: 'audio/mpeg' });

    jsmediatags.read(file, {
        onSuccess: function(tag) {
            const tags = tag.tags;
            let result = null;

            if (tags.picture) {
                const picture = tags.picture;
                const byteArray = new Uint8Array(picture.data);
                const blob = new Blob([byteArray], { type: picture.format });

                result = {
                    coverBlob: blob,
                    format: picture.format,
                    title: tags.title || 'Sem título',
                    artist: tags.artist || 'Artista desconhecido',
                    album: tags.album || ''
                };
            }

            self.postMessage({ success: true, result });
        },
        onError: function(error) {
            self.postMessage({ success: false, error: error.message });
        }
    });
};