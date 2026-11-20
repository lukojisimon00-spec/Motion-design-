// Liste des scènes (avec durée modifiable) et ajout rapide d'actions à la position actuelle.

import { $, el, toast, fmt } from "./dom.js";

const VALUELESS = { jump: "hauteur 220", squash: "rebond", shake: "acteur", cameraShake: "caméra" };

export function setupScenePanel({ engine, library }) {
  const list = $("#scene-list"), actions = $("#action-list");
  const type = $("#qa-type"), value = $("#qa-value"), add = $("#qa-add");
  let currentIndex = -1;

  function renderList() {
    const ep = engine.episode;
    list.replaceChildren();
    if (!ep) return;
    ep.scenes.forEach((s, i) => {
      const dur = el("input", { type: "number", min: "0.5", step: "0.5", value: String(s.duration), title: "Durée (s)" });
      dur.onchange = () => {
        const v = Math.max(0.5, Number(dur.value) || s.duration);
        s.duration = v;
        s.data.duration = v;
        ep.recompute();
        engine.seek(Math.min(engine.time, ep.duration));
        renderList();
      };
      const li = el("li", { class: i === currentIndex ? "current" : "" }, [
        el("button", { onclick: () => engine.seek(ep.starts[i] + 0.001), title: "Aller à la scène" }, "▶"),
        el("span", { class: "grow" }, `${i + 1}. ${s.title}`),
        dur,
        el("span", { class: "label" }, "s"),
      ]);
      list.append(li);
    });
  }

  function currentScene() {
    return engine.episode?.locate(engine.time);
  }

  function actorCharacter() {
    const loc = currentScene();
    const a = loc?.scene.data.actors?.[0];
    return a ? library.characters.get(a.character) : null;
  }

  function fillValues() {
    const ch = actorCharacter();
    let opts = [];
    if (type.value === "expression") opts = ch ? [...ch.expressions.keys()] : [];
    else if (type.value === "pose") opts = ch ? [...ch.poses.keys()] : [];
    else if (type.value === "face") opts = ["right", "left"];
    else opts = [VALUELESS[type.value]];
    value.replaceChildren(...opts.sort().map((o) => el("option", { value: o }, o)));
    value.disabled = !!VALUELESS[type.value];
  }

  function renderActions() {
    const loc = currentScene();
    actions.replaceChildren();
    if (!loc) return;
    loc.scene.actions.forEach((a) => {
      const desc = `${fmt(a.at || 0)} s · ${a.type}${a.value ? " → " + a.value : ""}${a.duration ? ` (${a.duration} s)` : ""}`;
      actions.append(
        el("li", {}, [
          el("span", { class: "grow" }, desc),
          el("button", {
            title: "Supprimer",
            onclick: () => {
              loc.scene.removeAction(a);
              engine.draw();
              renderActions();
            },
          }, "✕"),
        ]),
      );
    });
  }

  add.onclick = () => {
    const loc = currentScene();
    if (!loc) return;
    const at = Math.round(loc.local * 10) / 10;
    const target = loc.scene.data.actors?.[0]?.id;
    const t = type.value;
    const action = { at, type: t, target };
    if (t === "expression" || t === "pose" || t === "face") action.value = value.value;
    if (t === "jump") Object.assign(action, { height: 220, duration: 0.7 });
    if (t === "squash") Object.assign(action, { amount: 0.12, duration: 0.3 });
    if (t === "shake") Object.assign(action, { amount: 14, duration: 0.5 });
    if (t === "cameraShake") Object.assign(action, { amount: 18, duration: 0.5 });
    loc.scene.addAction(action);
    engine.draw();
    renderActions();
    toast(`${t} ajouté à ${fmt(at)} s (scène ${loc.index + 1})`);
  };
  type.onchange = fillValues;

  engine.on("time", ({ loc }) => {
    const i = loc ? loc.index : -1;
    if (i !== currentIndex) {
      currentIndex = i;
      renderList();
      renderActions();
      fillValues();
    }
  });

  return {
    refresh() {
      currentIndex = -1;
      engine.draw();
    },
  };
}
