/**
 * DevotionalHistory.tsx
 *
 * Tela de devocionais favoritos salvos no Firestore.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DevotionalFavorite } from '../schema';
import { Heart, Trash2, Calendar, ChevronDown, Sparkles } from 'lucide-react';

interface DevotionalHistoryProps {
  favorites: DevotionalFavorite[];
  onRemoveFavorite: (id: string) => void;
  onNewDevotional: () => void;
}

export function DevotionalHistory({
  favorites,
  onRemoveFavorite,
  onNewDevotional,
}: DevotionalHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 px-1 sm:px-0">
      <div className="text-center space-y-2">
        <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold flex items-center justify-center gap-1.5">
          <Heart className="w-3.5 h-3.5 fill-[#ff0055] text-[#ff0055]" />
          Seus Favoritos
        </span>
        <h2 className="text-2xl md:text-3xl font-serif text-[#F5E6CC]">
          Palavras que Marcaram
        </h2>
        <p className="text-xs text-[#F5E6CC]/60 font-light">
          Mensagens e orações guardadas com carinho no seu coração
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="p-10 rounded-3xl bg-[#1F1630]/60 border border-[#D4AF37]/20 text-center space-y-4 backdrop-blur-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <Sparkles className="w-8 h-8" />
          </div>
          <p className="text-sm text-[#F5E6CC]/80 font-serif">
            Você ainda não favoritou nenhum devocional.
          </p>
          <p className="text-xs text-[#F5E6CC]/50 max-w-xs mx-auto">
            Ao ler um devocional diário, clique no ícone de coração para guardá-lo aqui.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onNewDevotional}
              className="px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#D4AF37] text-[#160E24] hover:bg-[#B8962E] transition-colors"
            >
              Fazer devocional agora
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((fav) => {
            const isExpanded = expandedId === fav.id;
            return (
              <motion.div
                key={fav.id || fav.reference}
                layout
                className="rounded-2xl border border-[#D4AF37]/25 bg-[#1F1630]/70 backdrop-blur-xl overflow-hidden transition-all duration-300"
              >
                <div
                  onClick={() => fav.id && toggleExpand(fav.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                        {fav.reference}
                      </span>
                      <span className="text-xs text-[#F5E6CC]/40 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fav.date}
                      </span>
                    </div>

                    <p className="text-sm font-serif italic text-[#F5E6CC]/90 line-clamp-1">
                      "{fav.verse}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pl-3 shrink-0">
                    {fav.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFavorite(fav.id!);
                        }}
                        title="Remover dos favoritos"
                        className="p-2 rounded-lg text-[#F5E6CC]/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-[#D4AF37]" />
                    </motion.div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-2 space-y-4 border-t border-[#D4AF37]/15 text-sm leading-relaxed text-[#F5E6CC]/85 font-light">
                        <div>
                          <p className="text-base font-serif italic text-[#F5E6CC] mb-2">
                            "{fav.verse}"
                          </p>
                        </div>

                        <div className="pt-2">
                          <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold mb-1">
                            Meditação
                          </p>
                          <p>{fav.meditation}</p>
                        </div>

                        {fav.couplePrompt && (
                          <div className="p-3.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25">
                            <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold mb-1">
                              Frase do Casal
                            </p>
                            <p className="italic">"{fav.couplePrompt}"</p>
                          </div>
                        )}

                        <div className="p-3.5 rounded-xl bg-[#160E24]/80 border border-[#D4AF37]/20">
                          <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold mb-1">
                            Pergunta de Reflexão
                          </p>
                          <p className="italic">"{fav.reflectionQuestion}"</p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                          <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold mb-1">
                            Desafio
                          </p>
                          <p>{fav.practicalChallenge}</p>
                        </div>

                        {fav.prayer && (
                          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#2D1B4E]/60 to-[#1F1630]/60 border border-[#D4AF37]/25">
                            <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold mb-1">
                              Oração
                            </p>
                            <p className="italic font-serif">"{fav.prayer}"</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
