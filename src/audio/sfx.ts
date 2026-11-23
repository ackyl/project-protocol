// Original procedural sound cues (Web Audio). Nothing is loaded from disk.
type Wave = OscillatorType

class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private hum: { osc: OscillatorNode; gain: GainNode } | null = null
  private alarmNext = 0
  private hissNext = 0
  private chirpNext = 0
  muted = false

  constructor() {
    try {
      this.muted = localStorage.getItem('pp-muted') === '1'
    } catch {
      /* storage unavailable */
    }
  }

  /** Must run from a user gesture. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.5
    this.master.connect(this.ctx.destination)
  }

  toggleMute() {
    this.muted = !this.muted
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5
    try {
      localStorage.setItem('pp-muted', this.muted ? '1' : '0')
    } catch {
      /* ignore */
    }
    return this.muted
  }

  private tone(freq: number, dur: number, type: Wave = 'square', vol = 0.15, slide?: number, delay = 0) {
    const c = this.ctx
    if (!c || !this.master) return
    const t = c.currentTime + delay
    const o = c.createOscillator(),
      g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  private noise(dur: number, vol = 0.2, freq = 1200, q = 0.7, delay = 0) {
    const c = this.ctx
    if (!c || !this.master) return
    const t = c.currentTime + delay
    const len = Math.max(1, Math.floor(c.sampleRate * dur))
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = c.createBufferSource()
    src.buffer = buf
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = q
    const g = c.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.master)
    src.start(t)
  }

  step() {
    this.noise(0.05, 0.05, 900, 2)
  }
  pick() {
    this.tone(320, 0.08, 'square', 0.08, 640)
  }
  drop() {
    this.noise(0.18, 0.25, 220, 1)
    this.tone(90, 0.15, 'sine', 0.2, 50)
  }
  stow() {
    this.tone(140, 0.06, 'square', 0.12)
    this.noise(0.08, 0.2, 2400, 3, 0.05)
    this.tone(660, 0.12, 'triangle', 0.08, undefined, 0.1)
  }
  climb() {
    this.tone(500, 0.03, 'square', 0.04)
  }
  accept() {
    this.tone(220, 0.12, 'sawtooth', 0.08, 440)
    this.tone(440, 0.25, 'square', 0.06, 880, 0.12)
    this.noise(0.8, 0.12, 300, 0.5, 0.1)
  }
  surge() {
    this.noise(0.6, 0.5, 400, 0.4)
    this.tone(80, 0.6, 'sawtooth', 0.25, 30)
    this.tone(1800, 0.2, 'square', 0.05, 200, 0.05)
  }
  hit() {
    this.noise(0.12, 0.15, 500, 1)
  }
  miss() {
    this.tone(140, 0.25, 'square', 0.12, 90)
  }
  repaired() {
    ;[523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'square', 0.07, undefined, i * 0.07))
  }
  open() {
    this.tone(880, 0.05, 'square', 0.05)
    this.tone(1320, 0.05, 'square', 0.05, undefined, 0.05)
  }
  scan(echo: boolean) {
    if (echo) this.tone(480, 0.22, 'sine', 0.095, 290)
    this.tone(300, 0.64, 'sawtooth', 0.05, 1200, echo ? 0.22 : 0)
  }
  clear() {
    this.tone(880, 0.1, 'triangle', 0.1)
    this.tone(1175, 0.18, 'triangle', 0.1, undefined, 0.09)
  }
  busted() {
    for (let i = 0; i < 4; i++) {
      this.tone(960, 0.18, 'square', 0.09, undefined, i * 0.4)
      this.tone(640, 0.18, 'square', 0.09, undefined, i * 0.4 + 0.2)
    }
  }
  boom() {
    this.noise(1.8, 0.8, 120, 0.3)
    this.tone(45, 1.6, 'sine', 0.5, 20)
  }
  stamp() {
    this.noise(0.12, 0.5, 300, 0.8)
  }
  impact() {
    this.noise(0.5, 0.7, 160, 0.4)
    this.tone(70, 0.4, 'square', 0.2, 35)
    this.tone(2400, 0.15, 'triangle', 0.05, 900, 0.05)
  }
  rivet(n: number) {
    this.noise(0.04, 0.3, 3500, 3)
    this.tone(520 + n * 110, 0.08, 'square', 0.07)
  }
  echo() {
    this.tone(900, 0.5, 'sine', 0.15, 120)
    this.tone(300, 0.5, 'sawtooth', 0.06, 1200)
    this.noise(0.3, 0.2, 700, 2)
  }
  delivered() {
    ;[392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.09, undefined, i * 0.1))
  }

  /** Continuous cues, called once per frame. */
  update(now: number, s: { alarm: boolean; breach: boolean; exposure: number; engine: number }) {
    const c = this.ctx
    if (!c || !this.master) return
    if (!this.hum) {
      const osc = c.createOscillator(),
        gain = c.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = 46
      const f = c.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 180
      gain.gain.value = 0
      osc.connect(f).connect(gain).connect(this.master)
      osc.start()
      this.hum = { osc, gain }
    }
    this.hum.gain.gain.setTargetAtTime(0.05 * s.engine, c.currentTime, 0.3)
    this.hum.osc.frequency.setTargetAtTime(40 + s.engine * 10, c.currentTime, 0.5)
    if (s.alarm && now >= this.alarmNext) {
      this.alarmNext = now + 900
      this.tone(620, 0.32, 'square', 0.045, 440)
    }
    if (s.breach && now >= this.hissNext) {
      this.hissNext = now + 1100
      this.noise(1.0, 0.06, 5200, 0.6)
    }
    if (s.exposure > 60 && now >= this.chirpNext) {
      const k = (s.exposure - 60) / 40
      this.chirpNext = now + 900 - k * 650
      this.tone(380 + k * 300, 0.07, 'triangle', 0.05, 260)
    }

  }
}

export const sfx = new Sfx()
