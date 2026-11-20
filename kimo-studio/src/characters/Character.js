// Définition d'un personnage : ses poses, expressions et cycles, chargés depuis la config.
// Un personnage est réutilisable : plusieurs acteurs d'une scène peuvent pointer vers la même définition.

import { joinPath, loadImage, cropImage } from "../assets/AssetLoader.js";

export class Character {
  constructor(id, cfg) {
    this.id = id;
    this.name = cfg.name || id;
    this.heightRef = cfg.heightRef || 400; // hauteur en px source d'une pose debout
    this.facing = cfg.facing === "left" ? -1 : 1; // sens dans lequel regardent les images source
    this.defaultPose = cfg.defaultPose;
    this.expressionHead = cfg.expressionHead || null;
    this.cycles = cfg.cycles || {};
    this.cfg = cfg;
    this.poses = new Map(); // nom -> { img, w, h, anchor, head, scale }
    this.expressions = new Map(); // nom -> { img, w, h }
  }

  async load(base, report) {
    const jobs = [];
    for (const [name, p] of Object.entries(this.cfg.poses || {})) {
      jobs.push(this._loadImageEntry(base, p, report, `pose ${this.id}/${name}`).then((img) => {
        if (img) this.addPose(name, img, p);
      }));
    }
    for (const [name, e] of Object.entries(this.cfg.expressions || {})) {
      jobs.push(this._loadImageEntry(base, e, report, `expression ${this.id}/${name}`).then((img) => {
        if (img) this.addExpression(name, img, e);
      }));
    }
    await Promise.all(jobs);
    for (const [name, c] of Object.entries(this.cycles)) {
      const missing = (c.frames || []).filter((f) => !this.poses.has(f));
      if (missing.length) report.warn(`cycle ${this.id}/${name} : poses absentes ${missing.join(", ")}`);
    }
  }

  async _loadImageEntry(base, entry, report, label) {
    const url = joinPath(base, entry.src);
    const r = await loadImage(url);
    if (!r.ok) {
      report.error(`${label} — ${r.error}`);
      return null;
    }
    report.ok(label);
    return entry.rect ? cropImage(r.value, entry.rect) : r.value;
  }

  addPose(name, img, p = {}) {
    this.poses.set(name, {
      img,
      w: img.naturalWidth || img.width,
      h: img.naturalHeight || img.height,
      anchor: p.anchor || [0.5, 1],
      head: p.head || null,
      scale: p.scale || 1,
    });
  }

  addExpression(name, img, e = {}) {
    this.expressions.set(name, { img, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height, head: e.head || null });
  }

  // Pose à afficher : celle du cycle en cours (marche...) sinon la pose fixe.
  resolveFrame(actor) {
    if (actor.cycle) {
      const c = this.cycles[actor.cycle.name];
      if (c && c.frames && c.frames.length) {
        const i = Math.floor(actor.cycle.time * (c.fps || 4)) % c.frames.length;
        const p = this.poses.get(c.frames[i]);
        if (p) return { pose: p, poseName: c.frames[i] };
      }
    }
    const name = this.poses.has(actor.pose) ? actor.pose : this.defaultPose;
    return { pose: this.poses.get(name) || null, poseName: actor.pose };
  }

  cycleBob(actor) {
    if (!actor.cycle) return 0;
    const c = this.cycles[actor.cycle.name];
    if (!c || !c.bob) return 0;
    const fps = c.fps || 4;
    return -Math.abs(Math.sin(Math.PI * actor.cycle.time * fps)) * c.bob;
  }
}
