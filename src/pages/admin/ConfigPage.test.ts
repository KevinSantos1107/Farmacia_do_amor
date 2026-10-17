import { describe, it, expect } from 'vitest';
import {
  mergeStoreConfigIntoForm,
  getChangedConfigFields,
} from './ConfigPage';
import type { SiteConfig } from '../../config/siteConfig.schema';

describe('ConfigPage - Preservação de Edições não Salvas (ITEM 4)', () => {
  const initialConfig: SiteConfig = {
    id: 'meu-site',
    couple: {
      partner1: {
        name: 'Kevin',
        playerId: 'kevin',
        gender: 'M',
        avatar: '/avatars/avatar_1.webp',
      },
      partner2: {
        name: 'Iara',
        playerId: 'iara',
        gender: 'F',
        avatar: '/avatars/avatar_2.webp',
      },
    },
    relationship: {
      startDate: '2021-06-12',
    },
    theme: {
      colors: {
        bg: '#05050A',
        primary: '#9d4edd',
        secondary: '#e0aaff',
        accent: '#c77dff',
        text: '#ffffff',
        textSecondary: '#aaaaaa',
        cardBg: '#111122',
        cardBorder: '#222244',
      },
    },
    features: {
      enableTimeline: true,
      enableGames: true,
      enableMusic: true,
      enableAlbum: true,
    },
  };

  it('cenário solicitado: editar nome → enviar foto → o nome editado continua no formulário', () => {
    // 1. Estado inicial do formulário idêntico ao config
    const currentForm: Partial<SiteConfig> = {
      couple: { ...initialConfig.couple },
      relationship: { ...initialConfig.relationship },
      features: { ...initialConfig.features },
      theme: { ...initialConfig.theme },
    };

    // 2. Usuário edita o nome do parceiro 1 no formulário (ainda não clicou em salvar)
    currentForm.couple = {
      ...currentForm.couple!,
      partner1: {
        ...currentForm.couple!.partner1,
        name: 'Kevin Meu Amor',
      },
    };

    // 3. Usuário faz upload de foto via AvatarPicker, o que altera o store no Firestore
    const updatedStoreConfig: SiteConfig = {
      ...initialConfig,
      couple: {
        ...initialConfig.couple,
        partner1: {
          ...initialConfig.couple.partner1,
          photoUrl: 'https://cloudinary.com/new_avatar.webp',
          avatar: 'https://cloudinary.com/new_avatar.webp',
          _photoPublicId: 'avatars/meu-site/partner1/123',
        },
      },
    };

    // 4. O useEffect([config]) dispara e executa mergeStoreConfigIntoForm
    const mergedForm = mergeStoreConfigIntoForm(
      initialConfig,
      updatedStoreConfig,
      currentForm
    );

    // O NOME EDITADO DEVE CONTINUAR NO FORMULÁRIO (não pode voltar para 'Kevin')
    expect(mergedForm.couple?.partner1.name).toBe('Kevin Meu Amor');

    // A nova foto enviada deve ter sido assimilada
    expect(mergedForm.couple?.partner1.photoUrl).toBe('https://cloudinary.com/new_avatar.webp');
    expect(mergedForm.couple?.partner1.avatar).toBe('https://cloudinary.com/new_avatar.webp');
    expect(mergedForm.couple?.partner1._photoPublicId).toBe('avatars/meu-site/partner1/123');

    // Dados do parceiro 2 devem continuar preservados
    expect(mergedForm.couple?.partner2.name).toBe('Iara');
  });

  it('assimila atualizações externas de campos que o usuário não mexeu', () => {
    const currentForm: Partial<SiteConfig> = {
      couple: { ...initialConfig.couple },
      relationship: { ...initialConfig.relationship },
      features: { ...initialConfig.features },
    };

    // O store atualiza o nome do parceiro 2
    const updatedStoreConfig: SiteConfig = {
      ...initialConfig,
      couple: {
        ...initialConfig.couple,
        partner2: {
          ...initialConfig.couple.partner2,
          name: 'Iara Santos',
        },
      },
    };

    const mergedForm = mergeStoreConfigIntoForm(
      initialConfig,
      updatedStoreConfig,
      currentForm
    );

    expect(mergedForm.couple?.partner2.name).toBe('Iara Santos');
  });
});

describe('ConfigPage - Gravação Parcial e Diff (ITEM 3)', () => {
  const currentConfig: SiteConfig = {
    id: 'meu-site',
    couple: {
      partner1: {
        name: 'Kevin',
        playerId: 'kevin',
        gender: 'M',
        avatar: '/avatars/avatar_1.webp',
        photoUrl: 'https://res.cloudinary.com/photo.webp',
        _photoPublicId: 'avatars/1',
      },
      partner2: {
        name: 'Iara',
        playerId: 'iara',
        gender: 'F',
        avatar: '/avatars/avatar_2.webp',
      },
    },
    relationship: {
      startDate: '2021-06-12',
    },
    theme: {
      colors: {
        bg: '#05050A',
        primary: '#9d4edd',
        secondary: '#e0aaff',
        accent: '#c77dff',
        text: '#ffffff',
        textSecondary: '#aaaaaa',
        cardBg: '#111122',
        cardBorder: '#222244',
      },
    },
    features: {
      enableTimeline: true,
      enableGames: true,
      enableMusic: true,
      enableAlbum: true,
    },
  };

  it('retorna objeto vazio se nenhuma alteração foi realizada', () => {
    const changes = getChangedConfigFields(currentConfig, {
      couple: currentConfig.couple,
      relationship: currentConfig.relationship,
      features: currentConfig.features,
    });

    expect(Object.keys(changes)).toHaveLength(0);
  });

  it('retorna apenas os caminhos com dot-notation dos campos modificados', () => {
    const form: Partial<SiteConfig> = {
      couple: {
        partner1: {
          ...currentConfig.couple.partner1,
          name: 'Kevin Santos',
        },
        partner2: currentConfig.couple.partner2,
      },
      relationship: {
        startDate: '2022-01-01',
      },
      features: {
        ...currentConfig.features,
        enableGames: false,
      },
    };

    const changes = getChangedConfigFields(currentConfig, form);

    expect(changes).toEqual({
      'couple.partner1.name': 'Kevin Santos',
      'relationship.startDate': '2022-01-01',
      'features.enableGames': false,
    });

    // Campos como photoUrl, _photoPublicId, avatar etc. NÃO devem aparecer nos changes
    expect(changes['couple.partner1.photoUrl']).toBeUndefined();
    expect(changes['couple']).toBeUndefined();
    expect(changes['theme']).toBeUndefined();
  });

  it('deriva playerId apenas quando partner não possuir playerId prévio', () => {
    const configWithoutPlayerId: SiteConfig = {
      ...currentConfig,
      couple: {
        partner1: { name: '', gender: 'M', avatar: '' } as unknown as SiteConfig['couple']['partner1'],
        partner2: currentConfig.couple.partner2,
      },
    };

    const form: Partial<SiteConfig> = {
      couple: {
        partner1: {
          ...configWithoutPlayerId.couple.partner1,
          name: 'Lucas',
        },
        partner2: currentConfig.couple.partner2,
      },
    };

    const changes = getChangedConfigFields(configWithoutPlayerId, form);
    expect(changes['couple.partner1.name']).toBe('Lucas');
    expect(changes['couple.partner1.playerId']).toBe('lucas');
  });
});
