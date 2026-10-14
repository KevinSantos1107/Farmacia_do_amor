import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import type { Question, WordData } from './types';
import { DEFAULT_QUESTIONS } from './wordConstants';
import { normalizeWord } from './wordLogic';

export function useWordQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
          setTimeout(() => {
            setQuestions(DEFAULT_QUESTIONS);
            setQuestionsLoaded(true);
          }, 600);
          return;
        }

        const snap = await getDocs(
          query(collection(db, 'word_game'), orderBy('createdAt', 'asc'))
        );
        if (snap.empty) {
          setQuestions(DEFAULT_QUESTIONS);
          setQuestionsLoaded(true);
          return;
        }

        const loaded: Question[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.pergunta && data.palavras && Array.isArray(data.palavras)) {
            const valid = data.palavras.filter(
              (p: WordData) => p.palavra && p.mensagem && normalizeWord(p.palavra).length === 5
            );
            if (valid.length > 0)
              loaded.push({ id: d.id, pergunta: data.pergunta, palavras: valid });
          } else if (
            data.palavra &&
            data.pergunta &&
            data.mensagem &&
            normalizeWord(data.palavra).length === 5
          ) {
            loaded.push({
              id: d.id,
              pergunta: data.pergunta,
              palavras: [{ palavra: data.palavra, mensagem: data.mensagem }],
            });
          }
        });

        if (loaded.length > 0) {
          setQuestions(loaded);
        } else {
          setQuestions(DEFAULT_QUESTIONS);
        }
      } catch (e) {
        console.warn('Using default questions', e);
        setQuestions(DEFAULT_QUESTIONS);
      } finally {
        setQuestionsLoaded(true);
      }
    };
    fetchQuestions();
  }, []);

  return { questions, questionsLoaded };
}
