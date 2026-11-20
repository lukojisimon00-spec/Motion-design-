// Un épisode = une suite de scènes avec leurs durées, plus une musique facultative.
// Il convertit le temps global en (scène, temps local) et liste les sons à jouer.

import { Scene } from "./Scene.js";

export class Episode {
  constructor(data) {
    this.data = data;
    this.title = data.title || "Sans titre";
    this.music = data.music || null;
    this.scenes = (data.scenes || []).map((s, i) => new Scene(s, i));
    this.recompute();
  }

  recompute() {
    let t = 0;
    this.starts = this.scenes.map((s) => {
      const start = t;
      t += s.duration;
      return start;
    });
    this.duration = t;
  }

  // Scène active à l'instant t (secondes depuis le début de l'épisode)
  locate(t) {
    if (!this.scenes.length) return null;
    const time = Math.max(0, Math.min(t, this.duration - 1e-6));
    let i = this.scenes.length - 1;
    while (i > 0 && this.starts[i] > time) i--;
    return { index: i, scene: this.scenes[i], local: time - this.starts[i] };
  }

  // Tous les sons de l'épisode en temps global : [{ start, sound, volume, loop, until }]
  audioCues() {
    const cues = [];
    if (this.music?.sound) {
      cues.push({ start: 0, sound: this.music.sound, volume: this.music.volume ?? 0.4, loop: true, until: this.duration });
    }
    this.scenes.forEach((s, i) => {
      for (const c of s.sounds) {
        cues.push({ start: this.starts[i] + (c.at || 0), sound: c.sound, volume: c.volume ?? 1, loop: false, until: null });
      }
    });
    return cues;
  }

  toJSON() {
    return { ...this.data, scenes: this.scenes.map((s) => s.toJSON()) };
  }
}
