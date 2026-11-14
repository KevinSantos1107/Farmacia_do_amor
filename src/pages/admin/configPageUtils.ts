import type { SiteConfig } from '../../config/siteConfig.schema';

export const DEFAULT_LETTER_PARAGRAPHS = [
  'Entre tantas pessoas no mundo, foi você quem fez meu coração encontrar um lugar para chamar de lar. Você chegou inesperadamente e transformou meus dias em lembranças mais bonitas, meus sonhos em planos a dois e o meu futuro em algo que mal posso esperar para viver.',
  'Com você, aprendi que o amor está nos pequenos detalhes, na saudade que antecede um abraço e na paz de saber que temos um ao outro. Mesmo quando a distância nos separa, existe algo que nunca muda: é com você que quero compartilhar meus dias, realizar meus sonhos e construir uma vida inteira.',
];

/**
 * Mescla as alterações vindas do store no formData local, preservando
 * edições não salvas do usuário nos campos do formulário (ex.: texto digitado).
 */
export function mergeStoreConfigIntoForm(
  prevConfig: SiteConfig | null,
  newConfig: SiteConfig,
  currentForm: Partial<SiteConfig>
): Partial<SiteConfig> {
  const serverLoveMessages = newConfig.loveMessages ?? [];
  const serverAcrostic = newConfig.acrostic ?? [];
  const serverLetter = (newConfig.letter?.paragraphs && newConfig.letter.paragraphs.length > 0)
    ? newConfig.letter
    : { paragraphs: [...DEFAULT_LETTER_PARAGRAPHS] };

  if (!prevConfig) {
    return {
      couple: newConfig.couple,
      relationship: newConfig.relationship,
      features: newConfig.features,
      theme: newConfig.theme,
      loveMessages: currentForm.loveMessages ?? serverLoveMessages,
      acrostic: currentForm.acrostic ?? serverAcrostic,
      letter: currentForm.letter ?? serverLetter,
    };
  }

  const p1Prev = prevConfig.couple?.partner1;
  const p1New = newConfig.couple?.partner1;
  const p1Form = currentForm.couple?.partner1;

  const partner1 = {
    ...p1New,
    name: (p1Form?.name !== undefined && p1Form.name !== p1Prev?.name) ? p1Form.name : (p1New?.name ?? ''),
    birthDate: (p1Form?.birthDate !== undefined && p1Form.birthDate !== p1Prev?.birthDate) ? p1Form.birthDate : (p1New?.birthDate ?? ''),
    gender: (p1Form?.gender !== undefined && p1Form.gender !== p1Prev?.gender) ? p1Form.gender : (p1New?.gender ?? 'M'),
    avatar: (p1New?.avatar !== p1Prev?.avatar) ? (p1New?.avatar ?? '') : (p1Form?.avatar ?? p1New?.avatar ?? ''),
    photoUrl: p1New?.photoUrl,
    _photoPublicId: p1New?._photoPublicId,
    playerId: p1New?.playerId ?? p1Form?.playerId,
  };

  const p2Prev = prevConfig.couple?.partner2;
  const p2New = newConfig.couple?.partner2;
  const p2Form = currentForm.couple?.partner2;

  const partner2 = {
    ...p2New,
    name: (p2Form?.name !== undefined && p2Form.name !== p2Prev?.name) ? p2Form.name : (p2New?.name ?? ''),
    birthDate: (p2Form?.birthDate !== undefined && p2Form.birthDate !== p2Prev?.birthDate) ? p2Form.birthDate : (p2New?.birthDate ?? ''),
    gender: (p2Form?.gender !== undefined && p2Form.gender !== p2Prev?.gender) ? p2Form.gender : (p2New?.gender ?? 'F'),
    avatar: (p2New?.avatar !== p2Prev?.avatar) ? (p2New?.avatar ?? '') : (p2Form?.avatar ?? p2New?.avatar ?? ''),
    photoUrl: p2New?.photoUrl,
    _photoPublicId: p2New?._photoPublicId,
    playerId: p2New?.playerId ?? p2Form?.playerId,
  };

  const relPrev = prevConfig.relationship;
  const relNew = newConfig.relationship;
  const relForm = currentForm.relationship;

  const relationship = {
    ...relNew,
    startDate: (relForm?.startDate !== undefined && relForm.startDate !== relPrev?.startDate)
      ? relForm.startDate
      : (relNew?.startDate ?? ''),
  };

  const featPrev = prevConfig.features || ({} as SiteConfig['features']);
  const featNew = newConfig.features || ({} as SiteConfig['features']);
  const featForm = currentForm.features || ({} as SiteConfig['features']);

  const features = { ...featNew };
  for (const key of Object.keys(featNew) as Array<keyof SiteConfig['features']>) {
    if (featForm[key] !== undefined && featForm[key] !== featPrev[key]) {
      features[key] = featForm[key];
    }
  }

  const loveMessages = (currentForm.loveMessages !== undefined && JSON.stringify(currentForm.loveMessages) !== JSON.stringify(prevConfig.loveMessages))
    ? currentForm.loveMessages
    : serverLoveMessages;

  const acrostic = (currentForm.acrostic !== undefined && JSON.stringify(currentForm.acrostic) !== JSON.stringify(prevConfig.acrostic))
    ? currentForm.acrostic
    : serverAcrostic;

  const letter = (currentForm.letter !== undefined && JSON.stringify(currentForm.letter) !== JSON.stringify(prevConfig.letter))
    ? currentForm.letter
    : serverLetter;

  return {
    couple: { partner1, partner2 },
    relationship,
    features,
    theme: newConfig.theme,
    loveMessages,
    acrostic,
    letter,
  };
}

/**
 * Calcula apenas os campos alterados pelo formulário em relação à config atual,
 * utilizando notação de ponto (dot-notation) para campos aninhados do casal.
 */
export function getChangedConfigFields(
  current: SiteConfig,
  form: Partial<SiteConfig>
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  // Partner 1
  if (form.couple?.partner1) {
    const f1 = form.couple.partner1;
    const c1 = current.couple?.partner1;

    if (f1.name !== undefined && f1.name !== c1?.name) {
      updates['couple.partner1.name'] = f1.name;
    }
    if (f1.birthDate !== undefined && f1.birthDate !== c1?.birthDate) {
      updates['couple.partner1.birthDate'] = f1.birthDate;
    }
    if (f1.gender !== undefined && f1.gender !== c1?.gender) {
      updates['couple.partner1.gender'] = f1.gender;
    }
    if (f1.avatar !== undefined && f1.avatar !== c1?.avatar) {
      updates['couple.partner1.avatar'] = f1.avatar;
    }
    if (!c1?.playerId && f1.name) {
      updates['couple.partner1.playerId'] = f1.name.toLowerCase();
    }
  }

  // Partner 2
  if (form.couple?.partner2) {
    const f2 = form.couple.partner2;
    const c2 = current.couple?.partner2;

    if (f2.name !== undefined && f2.name !== c2?.name) {
      updates['couple.partner2.name'] = f2.name;
    }
    if (f2.birthDate !== undefined && f2.birthDate !== c2?.birthDate) {
      updates['couple.partner2.birthDate'] = f2.birthDate;
    }
    if (f2.gender !== undefined && f2.gender !== c2?.gender) {
      updates['couple.partner2.gender'] = f2.gender;
    }
    if (f2.avatar !== undefined && f2.avatar !== c2?.avatar) {
      updates['couple.partner2.avatar'] = f2.avatar;
    }
    if (!c2?.playerId && f2.name) {
      updates['couple.partner2.playerId'] = f2.name.toLowerCase();
    }
  }

  // Relationship
  if (form.relationship) {
    if (form.relationship.startDate !== undefined && form.relationship.startDate !== current.relationship?.startDate) {
      updates['relationship.startDate'] = form.relationship.startDate;
    }
  }

  // Features
  if (form.features) {
    for (const [key, val] of Object.entries(form.features)) {
      if (val !== current.features?.[key as keyof SiteConfig['features']]) {
        updates[`features.${key}`] = val;
      }
    }
  }

  // Love Messages
  if (form.loveMessages !== undefined && JSON.stringify(form.loveMessages) !== JSON.stringify(current.loveMessages)) {
    updates['loveMessages'] = form.loveMessages;
  }

  // Acrostic
  if (form.acrostic !== undefined && JSON.stringify(form.acrostic) !== JSON.stringify(current.acrostic)) {
    updates['acrostic'] = form.acrostic;
  }

  // Letter
  if (form.letter !== undefined && JSON.stringify(form.letter) !== JSON.stringify(current.letter)) {
    updates['letter'] = form.letter;
  }

  return updates;
}
