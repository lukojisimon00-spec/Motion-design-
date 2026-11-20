// Sons disponibles : écoute, import depuis l'appareil, ajout dans la scène à la position actuelle.

import { $, el, toast, slug, fmt } from "./dom.js";

export function setupAudioPanel({ engine, library, audio }) {
  const list = $("#sound-list");

  function render() {
    list.replaceChildren(
      ...[...library.sounds.entries()].map(([id, s]) =>
        el("li", { class: s.ok ? "" : "error" }, [
          el("span", { class: "grow" }, `${id}${s.ok ? ` · ${fmt(audio.duration(id))} s` : " · non chargé"}`),
          el("button", { disabled: !s.ok, onclick: () => audio.preview(id), title: "Écouter" }, "▶"),
          el("button", { disabled: !s.ok, onclick: () => addToScene(id), title: "Ajouter à la scène" }, "+ scène"),
        ]),
      ),
    );
  }

  function addToScene(id) {
    const loc = engine.episode?.locate(engine.time);
    if (!loc) return;
    const at = Math.round(loc.local * 10) / 10;
    loc.scene.sounds.push({ at, sound: id, volume: 1 });
    if (engine.playing) engine.seek(engine.time); // re-planifie les sons
    toast(`« ${id} » ajouté à ${fmt(at)} s (scène ${loc.index + 1})`);
  }

  $("#snd-file").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ok = await library.importSound(f, slug(f.name));
    toast(ok ? `Son « ${slug(f.name)} » importé` : "Ce fichier audio n'a pas pu être décodé.", !ok);
    e.target.value = "";
  };

  library.onChange(render);
  render();
}
