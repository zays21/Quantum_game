import * as Tone from "tone";

export class GameAudio {
  private collapseSynth: Tone.MembraneSynth | null = null;
  private superpositionSynth: Tone.FMSynth | null = null;
  private reflectSynth: Tone.MetalSynth | null = null;
  private transmitSynth: Tone.Synth | null = null;
  private started = false;

  private async ensureStarted() {
    if (!this.started) {
      await Tone.start();
      this.started = true;
    }
  }

  private initSynths() {
    if (this.collapseSynth) return;

    this.collapseSynth = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 4,
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.05,
      },
      volume: -8,
    }).toDestination();

    this.superpositionSynth = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 10,
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.3,
        decay: 0.4,
        sustain: 0.1,
        release: 0.6,
      },
      modulation: { type: "triangle" },
      modulationEnvelope: {
        attack: 0.2,
        decay: 0.3,
        sustain: 0.2,
        release: 0.4,
      },
      volume: -18,
    }).toDestination();

    this.reflectSynth = new Tone.MetalSynth({
      harmonicity: 5.1,
      resonance: 1200,
      modulationIndex: 16,
      envelope: {
        decay: 0.12,
      },
      volume: -16,
    }).toDestination();

    this.transmitSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0,
        release: 0.1,
      },
      volume: -12,
    }).toDestination();
  }

  async playCollapse() {
    await this.ensureStarted();
    this.initSynths();
    this.collapseSynth!.triggerAttackRelease("C2", "16n");
  }

  async playSuperposition() {
    await this.ensureStarted();
    this.initSynths();
    this.superpositionSynth!.triggerAttackRelease("C5", "8n");
  }

  async playReflect() {
    await this.ensureStarted();
    this.initSynths();
    this.reflectSynth!.triggerAttackRelease(200, "16n");
  }

  async playTransmit() {
    await this.ensureStarted();
    this.initSynths();
    // Quick ascending pitch sweep for tunneling effect
    const now = Tone.now();
    this.transmitSynth!.frequency.setValueAtTime(330, now); // E4
    this.transmitSynth!.frequency.linearRampToValueAtTime(523, now + 0.15); // C5
    this.transmitSynth!.triggerAttackRelease("E4", "8n", now);
  }
}
