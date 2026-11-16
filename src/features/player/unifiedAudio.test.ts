import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAudioStore, type Track } from '../../store/useAudioStore';
import * as useAudioModule from './useAudio';

describe('useAudioStore: Unified Player Actions', () => {
  const mp3Track1: Track = {
    id: 'mp3-1',
    title: 'MP3 Song 1',
    artist: 'Artist 1',
    url: 'https://example.com/audio1.mp3',
    duration: 180,
  };

  const ytTrack1: Track = {
    id: 'yt-1',
    title: 'YouTube Song 1',
    artist: 'Artist 2',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    source: 'youtube',
    duration: 210,
  };

  const mp3Track2: Track = {
    id: 'mp3-2',
    title: 'MP3 Song 2',
    artist: 'Artist 3',
    url: 'https://example.com/audio2.mp3',
    duration: 195,
  };

  const ytTrack2: Track = {
    id: 'yt-2',
    title: 'YouTube Song 2',
    artist: 'Artist 4',
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    videoId: 'kJQP7kiw5Fk',
    source: 'youtube',
    duration: 240,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    useAudioStore.setState({
      playlist: [],
      currentTrackIndex: -1,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      isShuffle: false,
      isRepeat: false,
    });
  });

  it('setPlaylist define a lista com isPlaying: false (NÃO toca automaticamente)', () => {
    const spyLoad = vi.spyOn(useAudioModule, 'loadAndPlayUnifiedTrack').mockImplementation(async () => {});
    const tracks = [ytTrack1, mp3Track1];

    useAudioStore.getState().setPlaylist(tracks);

    const state = useAudioStore.getState();
    expect(state.playlist).toEqual(tracks);
    expect(state.currentTrackIndex).toBe(0);
    expect(state.isPlaying).toBe(false);

    // Deve preparar (cue) a faixa 0 com autoPlay = false
    expect(spyLoad).toHaveBeenCalledWith(ytTrack1, false);
  });

  it('setPlaylistAndPlay define a lista e toca imediatamente a faixa escolhida', () => {
    const spyLoad = vi.spyOn(useAudioModule, 'loadAndPlayUnifiedTrack').mockImplementation(async () => {});
    const tracks = [mp3Track1, ytTrack1, mp3Track2];

    useAudioStore.getState().setPlaylistAndPlay(tracks, 1);

    const state = useAudioStore.getState();
    expect(state.currentTrackIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
    expect(spyLoad).toHaveBeenCalledWith(ytTrack1, true);
  });

  it('nextTrack transiciona suavemente de MP3 para YouTube', () => {
    const spyLoad = vi.spyOn(useAudioModule, 'loadAndPlayUnifiedTrack').mockImplementation(async () => {});
    const tracks = [mp3Track1, ytTrack1];
    useAudioStore.setState({ playlist: tracks, currentTrackIndex: 0, isPlaying: true });

    useAudioStore.getState().nextTrack();

    const state = useAudioStore.getState();
    expect(state.currentTrackIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
    // Deve chamar loadAndPlayUnifiedTrack com a faixa do YouTube e autoPlay = true
    expect(spyLoad).toHaveBeenCalledWith(ytTrack1, true);
  });

  it('nextTrack transiciona suavemente de YouTube para MP3', () => {
    const spyLoad = vi.spyOn(useAudioModule, 'loadAndPlayUnifiedTrack').mockImplementation(async () => {});
    const tracks = [ytTrack1, mp3Track1];
    useAudioStore.setState({ playlist: tracks, currentTrackIndex: 0, isPlaying: true });

    useAudioStore.getState().nextTrack();

    const state = useAudioStore.getState();
    expect(state.currentTrackIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
    // Deve chamar loadAndPlayUnifiedTrack com a faixa MP3 e autoPlay = true
    expect(spyLoad).toHaveBeenCalledWith(mp3Track1, true);
  });

  it('previousTrack volta para a faixa anterior e toca', () => {
    const spyLoad = vi.spyOn(useAudioModule, 'loadAndPlayUnifiedTrack').mockImplementation(async () => {});
    const tracks = [mp3Track1, ytTrack1, ytTrack2];
    useAudioStore.setState({ playlist: tracks, currentTrackIndex: 2, isPlaying: true });

    useAudioStore.getState().previousTrack();

    const state = useAudioStore.getState();
    expect(state.currentTrackIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
    expect(spyLoad).toHaveBeenCalledWith(ytTrack1, true);
  });

  it('togglePlayPause alterna de tocando para pausado e vice-versa', () => {
    const spyPause = vi.spyOn(useAudioModule, 'pauseUnifiedAudio').mockImplementation(() => {});
    const spyResume = vi.spyOn(useAudioModule, 'resumeUnifiedAudio').mockImplementation(() => {});

    useAudioStore.setState({ playlist: [ytTrack1], currentTrackIndex: 0, isPlaying: true });

    // Pausar
    useAudioStore.getState().togglePlayPause();
    expect(useAudioStore.getState().isPlaying).toBe(false);
    expect(spyPause).toHaveBeenCalled();

    // Retomar
    useAudioStore.getState().togglePlayPause();
    expect(useAudioStore.getState().isPlaying).toBe(true);
    expect(spyResume).toHaveBeenCalled();
  });

  it('playTrack toca outra faixa pelo índice ou dá replay na mesma faixa', () => {
    const spyLoad = vi.spyOn(useAudioModule, 'loadAndPlayUnifiedTrack').mockImplementation(async () => {});
    const spyReplay = vi.spyOn(useAudioModule, 'replayCurrentAudio').mockImplementation(() => {});

    useAudioStore.setState({ playlist: [mp3Track1, ytTrack1], currentTrackIndex: 0, isPlaying: true });

    // Clicar em outra faixa (índice 1)
    useAudioStore.getState().playTrack(1);
    expect(useAudioStore.getState().currentTrackIndex).toBe(1);
    expect(spyLoad).toHaveBeenCalledWith(ytTrack1, true);

    // Clicar na mesma faixa já selecionada (índice 1)
    useAudioStore.getState().playTrack(1);
    expect(spyReplay).toHaveBeenCalled();
  });

  it('ajustes de volume e mute notificam o áudio unificado', () => {
    const spyVol = vi.spyOn(useAudioModule, 'setUnifiedVolume').mockImplementation(() => {});

    useAudioStore.getState().setVolume(0.5);
    expect(useAudioStore.getState().volume).toBe(0.5);
    expect(spyVol).toHaveBeenCalledWith(0.5, false);

    useAudioStore.getState().toggleMute();
    expect(useAudioStore.getState().isMuted).toBe(true);
    expect(spyVol).toHaveBeenCalledWith(0.5, true);
  });
});
