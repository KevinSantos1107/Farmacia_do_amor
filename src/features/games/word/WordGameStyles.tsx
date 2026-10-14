export function WordGameStyles() {
  return (
    <style>{`
      /* ── Tile sizing ────────────────────────────────────────── */
      .wg-tile-wrapper {
        width: clamp(40px, min(11.5vw, 8.5dvh), 60px);
        height: clamp(40px, min(11.5vw, 8.5dvh), 60px);
        position: relative;
        perspective: 900px;
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
        transition: background-color 0.25s, border-color 0.25s, box-shadow 0.25s, color 0.25s;
        transform-style: preserve-3d;
        will-change: transform;
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

      @keyframes wg-flip-reveal {
        0% { transform: rotateX(0deg); }
        45% { transform: rotateX(-90deg); }
        55% { transform: rotateX(-90deg); }
        100% { transform: rotateX(0deg); }
      }

      /* ── Bounce animation (victory) ──────────────────── */
      .wg-bounce {
        animation: wg-bounce-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }

      @keyframes wg-bounce-up {
        0%, 100% { transform: translateY(0); }
        40% { transform: translateY(-20px); }
        60% { transform: translateY(-10px); }
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
    `}</style>
  );
}
