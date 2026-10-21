import { useEffect, useState } from 'react';
import {
  collection, doc, getDoc, getDocs, updateDoc, setDoc, deleteDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { useSiteId } from '../../services/firestore/paths';
import { getPlayerIds } from '../../features/auth/playerIds';
import type { QuizQuestion, QuizConfig } from '../../features/quiz/schema';
import { DEFAULT_QUIZ_CONFIG } from '../../features/quiz/schema';
import { Plus, Save, Trash2, Image as ImageIcon, EyeOff, AlertTriangle, Brain, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { uploadImage } from '../../services/cloudinary/upload';
import {
  generateQuestionsFromGemini,
  saveAiQuestionsToFirestore,
  deleteAllAiQuestions,
  getAiQuestionCount,
  type CoupleStoryData,
} from '../../features/quiz/services/aiQuizService';
import { AdminPageHeader } from './AdminPageHeader';

const EMPTY_FORM: CoupleStoryData = {
  names: '',
  dates: '',
  places: '',
  phrases: '',
  media: '',
  food: '',
  memories: '',
  other: '',
};

const FIELD_CONFIG: Array<{
  key: keyof CoupleStoryData;
  label: string;
  placeholder: string;
  emoji: string;
}> = [
  { key: 'names', label: 'Nomes do casal', placeholder: 'Ex: Kevin e Iara', emoji: '💑' },
  { key: 'dates', label: 'Datas e momentos importantes', placeholder: 'Ex: Se conheceram em 10/03/2022...', emoji: '📅' },
  { key: 'places', label: 'Lugares especiais', placeholder: 'Ex: Restaurante favorito...', emoji: '📍' },
  { key: 'phrases', label: 'Frases marcantes, apelidos e piadas internas', placeholder: 'Ex: Apelido dela...', emoji: '💬' },
  { key: 'media', label: 'Músicas, filmes e séries favoritos do casal', placeholder: 'Ex: Música do casal...', emoji: '🎵' },
  { key: 'food', label: 'Comidas, pratos e restaurantes preferidos', placeholder: 'Ex: Ele ama pizza...', emoji: '🥘' },
  { key: 'memories', label: 'Momentos engraçados ou marcantes', placeholder: 'Ex: Uma vez ele...', emoji: '😂' },
  { key: 'other', label: 'Outros detalhes únicos', placeholder: 'Ex: Ele tem medo de barata...', emoji: '💝' },
];

const getPrefix = (gender?: string) => {
  if (gender === 'M') return 'do';
  if (gender === 'F') return 'da';
  return 'de';
};

export default function QuizEditor() {
  const { config: siteConfig } = useSiteConfigStore();
  const siteId = useSiteId();
  const { p1Id, p2Id } = getPlayerIds(siteConfig);
  
  const p1Name = siteConfig?.couple?.partner1?.name || p1Id;
  const p1Gender = siteConfig?.couple?.partner1?.gender;
  const prefix1 = getPrefix(p1Gender);

  const p2Name = siteConfig?.couple?.partner2?.name || p2Id;
  const p2Gender = siteConfig?.couple?.partner2?.gender;
  const prefix2 = getPrefix(p2Gender);

  const [activeTab, setActiveTab] = useState<'p1' | 'p2' | 'ai'>('p1');
  
  // ==========================================
  // ESTADO - CONFIG & PERGUNTAS MANUAIS
  // ==========================================
  const [config, setConfig] = useState<QuizConfig>(DEFAULT_QUIZ_CONFIG);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [secretFile, setSecretFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [revealedTabs, setRevealedTabs] = useState<Set<'p1'|'p2'>>(new Set());

  // ==========================================
  // ESTADO - IA
  // ==========================================
  const [aiForm, setAiForm] = useState<CoupleStoryData>(EMPTY_FORM);
  const [aiStatus, setAiStatus] = useState<'idle' | 'generating' | 'saving' | 'done' | 'error'>('idle');
  const [aiStatusMsg, setAiStatusMsg] = useState('');
  const [existingAiCount, setExistingAiCount] = useState<number | null>(null);

  // Pre-fill names when available
  useEffect(() => {
    if (!aiForm.names && p1Name && p2Name) {
      setAiForm(prev => ({ ...prev, names: `${p1Name} e ${p2Name}` }));
    }
  }, [p1Name, p2Name, aiForm.names]);

  useEffect(() => {
    if (!siteId) return;
    const loadData = async () => {
      try {
        const configRef = doc(db, 'sites', siteId, 'quiz_config', 'main');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          setConfig({ ...DEFAULT_QUIZ_CONFIG, ...configSnap.data() } as QuizConfig);
        }

        const qRef = collection(db, 'sites', siteId, 'quiz_questions');
        const qSnap = await getDocs(query(qRef, orderBy('order', 'asc')));
        setQuestions(qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizQuestion)));
        
        const aiCount = await getAiQuestionCount(siteId);
        setExistingAiCount(aiCount);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [siteId]);

  // ==========================================
  // LÓGICA - MANUAIS
  // ==========================================
  const currentCreatorId = activeTab === 'p1' ? p1Id : p2Id;
  const currentQuestions = questions.filter(q => 
    (activeTab === 'p1' && (!q.createdBy || q.createdBy === p1Id)) || 
    (activeTab === 'p2' && q.createdBy === p2Id)
  );

  const handleSaveConfigAndManual = async () => {
    if (!siteId) return;
    setIsSaving(true);
    try {
      let finalConfig = { ...config };
      
      if (secretFile && finalConfig.secretReward?.type === 'photo') {
        const res = await uploadImage(secretFile, `${siteId}/quiz`);
        finalConfig.secretReward.content = res.secureUrl;
        setConfig(finalConfig);
      }

      const configRef = doc(db, 'sites', siteId, 'quiz_config', 'main');
      await setDoc(configRef, finalConfig, { merge: true });

      for (const q of questions) {
        const qToSave = { ...q, createdBy: q.createdBy || p1Id };
        
        if (!q.id.startsWith('new-')) {
          await updateDoc(doc(db, 'sites', siteId, 'quiz_questions', q.id), qToSave);
        } else {
          const newDocRef = doc(collection(db, 'sites', siteId, 'quiz_questions'));
          const newQ = { ...qToSave, id: newDocRef.id };
          await setDoc(newDocRef, newQ);
          setQuestions((prev) => prev.map((p) => (p.id === q.id ? newQ : p)));
        }
      }
      setSecretFile(null);
      alert('Salvo com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `new-${Date.now()}`,
      siteId: siteId || '',
      question: '',
      options: [
        { id: 'opt-1', text: '' },
        { id: 'opt-2', text: '' },
        { id: 'opt-3', text: '' },
        { id: 'opt-4', text: '' },
      ],
      correctOptionId: 'opt-1',
      points: 100,
      active: true,
      order: questions.length,
      createdBy: currentCreatorId,
    };
    setQuestions([...questions, newQ]);
    
    // Auto-reveal the tab when adding a new question so they can edit it
    if (activeTab === 'p1' || activeTab === 'p2') {
      setRevealedTabs(prev => new Set(prev).add(activeTab));
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Excluir pergunta?')) return;
    if (!id.startsWith('new-') && siteId) {
      await deleteDoc(doc(db, 'sites', siteId, 'quiz_questions', id));
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // ==========================================
  // LÓGICA - IA
  // ==========================================
  const handleAiChange = (key: keyof CoupleStoryData, value: string) => {
    setAiForm((prev) => ({ ...prev, [key]: value }));
  };

  const isAiFormEmpty = Object.entries(aiForm)
    .filter(([k]) => k !== 'names')
    .every(([, v]) => !v.trim());

  const handleGenerateAi = async (overwrite: boolean) => {
    if (!aiForm.names.trim()) {
      setAiStatusMsg('Preencha o campo "Nomes do casal" antes de gerar.');
      setAiStatus('error');
      return;
    }
    if (isAiFormEmpty) {
      setAiStatusMsg('Preencha pelo menos um campo além dos nomes para gerar perguntas relevantes.');
      setAiStatus('error');
      return;
    }

    try {
      setAiStatus('generating');
      setAiStatusMsg('Enviando dados para a IA... Isso pode levar alguns segundos.');

      const generatedQs = await generateQuestionsFromGemini(aiForm);
      setAiStatusMsg(`✓ IA gerou ${generatedQs.length} perguntas! Salvando no banco...`);

      setAiStatus('saving');
      if (overwrite && (existingAiCount ?? 0) > 0) {
        setAiStatusMsg('Deletando perguntas antigas...');
        await deleteAllAiQuestions(siteId);
      }

      setAiStatusMsg('Salvando perguntas no banco de dados...');
      const result = await saveAiQuestionsToFirestore(siteId, generatedQs, config.pointsCorrect);

      const newCount = await getAiQuestionCount(siteId);
      setExistingAiCount(newCount);

      setAiStatus('done');
      setAiStatusMsg(`✅ ${result.generated} perguntas de IA salvas com sucesso! O quiz já vai usá-las automaticamente.`);
    } catch (err: unknown) {
      setAiStatus('error');
      const msg = err instanceof Error ? err.message : 'Falha desconhecida.';
      setAiStatusMsg(`Erro: ${msg}`);
    }
  };

  const handleDeleteAi = async () => {
    if (!confirm(`Deletar todas as ${existingAiCount} perguntas de IA? Essa ação não pode ser desfeita.`)) return;
    try {
      setAiStatus('saving');
      setAiStatusMsg('Deletando...');
      await deleteAllAiQuestions(siteId);
      setExistingAiCount(0);
      setAiStatus('idle');
      setAiStatusMsg('');
    } catch (err: unknown) {
      setAiStatus('error');
      const msg = err instanceof Error ? err.message : String(err);
      setAiStatusMsg(`Erro ao deletar: ${msg}`);
    }
  };

  if (isLoading) return <div className="p-8 text-white">Carregando...</div>;

  const isCurrentTabRevealed = activeTab === 'p1' || activeTab === 'p2' ? revealedTabs.has(activeTab) : true;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* HEADER PRINCIPAL */}
      <AdminPageHeader
        title="Quiz do Casal"
        description="Gerencie as perguntas manuais, perguntas com IA e recompensas do quiz."
        className="mb-8"
        actions={
          <button
            onClick={handleSaveConfigAndManual}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Tudo'}
          </button>
        }
      />

      {/* CONFIGURAÇÕES GERAIS */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Configurações Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex items-center gap-3 text-white">
            <input 
              type="checkbox" 
              checked={config.active} 
              onChange={(e) => setConfig({...config, active: e.target.checked})}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
            />
            Quiz Ativado
          </label>
          <label className="flex items-center gap-3 text-white">
            <input 
              type="checkbox" 
              checked={config.shuffleQuestions} 
              onChange={(e) => setConfig({...config, shuffleQuestions: e.target.checked})}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
            />
            Embaralhar Perguntas
          </label>
          <label className="flex items-center gap-3 text-white">
            <input 
              type="checkbox" 
              checked={config.shuffleOptions} 
              onChange={(e) => setConfig({...config, shuffleOptions: e.target.checked})}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
            />
            Embaralhar Alternativas
          </label>
        </div>
        
        <div className="mt-8 border-t border-white/10 pt-6">
          <h3 className="text-lg font-bold text-white mb-4">Recompensa Secreta (100% de Acerto)</h3>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 text-white">
              <span className="text-sm">Tipo de Recompensa:</span>
              <select 
                value={config.secretReward?.type || 'none'}
                onChange={(e) => setConfig({...config, secretReward: { type: e.target.value as 'none' | 'message' | 'photo', content: config.secretReward?.content || '' }})}
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="none">Nenhuma</option>
                <option value="message">Mensagem Especial</option>
                <option value="photo">Foto Secreta (URL)</option>
              </select>
            </label>
            
            {config.secretReward?.type !== 'none' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm text-white/70">
                  {config.secretReward?.type === 'message' ? 'Escreva a mensagem especial:' : 'Escolha a foto secreta:'}
                </label>
                
                {config.secretReward?.type === 'message' ? (
                  <textarea 
                    value={config.secretReward?.content || ''}
                    onChange={(e) => setConfig({...config, secretReward: { type: 'message', content: e.target.value }})}
                    placeholder="Ex: Você ganhou uma massagem grátis hoje! ❤️"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none min-h-[80px]"
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {secretFile ? (
                      <div className="relative w-full max-w-xs aspect-video bg-black/30 rounded-xl overflow-hidden border border-white/10">
                        <img src={URL.createObjectURL(secretFile)} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : config.secretReward?.content ? (
                      <div className="relative w-full max-w-xs aspect-video bg-black/30 rounded-xl overflow-hidden border border-white/10">
                        <img src={config.secretReward.content} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full max-w-xs aspect-video bg-white/5 border border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 text-white/30">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-sm">Nenhuma foto adicionada ainda</span>
                      </div>
                    )}
                    <label className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-3 text-white cursor-pointer transition-colors max-w-xs">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">{config.secretReward?.content || secretFile ? 'Trocar Foto' : 'Selecionar Foto'}</span>
                      <input type="file" accept="image/*,.heic,.heif,.HEIC,.HEIF" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setSecretFile(e.target.files[0]); }} />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABS HEADER */}
      <div className="flex overflow-x-auto border-b border-white/10 mb-6 gap-2 no-scrollbar">
        <button
          onClick={() => setActiveTab('p1')}
          className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'p1' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-white/60 hover:text-white hover:border-white/20'
          }`}
        >
          Perguntas {prefix1} {p1Name}
        </button>
        <button
          onClick={() => setActiveTab('p2')}
          className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'p2' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-white/60 hover:text-white hover:border-white/20'
          }`}
        >
          Perguntas {prefix2} {p2Name}
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'ai' ? 'border-purple-500 text-purple-400' : 'border-transparent text-white/60 hover:text-white hover:border-white/20'
          }`}
        >
          <Brain className="w-4 h-4" /> Perguntas da IA
        </button>
      </div>

      {/* TABS CONTENT - PERGUNTAS MANUAIS (P1 ou P2) */}
      {(activeTab === 'p1' || activeTab === 'p2') && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                Perguntas criadas por {activeTab === 'p1' ? p1Name : p2Name}
              </h2>
              <p className="text-white/60 text-sm mt-1">
                Essas perguntas vão compor o quiz e surpreender {activeTab === 'p1' ? p2Name : p1Name}!
              </p>
            </div>
            <button
              onClick={handleAddQuestion}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm whitespace-nowrap ml-4"
            >
              <Plus className="w-4 h-4" /> Nova Pergunta
            </button>
          </div>

          {currentQuestions.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-sm border border-dashed border-white/10 rounded-xl">
              Nenhuma pergunta cadastrada nesta aba ainda. Clique em "Nova Pergunta".
            </div>
          ) : !isCurrentTabRevealed ? (
            <div className="flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/10 py-20 px-6 animate-in zoom-in-95 duration-300">
              <EyeOff className="w-12 h-12 text-white/30 mb-4" />
              <p className="text-white font-bold mb-2 text-xl">Gabarito Oculto ({currentQuestions.length} perguntas)</p>
              <p className="text-white/50 text-sm mb-8 max-w-md text-center leading-relaxed">
                Essas perguntas são {activeTab === 'p1' ? prefix1 : prefix2} {activeTab === 'p1' ? p1Name : p2Name}.
                Tem certeza que deseja ver as respostas e estragar a surpresa?
              </p>
              <button 
                onClick={() => setRevealedTabs(prev => new Set(prev).add(activeTab))}
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform hover:scale-105"
              >
                Sim, Exibir Perguntas
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              {currentQuestions.map((q) => {
                  const index = questions.findIndex(globalQ => globalQ.id === q.id);

                  return (
                    <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 flex flex-col gap-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => {
                              const newQs = [...questions];
                              newQs[index].question = e.target.value;
                              setQuestions(newQs);
                            }}
                            placeholder="Ex: Onde foi nosso primeiro beijo?"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none font-medium"
                          />
                        </div>
                        <button 
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                          title="Excluir Pergunta"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-white/10">
                        {q.options.map((opt, optIdx) => (
                          <div key={opt.id} className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={q.correctOptionId === opt.id}
                              onChange={() => {
                                const newQs = [...questions];
                                newQs[index].correctOptionId = opt.id;
                                setQuestions(newQs);
                              }}
                              className="w-5 h-5 text-emerald-500 bg-white/10 border-white/20 focus:ring-emerald-500"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const newQs = [...questions];
                                newQs[index].options[optIdx].text = e.target.value;
                                setQuestions(newQs);
                              }}
                              placeholder={`Alternativa ${optIdx + 1}`}
                              className={`flex-1 bg-black/20 border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none ${
                                q.correctOptionId === opt.id
                                  ? 'border-emerald-500/50 focus:border-emerald-500'
                                  : 'border-white/10 focus:border-emerald-500'
                              }`}
                            />
                            {q.correctOptionId === opt.id && (
                              <span className="text-[10px] text-emerald-400 font-medium shrink-0">✓ correta</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TABS CONTENT - IA */}
      {activeTab === 'ai' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-sm text-white/70">
              <p className="font-medium text-white/90 mb-1">Gerador de Perguntas com Inteligência Artificial</p>
              <p>
                Preencha fatos sobre vocês. A IA gerará dezenas de perguntas criativas que ficarão escondidas 
                no banco de dados e aparecerão de surpresa para os dois durante o jogo.
              </p>
            </div>
          </div>

          {existingAiCount !== null && (
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-4">
              <div>
                <p className="text-white font-medium">Perguntas de IA no banco</p>
                <p className="text-white/50 text-sm">
                  {existingAiCount === 0
                    ? 'Nenhuma pergunta gerada ainda.'
                    : `${existingAiCount} perguntas prontas para o quiz.`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold font-mono ${existingAiCount > 0 ? 'text-purple-400' : 'text-white/30'}`}>
                  {existingAiCount}
                </span>
                {existingAiCount > 0 && (
                  <button
                    onClick={handleDeleteAi}
                    disabled={aiStatus === 'generating' || aiStatus === 'saving'}
                    title="Deletar todas as perguntas de IA"
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-6 bg-white/5 border border-white/10 rounded-xl p-6">
            {FIELD_CONFIG.map(({ key, label, placeholder, emoji }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {emoji} {label}
                  {key === 'names' && <span className="text-red-400 ml-1">*</span>}
                </label>
                {key === 'names' ? (
                  <input
                    type="text"
                    value={aiForm[key]}
                    onChange={(e) => handleAiChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none text-sm"
                  />
                ) : (
                  <textarea
                    value={aiForm[key]}
                    onChange={(e) => handleAiChange(key, e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none text-sm resize-y min-h-[72px]"
                  />
                )}
              </div>
            ))}
          </div>

          {aiStatusMsg && (
            <div
              className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
                aiStatus === 'error'
                  ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                  : aiStatus === 'done'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
              }`}
            >
              {aiStatus === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : aiStatus === 'done' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
              )}
              <span>{aiStatusMsg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {existingAiCount !== null && existingAiCount > 0 ? (
              <>
                <button
                  onClick={() => handleGenerateAi(false)}
                  disabled={aiStatus === 'generating' || aiStatus === 'saving'}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600/60 hover:bg-purple-600/80 text-white rounded-xl font-medium transition-colors disabled:opacity-40 text-sm"
                >
                  <Sparkles className="w-4 h-4" /> Gerar e Adicionar às existentes
                </button>
                <button
                  onClick={() => handleGenerateAi(true)}
                  disabled={aiStatus === 'generating' || aiStatus === 'saving'}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-40 text-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Gerar e Substituir tudo
                </button>
              </>
            ) : (
              <button
                onClick={() => handleGenerateAi(false)}
                disabled={aiStatus === 'generating' || aiStatus === 'saving'}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all disabled:opacity-40 text-sm shadow-[0_0_20px_rgba(147,51,234,0.3)]"
              >
                {aiStatus === 'generating' || aiStatus === 'saving' ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> {aiStatus === 'generating' ? 'Gerando...' : 'Salvando...'}</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Gerar Perguntas com IA</>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
