// État du chargement, import d'images depuis l'appareil, ouverture / export d'un épisode.

import { $, el, toast, slug, downloadBlob } from "./dom.js";
import { Episode } from "../scenes/Episode.js";

export function setupAssetPanel({ engine, library, onEpisode }) {
  const counts = $("#asset-counts"), log = $("#asset-log");

  function renderLog() {
    const c = library.counts();
    counts.textContent = `${c.ok} chargés · ${c.warn} avertissements · ${c.error} erreurs`;
    const order = { error: 0, warn: 1, ok: 2 };
    const items = [...library.log].sort((a, b) => order[a.level] - order[b.level]);
    log.replaceChildren(...items.map((l) => el("li", { class: l.level }, l.message)));
  }
  library.onChange(renderLog);
  engine.on("warn", (m) => {
    library.report.warn(m);
    renderLog();
  });
  renderLog();

  const kind = $("#imp-kind"), name = $("#imp-name"), file = $("#imp-file");
  file.onchange = () => {
    if (file.files[0] && !name.value) name.value = slug(file.files[0].name);
  };
  $("#imp-go").onclick = async () => {
    const f = file.files[0];
    if (!f) return toast("Choisis d'abord une image.", true);
    const id = slug(name.value || f.name);
    const ok = await library.importImage(f, kind.value, id);
    if (!ok) return toast("Import impossible, voir le journal.", true);
    if (kind.value === "background") {
      const loc = engine.episode?.locate(engine.time);
      if (loc) {
        loc.scene.data.background = id;
        toast(`Décor « ${id} » appliqué à la scène ${loc.index + 1}`);
      }
    } else toast(`${kind.value === "pose" ? "Pose" : "Expression"} « ${id} » ajoutée`);
    name.value = "";
    file.value = "";
    engine.draw();
    onEpisode?.();
  };

  $("#ep-file").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.scenes)) throw new Error("le fichier ne contient pas de liste « scenes »");
      engine.setEpisode(new Episode(data));
      onEpisode?.();
      toast(`Épisode « ${data.title || f.name} » chargé`);
    } catch (err) {
      toast(`Épisode illisible : ${err.message}`, true);
    }
    e.target.value = "";
  };

  $("#ep-export").onclick = () => {
    if (!engine.episode) return;
    const json = JSON.stringify(engine.episode.toJSON(), null, 2);
    downloadBlob(new Blob([json], { type: "application/json" }), `${slug(engine.episode.title)}.json`);
  };
}
