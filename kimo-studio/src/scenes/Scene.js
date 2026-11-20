// Une scène = un décor, des acteurs dans leur état initial, une liste d'actions datées,
// des sons datés et une durée. evaluate(t) renvoie l'état complet à l'instant t (secondes
// depuis le début de la scène).

import { ACTIONS } from "../motion/actions.js";
import { ease, clamp01 } from "../engine/easing.js";

const DEFAULT_CAMERA = { x: 540, y: 960, zoom: 1, rotation: 0 };

export class Scene {
  constructor(data, index) {
    this.data = data;
    this.id = data.id || `scene-${index + 1}`;
    this.title = data.title || this.id;
    this.duration = Math.max(0.1, Number(data.duration) || 3);
    this._seq = 0;
    this.actions = (data.actions || []).map((a) => ({ ...a, _i: this._seq++ }));
    this.sortActions();
    this.sounds = data.sounds || [];
  }

  sortActions() {
    this.actions.sort((a, b) => (a.at || 0) - (b.at || 0) || a._i - b._i);
  }

  addAction(action) {
    this.actions.push({ ...action, _i: this._seq++ });
    this.sortActions();
  }

  removeAction(action) {
    this.actions = this.actions.filter((a) => a !== action);
  }

  evaluate(t, warn = () => {}) {
    const d = this.data;
    const state = {
      background: d.background || null,
      camera: { ...DEFAULT_CAMERA, ...(d.camera || {}), offsetX: 0, offsetY: 0 },
      actors: (d.actors || []).map((a, i) => ({
        id: a.id || `acteur-${i + 1}`,
        character: a.character,
        x: a.x ?? 540,
        y: a.y ?? 1650,
        z: a.z ?? i,
        height: a.height ?? 900,
        pose: a.pose || null,
        expression: a.expression || null,
        facing: a.facing === "left" ? -1 : 1,
        rotation: a.rotation || 0,
        alpha: a.alpha ?? 1,
        scaleX: 1,
        scaleY: 1,
        offsetX: 0,
        offsetY: 0,
        idle: a.idle !== false,
        cycle: null,
      })),
    };
    const byId = new Map(state.actors.map((a) => [a.id, a]));

    for (const a of this.actions) {
      const at = a.at || 0;
      if (t < at) continue;
      const def = ACTIONS[a.type];
      if (!def) {
        warn(`action inconnue « ${a.type} » (scène ${this.id})`);
        continue;
      }
      let target;
      if (def.camera) target = state.camera;
      else if (def.scene) target = state;
      else {
        target = byId.get(a.target) || (a.target == null ? state.actors[0] : null);
        if (!target) {
          warn(`cible inconnue « ${a.target} » (scène ${this.id})`);
          continue;
        }
      }
      const dur = def.instant ? 0 : Math.max(0, a.duration ?? 1);
      const elapsed = t - at;
      const raw = dur > 0 ? clamp01(elapsed / dur) : 1;
      def.apply(target, ease(a.ease || def.ease || "inOut", raw), a, { elapsed, raw, state });

      // Options communes : pose / expression pendant l'action, puis après
      if (!def.camera && !def.scene) {
        if (raw < 1) {
          if (a.pose) target.pose = a.pose;
          if (a.expression) target.expression = a.expression;
        } else {
          if (a.thenPose) target.pose = a.thenPose;
          if (a.thenExpression) target.expression = a.thenExpression;
        }
      }
    }
    return state;
  }

  toJSON() {
    return { ...this.data, actions: this.actions.map(({ _i, ...a }) => a), sounds: this.sounds };
  }
}
