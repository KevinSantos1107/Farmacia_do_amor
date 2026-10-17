// Firebase imports removed, relying on backend proxy now

/**
 * Resolve a storage path (e.g. "sites/meu-site/audio/song.mp3")
 * to a playable, secure HTTP URL.
 * Requires Firebase Auth if rules restrict access.
 */
/**
 * Resolve a secure, short-lived Cloudinary Signed URL for playback.
 * The signature is generated securely on the backend.
 */
export async function getPlayableAudioUrl(publicId: string): Promise<string> {
  try {
    // Check if it's already a full HTTP URL (e.g. from an external API or demo)
    if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
      return publicId;
    }

    // Call our secure backend (e.g. Firebase Function or Next/Vite API Route)
    // For now, in local dev, this is a simulated fetch that would hit our backend
    console.info(`Requesting Signed URL from backend for: ${publicId}`);

    /* 
      // IMPLEMENTAÇÃO REAL (Fase Backoffice):
      const response = await fetch(`/api/audio/sign?id=${publicId}`, {
         headers: { Authorization: `Bearer ${firebaseUserToken}` }
      });
      const data = await response.json();
      return data.signedUrl;
    */

    // Como ainda não temos o backend Node rodando localmente, mockamos o retorno
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxxnqs4gf';
    return `https://res.cloudinary.com/${cloudName}/video/authenticated/${publicId}?timestamp=${Date.now()}`;
  } catch (error) {
    console.error('Error fetching signed audio URL:', error);
    throw new Error('Falha ao obter a assinatura do áudio.');
  }
}
