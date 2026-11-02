// Optional new-order chime for the kitchen board, made with the browser's built-in Web Audio API
// (no sound file, no dependency). Browsers block sound until the user interacts with the page, so the
// audio is only created when someone taps the "Sound" toggle.

type AudioCtor = typeof AudioContext;

export interface Chime {
  /** Call from the toggle's click handler. Plays a short test chime; false if this browser has no audio. */
  enable(): Promise<boolean>;
  /** Two short rising notes. Does nothing until enable() has worked. */
  play(): void;
}

export function createChime(): Chime {
  let ctx: AudioContext | null = null;

  function note(at: number, frequency: number) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.4);
  }

  function play() {
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    note(now, 880);
    note(now + 0.18, 1175);
  }

  return {
    async enable() {
      const Ctor: AudioCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return false;
      try {
        ctx ??= new Ctor();
        if (ctx.state === "suspended") await ctx.resume();
        play();
        return ctx.state === "running";
      } catch {
        return false;
      }
    },
    play,
  };
}
