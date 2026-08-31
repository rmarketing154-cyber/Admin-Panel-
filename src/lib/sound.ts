// Web Audio API Sound Alert Generator
// Generates crystal-clear synthesized notification chimes without external assets

class SoundAlertManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch (e) {
      console.warn('AudioContext initialization error:', e);
      return null;
    }
  }

  /**
   * Melodic 3-tone chime for New Submissions (Work Queue)
   */
  playSubmissionAlert(volume = 0.8) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 587.33, start: 0.0, dur: 0.35, gain: 0.3 },   // D5
        { freq: 880.00, start: 0.12, dur: 0.40, gain: 0.35 },  // A5
        { freq: 1174.66, start: 0.24, dur: 0.65, gain: 0.45 }  // D6
      ];

      notes.forEach(({ freq, start, dur, gain: gVal }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(gVal * volume, now + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } catch (e) {
      console.warn('Failed to play submission alert sound:', e);
    }
  }

  /**
   * Crisp 2-tone alert chime for Push Notifications and System Alerts
   */
  playPushNotificationAlert(volume = 0.8) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 783.99, start: 0.0, dur: 0.25, gain: 0.35 },  // G5
        { freq: 1046.50, start: 0.10, dur: 0.45, gain: 0.4 }  // C6
      ];

      notes.forEach(({ freq, start, dur, gain: gVal }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(gVal * volume, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } catch (e) {
      console.warn('Failed to play push notification sound:', e);
    }
  }

  /**
   * Soft cash register / ding chime for Withdrawals
   */
  playWithdrawalAlert(volume = 0.8) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, start: 0.0, dur: 0.2, gain: 0.3 },    // C5
        { freq: 659.25, start: 0.08, dur: 0.2, gain: 0.35 },  // E5
        { freq: 783.99, start: 0.16, dur: 0.2, gain: 0.4 },   // G5
        { freq: 1046.50, start: 0.24, dur: 0.5, gain: 0.45 }  // C6
      ];

      notes.forEach(({ freq, start, dur, gain: gVal }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(gVal * volume, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } catch (e) {
      console.warn('Failed to play withdrawal sound:', e);
    }
  }

  /**
   * Upbeat double-chime for incoming buyer deposit requests
   */
  playDepositAlert(volume = 0.8) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 440.00, start: 0.0, dur: 0.2, gain: 0.3 },   // A4
        { freq: 554.37, start: 0.08, dur: 0.25, gain: 0.35 }, // C#5
        { freq: 659.25, start: 0.16, dur: 0.45, gain: 0.45 }  // E5
      ];

      notes.forEach(({ freq, start, dur, gain: gVal }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(gVal * volume, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } catch (e) {
      console.warn('Failed to play deposit alert sound:', e);
    }
  }

  /**
   * Warm notification sound for support chat
   */
  playChatAlert(volume = 0.8) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35 * volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('Failed to play chat alert sound:', e);
    }
  }
}

export const soundAlerts = new SoundAlertManager();
