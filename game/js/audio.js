let context;
export function beep(kind = 'play') {
  try {
    context ??= new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const pitch = kind === 'win' ? 660 : kind === 'trick' ? 520 : 350;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(pitch, now);
    oscillator.frequency.exponentialRampToValueAtTime(pitch * 1.35, now + 0.09);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.14);
  } catch { /* Audio is optional when the browser blocks it. */ }
}
