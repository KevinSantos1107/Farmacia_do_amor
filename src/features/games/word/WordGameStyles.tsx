export function WordGameStyles() {
  return (
    <style>{`
      /* ── Tile sizing (responsivo: mobile → tablet → desktop) ─── */
      .wg-tile-wrapper {
        width:  clamp(38px, min(11.5vw, 7.5dvh), 56px);
        height: clamp(38px, min(11.5vw, 7.5dvh), 56px);
        position: relative;
        perspective: 900px;
      }

      @media (min-width: 640px) {
        .wg-tile-wrapper {
          width:  clamp(48px, min(8.5vw, 8dvh), 66px);
          height: clamp(48px, min(8.5vw, 8dvh), 66px);
        }
      }

      @media (min-width: 1024px) {
        .wg-tile-wrapper {
          width:  clamp(56px, min(6.5vw, 8.5dvh), 74px);
          height: clamp(56px, min(6.5vw, 8.5dvh), 74px);
        }
      }

      .wg-tile {
        position: absolute;
        inset: 0;
        border-width: 1.5px;
        border-style: solid;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: clamp(15px, min(4vw, 3dvh), 22px);
        letter-spacing: 0.04em;
        text-transform: uppercase;
        border-radius: 9px;
        transition: background-color 0.12s, border-color 0.12s, box-shadow 0.12s, color 0.12s, transform 0.12s;
        transform-style: preserve-3d;
        will-change: transform, box-shadow;
      }

      @media (min-width: 768px) {
        .wg-tile {
          font-size: clamp(18px, min(2.8vw, 3.5dvh), 26px);
          border-radius: 11px;
        }
      }

      @media (min-width: 1024px) {
        .wg-tile {
          font-size: clamp(20px, min(2.2vw, 3dvh), 30px);
          border-radius: 13px;
          border-width: 2px;
        }
      }

      /* ── Active cursor breathe & enter ──────────────────────── */
      .wg-cursor-breathe {
        animation: wg-cursor-in 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), wg-cursor-breathe 1.4s ease-in-out infinite 0.14s;
      }

      @keyframes wg-cursor-in {
        0% { transform: scale(0.92); }
        60% { transform: scale(1.06); }
        100% { transform: scale(1); }
      }

      @keyframes wg-cursor-breathe {
        0%, 100% {
          box-shadow: 0 0 0 1.5px var(--theme-primary), 0 0 18px var(--theme-primary), 0 0 35px rgba(var(--theme-primary-rgb), 0.5);
          background-color: rgba(var(--theme-primary-rgb), 0.2);
        }
        50% {
          box-shadow: 0 0 0 2px var(--theme-primary), 0 0 28px var(--theme-primary), 0 0 50px rgba(var(--theme-primary-rgb), 0.7);
          background-color: rgba(var(--theme-primary-rgb), 0.3);
        }
      }

      /* ── Pop-in animation (typing) ────────────────────── */
      .wg-pop {
        animation: wg-pop-in 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }

      @keyframes wg-pop-in {
        0% { transform: scale(0.85); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }

      /* ── Flip animation (reveal) ──────────────────────── */
      .wg-flip {
        animation: wg-flip-reveal 0.5s ease-in-out both;
      }

      .wg-flip-correct {
        animation: wg-flip-reveal 0.5s ease-in-out both, wg-flip-flash 0.5s ease-in-out both;
      }

      @keyframes wg-flip-reveal {
        0% {
          transform: rotateX(0deg) scale(1);
        }
        45% {
          transform: rotateX(-90deg) scaleY(0.92);
        }
        55% {
          transform: rotateX(-90deg) scaleY(0.92);
        }
        100% {
          transform: rotateX(0deg) scale(1);
        }
      }

      @keyframes wg-flip-flash {
        0%, 48% {
          box-shadow: 0 0 0 rgba(52, 211, 153, 0);
          filter: brightness(1);
        }
        58% {
          box-shadow: 0 0 35px rgba(52, 211, 153, 0.95), 0 0 60px rgba(52, 211, 153, 0.6), inset 0 0 16px rgba(255, 255, 255, 0.7);
          filter: brightness(1.35);
        }
        100% {
          box-shadow: 0 0 20px rgba(52, 211, 153, 0.6);
          filter: brightness(1);
        }
      }

      /* ── Bounce animation (victory) ──────────────────── */
      .wg-bounce {
        animation: wg-bounce-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }

      @keyframes wg-bounce-up {
        0%, 100% {
          transform: translateY(0);
          box-shadow: 0 0 20px rgba(52, 211, 153, 0.6);
        }
        40% {
          transform: translateY(-20px);
          box-shadow: 0 12px 35px rgba(52, 211, 153, 0.95), 0 0 50px rgba(var(--theme-primary-rgb), 0.55);
        }
        60% {
          transform: translateY(-10px);
          box-shadow: 0 6px 25px rgba(52, 211, 153, 0.8), 0 0 35px rgba(var(--theme-primary-rgb), 0.35);
        }
      }

      /* ── Shake animation (invalid) ────────────────────── */
      .wg-shake {
        animation: wg-shake 0.45s cubic-bezier(.36,.07,.19,.97) both;
      }

      @keyframes wg-shake {
        0%, 100% { transform: translateX(0); }
        10%, 50%, 90% { transform: translateX(-6px); }
        30%, 70% { transform: translateX(6px); }
      }

      /* ── Keyboard tactile press feedback ─────────────── */
      .wg-key-press {
        animation: wg-key-press 0.12s ease-out;
      }

      @keyframes wg-key-press {
        0% { transform: translateY(0); filter: brightness(1); }
        50% { transform: translateY(2px) scale(0.96); filter: brightness(1.28); }
        100% { transform: translateY(0); filter: brightness(1); }
      }

      /* ── Keyboard state settle flash ─────────────────── */
      .wg-key-flash {
        animation: wg-key-flash 0.16s ease-out;
      }

      @keyframes wg-key-flash {
        0% { filter: brightness(1); transform: scale(1); }
        50% { filter: brightness(1.6); transform: scale(1.06); }
        100% { filter: brightness(1); transform: scale(1); }
      }

      /* ── Keyboard correct pulsing halo ───────────────── */
      .wg-key-correct {
        animation: wg-key-correct-pulse 2s ease-in-out infinite;
      }

      @keyframes wg-key-correct-pulse {
        0%, 100% {
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.4);
        }
        50% {
          box-shadow: 0 0 22px rgba(52, 211, 153, 0.85), 0 0 35px rgba(52, 211, 153, 0.35);
        }
      }
    `}</style>
  );
}
