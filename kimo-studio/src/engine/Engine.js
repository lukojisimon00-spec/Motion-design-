// Moteur : horloge, lecture/pause/reset, déplacement dans la timeline, son synchronisé.

export class Engine {
  constructor({ renderer, audio }) {
    this.renderer = renderer;
    this.audio = audio;
    this.episode = null;
    this.time = 0;
    this.playing = false;
    this.loop = false;
    this.listeners = { time: new Set(), end: new Set(), warn: new Set() };
    this._warned = new Set();
    this._last = 0;
    this._raf = 0;
    this._frame = this._frame.bind(this);
    // Android met les onglets en arrière-plan en pause : on coupe proprement le son
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.playing) this.pause();
    });
  }

  on(evt, fn) {
    this.listeners[evt].add(fn);
  }
  _emit(evt, arg) {
    this.listeners[evt].forEach((fn) => fn(arg));
  }
  warn(msg) {
    if (this._warned.has(msg)) return;
    this._warned.add(msg);
    this._emit("warn", msg);
  }

  setEpisode(ep) {
    this.pause();
    this.episode = ep;
    this._warned.clear();
    this.seek(0);
  }

  get duration() {
    return this.episode?.duration || 0;
  }

  async play() {
    if (!this.episode || this.playing) return;
    await this.audio.unlock();
    if (this.time >= this.duration - 1e-3) this.time = 0;
    this.playing = true;
    this.audio.playCues(this.episode.audioCues(), this.time, (id) => this.warn(`son « ${id} » non chargé`));
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._frame);
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this._raf);
    this.audio.stopAll();
    this.draw();
  }

  reset() {
    const was = this.playing;
    this.pause();
    this.seek(0);
    if (was) this.play();
  }

  seek(t) {
    this.time = Math.max(0, Math.min(t, this.duration));
    if (this.playing) this.audio.playCues(this.episode.audioCues(), this.time, (id) => this.warn(`son « ${id} » non chargé`));
    this.draw();
  }

  _frame(now) {
    if (!this.playing) return;
    // dt plafonné : un ralentissement ne fait pas sauter l'animation de plusieurs secondes
    const dt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    this.time += dt;
    if (this.time >= this.duration) {
      if (this.loop) {
        this.time = 0;
        this.audio.playCues(this.episode.audioCues(), 0);
      } else {
        this.time = this.duration;
        this.draw();
        this.playing = false;
        this.audio.stopAll();
        this._emit("end");
        return;
      }
    }
    this.draw();
    this._raf = requestAnimationFrame(this._frame);
  }

  stateAt(t) {
    const loc = this.episode?.locate(t);
    if (!loc) return { loc: null, state: null };
    return { loc, state: loc.scene.evaluate(loc.local, (m) => this.warn(m)) };
  }

  draw() {
    const { loc, state } = this.stateAt(this.time);
    this.renderer.render(state, this.time);
    this._emit("time", { time: this.time, loc });
  }
}
