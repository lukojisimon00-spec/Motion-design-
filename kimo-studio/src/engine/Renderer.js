// Rendu Canvas 2D. Le monde fait toujours 1080×1920 ; seule la résolution du canvas change
// (aperçu léger sur téléphone, 1080p pour l'export).

export const WORLD_W = 1080;
export const WORLD_H = 1920;

// Garde le cadre de la caméra à l'intérieur du décor (pas de bord vide quand on zoome)
function clampCamera(c) {
  const hw = WORLD_W / 2 / c.zoom, hh = WORLD_H / 2 / c.zoom;
  const fit = (v, half, size) => (half * 2 >= size ? size / 2 : Math.min(size - half, Math.max(half, v)));
  return [fit(c.x + c.offsetX, hw, WORLD_W), fit(c.y + c.offsetY, hh, WORLD_H)];
}

export class Renderer {
  constructor(canvas, library) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.lib = library;
    this.showGuides = false;
    this.setQuality(0.5);
  }

  setQuality(q) {
    this.quality = q;
    this.canvas.width = Math.round(WORLD_W * q);
    this.canvas.height = Math.round(WORLD_H * q);
  }

  render(state, time) {
    const { ctx } = this;
    const q = this.quality;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (!state) {
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    const bg = state.background ? this.lib.backgrounds.get(state.background) : null;
    ctx.fillStyle = bg?.color || "#f6f6f3";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Caméra : zoom et rotation autour du point visé
    const c = state.camera;
    ctx.setTransform(q, 0, 0, q, 0, 0);
    ctx.translate(WORLD_W / 2, WORLD_H / 2);
    ctx.rotate((c.rotation * Math.PI) / 180);
    ctx.scale(c.zoom, c.zoom);
    const [cx, cy] = c.clamp === false ? [c.x + c.offsetX, c.y + c.offsetY] : clampCamera(c);
    ctx.translate(-cx, -cy);

    if (bg?.img) this.drawCover(bg.img);

    const actors = [...state.actors].sort((a, b) => a.z - b.z || a.y - b.y);
    for (const a of actors) this.drawActor(a, time);

    ctx.setTransform(q, 0, 0, q, 0, 0);
    if (this.showGuides) this.drawGuides(state);
  }

  drawCover(img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.max(WORLD_W / iw, WORLD_H / ih);
    const w = iw * s, h = ih * s;
    this.ctx.drawImage(img, (WORLD_W - w) / 2, (WORLD_H - h) / 2, w, h);
  }

  drawActor(a, time) {
    if (a.alpha <= 0) return;
    const { ctx } = this;
    const ch = this.lib.characters.get(a.character);
    const frame = ch?.resolveFrame(a);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a.alpha);
    const bob = ch ? ch.cycleBob(a) : 0;
    ctx.translate(a.x + a.offsetX, a.y + a.offsetY + bob);
    ctx.rotate((a.rotation * Math.PI) / 180);

    if (!frame?.pose) {
      this.drawMissing(a, ch ? `pose « ${a.pose} » absente` : `personnage « ${a.character} » absent`);
      ctx.restore();
      return;
    }
    const p = frame.pose;
    const s = (a.height / ch.heightRef) * p.scale;
    // respiration légère à l'arrêt, ancrée aux pieds
    const breathe = a.idle && !a.cycle ? 1 + 0.008 * Math.sin((time * Math.PI * 2) / 2.6) : 1;
    ctx.scale(a.facing * ch.facing * a.scaleX * s, a.scaleY * s * breathe);

    const ox = -p.anchor[0] * p.w;
    const oy = -p.anchor[1] * p.h;
    ctx.drawImage(p.img, ox, oy, p.w, p.h);

    // Expression : la tête de l'expression est posée sur la tête de la pose
    if (a.expression && p.head && ch.expressionHead) {
      const e = ch.expressions.get(a.expression);
      if (e) {
        const eh = e.head || ch.expressionHead;
        const k = p.head.scale ?? 1;
        const clip = Math.min(eh.clipBottom ?? e.h, e.h);
        ctx.drawImage(e.img, 0, 0, e.w, clip, ox + p.head.x - eh.x * k, oy + p.head.y - eh.y * k, e.w * k, clip * k);
      }
    }
    ctx.restore();
  }

  drawMissing(a, label) {
    const { ctx } = this;
    const h = a.height, w = h * 0.4;
    ctx.fillStyle = "rgba(255,0,128,0.35)";
    ctx.strokeStyle = "#ff0080";
    ctx.lineWidth = 6;
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeRect(-w / 2, -h, w, h);
    ctx.fillStyle = "#000";
    ctx.font = "bold 34px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, -h / 2, w * 2);
  }

  // Zones masquées par l'interface TikTok / Shorts / Reels (valeurs indicatives)
  drawGuides(state) {
    const { ctx } = this;
    ctx.save();
    ctx.setLineDash([18, 12]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,90,0,0.9)";
    ctx.strokeRect(60, 250, WORLD_W - 60 - 160, WORLD_H - 250 - 420);
    ctx.fillStyle = "rgba(255,90,0,0.12)";
    ctx.fillRect(0, WORLD_H - 420, WORLD_W, 420);
    ctx.fillRect(WORLD_W - 160, 250, 160, WORLD_H - 670);
    ctx.setLineDash([]);
    const c = state.camera;
    for (const a of state.actors) {
      // repère des pieds (position x,y de l'acteur), en coordonnées écran
      const [cx, cy] = c.clamp === false ? [c.x, c.y] : clampCamera(c);
      const sx = (a.x - cx) * c.zoom + WORLD_W / 2;
      const sy = (a.y - cy) * c.zoom + WORLD_H / 2;
      ctx.strokeStyle = "#00a2ff";
      ctx.beginPath();
      ctx.moveTo(sx - 30, sy);
      ctx.lineTo(sx + 30, sy);
      ctx.moveTo(sx, sy - 30);
      ctx.lineTo(sx, sy + 30);
      ctx.stroke();
      ctx.fillStyle = "#00a2ff";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillText(`${a.id} · ${a.cycle ? a.cycle.name : a.pose} · ${a.expression || "—"}`, sx + 36, sy - 10);
    }
    ctx.restore();
  }
}
