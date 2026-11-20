// Bibliothèque d'assets : décors, personnages, sons. Construite depuis config/assets.json
// et complétée par les fichiers importés depuis l'appareil.

import { joinPath, loadImage, loadJSON } from "./AssetLoader.js";
import { Character } from "../characters/Character.js";

export class AssetLibrary {
  constructor(audio) {
    this.audio = audio;
    this.base = "";
    this.backgrounds = new Map(); // id -> { img|null, color }
    this.characters = new Map();
    this.sounds = new Map(); // id -> { src, ok }
    this.log = []; // { level, message }
    this.listeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
  }
  _emit() {
    this.listeners.forEach((fn) => fn(this));
  }

  get report() {
    const push = (level) => (message) => this.log.push({ level, message });
    return { ok: push("ok"), warn: push("warn"), error: push("error") };
  }

  async loadConfig(url) {
    const r = await loadJSON(url);
    if (!r.ok) {
      this.report.error(`configuration — ${r.error}`);
      this._emit();
      return false;
    }
    const cfg = r.value;
    const configDir = url.includes("/") ? url.slice(0, url.lastIndexOf("/") + 1) : "";
    // basePath est relatif à la page (index.html), pas au fichier de config
    this.base = cfg.basePath ?? configDir;
    const report = this.report;
    const jobs = [];

    for (const [id, b] of Object.entries(cfg.backgrounds || {})) {
      const entry = { img: null, color: b.color || "#000000" };
      this.backgrounds.set(id, entry);
      if (b.src) {
        jobs.push(loadImage(joinPath(this.base, b.src)).then((res) => {
          if (res.ok) {
            entry.img = res.value;
            report.ok(`décor ${id}`);
          } else report.error(`décor ${id} — ${res.error}`);
        }));
      }
    }
    for (const [id, c] of Object.entries(cfg.characters || {})) {
      const ch = new Character(id, c);
      this.characters.set(id, ch);
      jobs.push(ch.load(this.base, report));
    }
    for (const [id, s] of Object.entries(cfg.sounds || {})) {
      const src = joinPath(this.base, s.src);
      this.sounds.set(id, { src, ok: false });
      jobs.push(this.audio.loadUrl(id, src).then((res) => {
        this.sounds.get(id).ok = res.ok;
        if (res.ok) report.ok(`son ${id}`);
        else report.error(`son ${id} — ${res.error}`);
      }));
    }
    await Promise.all(jobs);
    this._emit();
    return true;
  }

  // --- imports depuis l'appareil (galerie, fichiers Android) ---

  async importImage(file, kind, id, characterId = "kimo") {
    const url = URL.createObjectURL(file);
    const res = await loadImage(url);
    if (!res.ok) {
      this.report.error(`import ${file.name} — ${res.error}`);
      this._emit();
      return false;
    }
    const img = res.value;
    if (kind === "background") {
      this.backgrounds.set(id, { img, color: "#000000" });
    } else {
      const ch = this.characters.get(characterId);
      if (!ch) {
        this.report.error(`import ${file.name} — personnage inconnu : ${characterId}`);
        this._emit();
        return false;
      }
      // Image d'une taille quelconque : on la ramène à la hauteur de référence du personnage.
      if (kind === "pose") ch.addPose(id, img, { anchor: [0.5, 1], scale: ch.heightRef / img.naturalHeight });
      else ch.addExpression(id, img);
    }
    this.report.ok(`import ${kind} ${id} (${img.naturalWidth}×${img.naturalHeight})`);
    this._emit();
    return true;
  }

  async importSound(file, id) {
    const res = await this.audio.loadFile(id, file);
    if (res.ok) {
      this.sounds.set(id, { src: file.name, ok: true });
      this.report.ok(`import son ${id}`);
    } else this.report.error(`import son ${file.name} — ${res.error}`);
    this._emit();
    return res.ok;
  }

  counts() {
    const c = { ok: 0, warn: 0, error: 0 };
    this.log.forEach((l) => c[l.level]++);
    return c;
  }
}
