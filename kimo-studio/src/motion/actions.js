// Catalogue des mouvements. Chaque action modifie l'état de la scène à un instant donné.
// L'évaluation est une fonction pure du temps : on peut sauter à n'importe quelle seconde
// (Reset, liste de scènes, export image par image plus tard) et obtenir exactement la même image.
//
// apply(target, p, action, ctx)
//   target : l'acteur visé (ou la caméra pour les actions "camera*")
//   p      : progression adoucie 0 → 1
//   ctx    : { elapsed (s depuis le début de l'action), raw (progression non adoucie), state }
// Les valeurs de départ sont celles de la cible au moment où l'action s'applique.

import { lerp } from "../engine/easing.js";

const xy = (a) => (Array.isArray(a) ? a : [a?.x, a?.y]);

export const ACTIONS = {
  // Déplacement simple : { to:[x,y] } ou { by:[dx,dy] }
  move: {
    apply(t, p, a) {
      const [tx, ty] = target(t, a);
      t.x = lerp(t.x, tx, p);
      t.y = lerp(t.y, ty, p);
    },
  },

  // Marche : déplacement linéaire + cycle de poses + orientation automatique
  walk: {
    ease: "linear",
    apply(t, p, a, ctx) {
      const [tx, ty] = target(t, a);
      if (a.face !== false && tx !== t.x) t.facing = tx > t.x ? 1 : -1;
      t.x = lerp(t.x, tx, p);
      t.y = lerp(t.y, ty, p);
      if (ctx.raw < 1) t.cycle = { name: a.cycle || "marche", time: ctx.elapsed };
    },
  },

  // Saut : { height: 220 }
  jump: {
    ease: "linear",
    apply(t, p, a) {
      t.offsetY += -(a.height ?? 200) * 4 * p * (1 - p);
    },
  },

  // Écrasement / étirement (rebond cartoon) : { amount: 0.15 }
  squash: {
    ease: "linear",
    apply(t, p, a) {
      const k = Math.sin(Math.PI * p) * (a.amount ?? 0.15);
      t.scaleY *= 1 - k;
      t.scaleX *= 1 + k * 0.6;
    },
  },

  // Tremblement : { amount: 12, freq: 18 }
  shake: {
    ease: "linear",
    apply(t, p, a, ctx) {
      t.offsetX += Math.sin(ctx.elapsed * (a.freq ?? 18) * Math.PI * 2) * (a.amount ?? 12) * (1 - p);
    },
  },

  // Redimensionner : { height: 1100 } (hauteur à l'écran d'un personnage debout)
  scale: {
    apply(t, p, a) {
      t.height = lerp(t.height, a.height, p);
    },
  },

  rotate: {
    apply(t, p, a) {
      t.rotation = lerp(t.rotation, a.deg ?? 0, p);
    },
  },

  fade: {
    apply(t, p, a) {
      t.alpha = lerp(t.alpha, a.alpha ?? 0, p);
    },
  },

  // Changements instantanés
  pose: { instant: true, apply: (t, p, a) => void (t.pose = a.value) },
  expression: { instant: true, apply: (t, p, a) => void (t.expression = a.value) },
  face: { instant: true, apply: (t, p, a) => void (t.facing = a.value === "left" ? -1 : 1) },
  show: { instant: true, apply: (t) => void (t.alpha = 1) },
  hide: { instant: true, apply: (t) => void (t.alpha = 0) },

  // Caméra : { zoom, to:[x,y], rotation }
  camera: {
    camera: true,
    apply(c, p, a) {
      if (a.zoom != null) c.zoom = lerp(c.zoom, a.zoom, p);
      if (a.to) {
        const [x, y] = xy(a.to);
        c.x = lerp(c.x, x, p);
        c.y = lerp(c.y, y, p);
      }
      if (a.rotation != null) c.rotation = lerp(c.rotation, a.rotation, p);
    },
  },
  cameraShake: {
    camera: true,
    ease: "linear",
    apply(c, p, a, ctx) {
      const amp = (a.amount ?? 18) * (1 - p);
      const w = ctx.elapsed * (a.freq ?? 22) * Math.PI * 2;
      c.offsetX += Math.sin(w) * amp;
      c.offsetY += Math.cos(w * 1.3) * amp * 0.6;
    },
  },

  background: { scene: true, instant: true, apply: (s, p, a) => void (s.background = a.value) },
};

function target(t, a) {
  if (a.to) {
    const [x, y] = xy(a.to);
    return [x ?? t.x, y ?? t.y];
  }
  if (a.by) {
    const [dx, dy] = xy(a.by);
    return [t.x + (dx || 0), t.y + (dy || 0)];
  }
  return [t.x, t.y];
}

export function registerAction(name, def) {
  ACTIONS[name] = def;
}
