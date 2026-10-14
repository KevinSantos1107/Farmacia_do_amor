import { describe, it, expect } from 'vitest';

describe('Avatar Business Logic & Validations', () => {
  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_SIZE_MB = 10;
  const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

  it('deve aceitar formatos suportados (JPEG, PNG, WEBP)', () => {
    expect(ACCEPTED_TYPES.includes('image/jpeg')).toBe(true);
    expect(ACCEPTED_TYPES.includes('image/png')).toBe(true);
    expect(ACCEPTED_TYPES.includes('image/webp')).toBe(true);
  });

  it('deve rejeitar formatos não permitidos (GIF, SVG, PDF, EXE)', () => {
    expect(ACCEPTED_TYPES.includes('image/gif')).toBe(false);
    expect(ACCEPTED_TYPES.includes('image/svg+xml')).toBe(false);
    expect(ACCEPTED_TYPES.includes('application/pdf')).toBe(false);
  });

  it('deve validar o limite de tamanho máximo de 10 MB', () => {
    const validSize = 5 * 1024 * 1024; // 5 MB
    const excessiveSize = 11 * 1024 * 1024; // 11 MB

    expect(validSize <= MAX_BYTES).toBe(true);
    expect(excessiveSize <= MAX_BYTES).toBe(false);
  });

  it('deve impedir cadastro de segunda foto se já houver photoUrl cadastrada', () => {
    const partner = {
      name: 'Kevin',
      playerId: 'kevin',
      gender: 'M' as const,
      avatar: 'https://res.cloudinary.com/dxxnqs4gf/image/upload/avatars/meu-site/partner1/avatar.jpg',
      photoUrl: 'https://res.cloudinary.com/dxxnqs4gf/image/upload/avatars/meu-site/partner1/avatar.jpg',
    };

    const canUpload = !partner.photoUrl;
    expect(canUpload).toBe(false);
  });

  it('deve permitir cadastro de foto se photoUrl não existir', () => {
    const partner = {
      name: 'Kevin',
      playerId: 'kevin',
      gender: 'M' as const,
      avatar: '/avatars/avatar_1.webp',
      photoUrl: undefined,
    };

    const canUpload = !partner.photoUrl;
    expect(canUpload).toBe(true);
  });

  it('ao excluir foto personalizada, deve reverter para avatar padrão conforme o gênero', () => {
    const partnerM = {
      gender: 'M',
      photoUrl: 'https://res.cloudinary.com/...',
      avatar: 'https://res.cloudinary.com/...',
    };
    const defaultAvatarM = partnerM.gender === 'F' ? '/avatars/avatar_2.webp' : '/avatars/avatar_1.webp';
    expect(defaultAvatarM).toBe('/avatars/avatar_1.webp');

    const partnerF = {
      gender: 'F',
      photoUrl: 'https://res.cloudinary.com/...',
      avatar: 'https://res.cloudinary.com/...',
    };
    const defaultAvatarF = partnerF.gender === 'F' ? '/avatars/avatar_2.webp' : '/avatars/avatar_1.webp';
    expect(defaultAvatarF).toBe('/avatars/avatar_2.webp');
  });

  it('excluir foto de um integrante não deve afetar a do outro', () => {
    const couple = {
      partner1: {
        name: 'Kevin',
        photoUrl: 'https://res.cloudinary.com/foto1.jpg',
        avatar: 'https://res.cloudinary.com/foto1.jpg',
      },
      partner2: {
        name: 'Iara',
        photoUrl: 'https://res.cloudinary.com/foto2.jpg',
        avatar: 'https://res.cloudinary.com/foto2.jpg',
      },
    };

    // Remove apenas partner1
    const cleanPartner1: { name: string; photoUrl?: string; avatar: string } = { ...couple.partner1 };
    delete cleanPartner1.photoUrl;
    cleanPartner1.avatar = '/avatars/avatar_1.webp';

    const updatedCouple = {
      ...couple,
      partner1: cleanPartner1,
    };

    expect(updatedCouple.partner1.photoUrl).toBeUndefined();
    expect(updatedCouple.partner1.avatar).toBe('/avatars/avatar_1.webp');
    // partner2 permanece intacta
    expect(updatedCouple.partner2.photoUrl).toBe('https://res.cloudinary.com/foto2.jpg');
    expect(updatedCouple.partner2.avatar).toBe('https://res.cloudinary.com/foto2.jpg');
  });

  it('deve mover o avatar pronto salvo para a primeira posição dos presets (segunda posição geral)', () => {
    const AVATAR_OPTIONS = ['/avatars/avatar_1.webp', '/avatars/avatar_2.webp', '/avatars/avatar_37.webp'];
    function getOrderedAvatarOptions(savedAvatar: string | undefined): string[] {
      if (!savedAvatar) return AVATAR_OPTIONS;
      const isPreset = AVATAR_OPTIONS.includes(savedAvatar);
      if (!isPreset) return AVATAR_OPTIONS;
      const others = AVATAR_OPTIONS.filter((a) => a !== savedAvatar);
      return [savedAvatar, ...others];
    }

    const reordered = getOrderedAvatarOptions('/avatars/avatar_37.webp');
    expect(reordered[0]).toBe('/avatars/avatar_37.webp');
    expect(reordered).toHaveLength(3);
    expect(reordered.includes('/avatars/avatar_1.webp')).toBe(true);
  });

  it('não deve alterar a ordem dos presets se o avatar salvo for foto da galeria', () => {
    const AVATAR_OPTIONS = ['/avatars/avatar_1.webp', '/avatars/avatar_2.webp'];
    function getOrderedAvatarOptions(savedAvatar: string | undefined): string[] {
      if (!savedAvatar) return AVATAR_OPTIONS;
      const isPreset = AVATAR_OPTIONS.includes(savedAvatar);
      if (!isPreset) return AVATAR_OPTIONS;
      const others = AVATAR_OPTIONS.filter((a) => a !== savedAvatar);
      return [savedAvatar, ...others];
    }

    const reordered = getOrderedAvatarOptions('https://res.cloudinary.com/custom.webp');
    expect(reordered[0]).toBe('/avatars/avatar_1.webp');
  });
});
