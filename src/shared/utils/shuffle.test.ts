import { describe, it, expect, vi, afterEach } from 'vitest';
import { shuffle } from './shuffle';

describe('shuffle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserva os mesmos elementos e o mesmo tamanho', () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle(original);

    expect(result).toHaveLength(original.length);
    expect([...result].sort((a, b) => a - b)).toEqual([...original].sort((a, b) => a - b));
  });

  it('não muta o array de entrada', () => {
    const original = Object.freeze([10, 20, 30, 40]);
    const clone = [...original];

    const result = shuffle(original);

    expect(original).toEqual(clone);
    expect(result).not.toBe(original);
  });

  it('lida com arrays vazios ou unitários', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([42])).toEqual([42]);
  });

  it('é determinístico quando Math.random é controlado com vi.spyOn', () => {
    // Para arr = ['a', 'b', 'c'] (tamanho 3):
    // i = 2: Math.random() = 0 -> j = floor(0 * 3) = 0 -> swap index 2 com 0: ['c', 'b', 'a']
    // i = 1: Math.random() = 0.999 -> j = floor(0.999 * 2) = 1 -> swap index 1 com 1: ['c', 'b', 'a']
    const mockRandom = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.999);

    const input = ['a', 'b', 'c'];
    const result = shuffle(input);

    expect(mockRandom).toHaveBeenCalledTimes(2);
    expect(result).toEqual(['c', 'b', 'a']);
  });
});
