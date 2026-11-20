// Sons via Web Audio API : chargement, lecture calée sur la timeline, sortie vers l'enregistreur.
// Android/Chrome n'autorise le son qu'après un geste de l'utilisateur : unlock() est appelé
// par les boutons Play et Enregistrer.

export class AudioEngine {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.supported = !!AC;
    this.ctx = AC ? new AC() : null;
    this.buffers = new Map();
    this.active = [];
    this.recordDest = null;
    if (this.ctx) {
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
  }

  async unlock() {
    if (this.ctx && this.ctx.state !== "running") {
      try {
        await this.ctx.resume();
      } catch {
        /* sera retenté au prochain geste */
      }
    }
  }

  _decode(arrayBuffer) {
    // forme à callback pour les anciens WebView
    return new Promise((resolve, reject) => {
      const p = this.ctx.decodeAudioData(arrayBuffer, resolve, reject);
      if (p && p.then) p.then(resolve, reject);
    });
  }

  async loadUrl(id, url) {
    if (!this.ctx) return { ok: false, error: "Web Audio non supporté" };
    try {
      const res = await fetch(url);
      if (!res.ok) return { ok: false, error: `${res.status} : ${url}` };
      this.buffers.set(id, await this._decode(await res.arrayBuffer()));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: `${e?.message || "format non décodable"} : ${url}` };
    }
  }

  async loadFile(id, file) {
    if (!this.ctx) return { ok: false, error: "Web Audio non supporté" };
    try {
      this.buffers.set(id, await this._decode(await file.arrayBuffer()));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "format non décodable" };
    }
  }

  duration(id) {
    return this.buffers.get(id)?.duration ?? 0;
  }

  // Lance tous les sons de la liste à partir du temps global `from`.
  playCues(cues, from, onMissing = () => {}) {
    this.stopAll();
    if (!this.ctx) return;
    const now = this.ctx.currentTime + 0.03;
    for (const c of cues) {
      const buf = this.buffers.get(c.sound);
      if (!buf) {
        onMissing(c.sound);
        continue;
      }
      const end = c.loop ? c.until : c.start + buf.duration;
      if (end <= from) continue;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = !!c.loop;
      const g = this.ctx.createGain();
      g.gain.value = c.volume ?? 1;
      src.connect(g).connect(this.master);
      const delay = Math.max(0, c.start - from);
      const offset = Math.max(0, from - c.start);
      src.start(now + delay, c.loop ? offset % buf.duration : offset);
      if (c.loop) src.stop(now + delay + (c.until - Math.max(from, c.start)));
      this.active.push(src);
    }
  }

  preview(id) {
    this.unlock();
    this.playCues([{ start: 0, sound: id, volume: 1 }], 0);
  }

  stopAll() {
    for (const s of this.active) {
      try {
        s.stop();
      } catch {
        /* déjà arrêté */
      }
    }
    this.active = [];
  }

  // Flux audio pour MediaRecorder (même mixage que les haut-parleurs)
  getRecordStream() {
    if (!this.ctx || !this.ctx.createMediaStreamDestination) return null;
    if (!this.recordDest) {
      this.recordDest = this.ctx.createMediaStreamDestination();
      this.master.connect(this.recordDest);
    }
    return this.recordDest.stream;
  }
}
