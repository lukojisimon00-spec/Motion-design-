// Vérifications du moteur sans navigateur : node tools/verifier.mjs
// Contrôle la config, l'épisode et la logique de timeline (fonction pure du temps).
import { readFileSync, existsSync } from "node:fs";
import { Episode } from "../src/scenes/Episode.js";
import { ACTIONS } from "../src/motion/actions.js";

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("ÉCHEC  " + msg); } else console.log("ok     " + msg); };

const cfg = JSON.parse(readFileSync("config/assets.json", "utf8"));
const base = cfg.basePath || "";
const files = [];
for (const b of Object.values(cfg.backgrounds)) if (b.src) files.push(b.src);
for (const c of Object.values(cfg.characters)) {
  for (const p of Object.values(c.poses)) files.push(p.src);
  for (const e of Object.values(c.expressions)) files.push(e.src);
  for (const [n, cy] of Object.entries(c.cycles || {})) ok(cy.frames.every((f) => c.poses[f]), `cycle ${n} : toutes les poses existent`);
}
for (const s of Object.values(cfg.sounds)) files.push(s.src);
const missing = files.filter((f) => !existsSync(base + f));
ok(missing.length === 0, `${files.length} fichiers de la config présents${missing.length ? " — manquants : " + missing.join(", ") : ""}`);

const epFile = process.argv[2] || "episodes/demo/episode.json";
const data = JSON.parse(readFileSync(epFile, "utf8"));
const ep = new Episode(data);
ok(ep.scenes.length > 0, `${epFile} : ${ep.scenes.length} scènes, ${ep.duration.toFixed(1)} s`);
const warnings = new Set();
for (const s of ep.scenes) {
  for (const a of s.actions) {
    if (!ACTIONS[a.type]) warnings.add(`action inconnue ${a.type}`);
    for (const k of ["value", "pose", "thenPose"]) {
      const v = a[k];
      const isPose = k !== "value" || a.type === "pose";
      if (v && isPose && a.type !== "face" && !cfg.characters.kimo.poses[v]) warnings.add(`pose inconnue ${v} (scène ${s.id})`);
    }
    if (a.type === "expression" && !cfg.characters.kimo.expressions[a.value]) warnings.add(`expression inconnue ${a.value} (scène ${s.id})`);
  }
  for (const c of s.sounds) if (!cfg.sounds[c.sound]) warnings.add(`son inconnu ${c.sound}`);
  if (s.data.background && !cfg.backgrounds[s.data.background]) warnings.add(`décor inconnu ${s.data.background}`);
}
ok(warnings.size === 0, `références de l'épisode valides${warnings.size ? " — " + [...warnings].join(" ; ") : ""}`);

// Logique de timeline
const loc = ep.locate(ep.starts[1] + 0.01);
ok(loc.index === 1, "locate() trouve la 2e scène");
const s0 = ep.scenes[0];
const a = s0.evaluate(0).actors[0], b = s0.evaluate(1.5).actors[0], c = s0.evaluate(3.2).actors[0];
ok(a.x < b.x && b.x < c.x, `marche : x augmente (${a.x.toFixed(0)} → ${b.x.toFixed(0)} → ${c.x.toFixed(0)})`);
ok(b.cycle?.name === "marche" && !c.cycle, "cycle de marche actif pendant la marche seulement");
ok(Math.abs(c.x - 540) < 1, "arrivée exacte à x = 540");
ok(a.expression === "neutre" && c.expression === "sourire", "changement d'expression à 3 s");
const again = s0.evaluate(1.5).actors[0];
ok(JSON.stringify(again) === JSON.stringify(b), "évaluation déterministe (même t → même état)");
const cam = s0.evaluate(4.5).camera;
ok(Math.abs(cam.zoom - 1.12) < 1e-6, "zoom caméra atteint 1.12");
const v = ep.scenes[3];
const mid = v.evaluate(0.7).actors[0], end = v.evaluate(1.2).actors[0];
ok(mid.offsetY < -200 && mid.pose === "saut-victoire", "saut : en l'air avec la pose saut-victoire");
ok(end.offsetY === 0 && end.pose === "celebration", "saut : retour au sol puis pose celebration");
ok(ep.audioCues().length > 5, `${ep.audioCues().length} sons planifiés`);

console.log(fails ? `\n${fails} échec(s)` : "\nTout est bon.");
process.exit(fails ? 1 : 0);
