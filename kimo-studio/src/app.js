// Point d'entrée : assemble bibliothèque d'assets, moteur, rendu, audio et interface.

import { AssetLibrary } from "./assets/AssetLibrary.js";
import { loadJSON } from "./assets/AssetLoader.js";
import { AudioEngine } from "./audio/AudioEngine.js";
import { Engine } from "./engine/Engine.js";
import { Renderer } from "./engine/Renderer.js";
import { Episode } from "./scenes/Episode.js";
import { recordingSupport } from "./export/Recorder.js";
import { setupTransport } from "./ui/Transport.js";
import { setupScenePanel } from "./ui/ScenePanel.js";
import { setupAssetPanel } from "./ui/AssetPanel.js";
import { setupAudioPanel } from "./ui/AudioPanel.js";
import { $, toast, store } from "./ui/dom.js";

// Chemins configurables : ?config=…&episode=… dans l'adresse
const params = new URLSearchParams(location.search);
const CONFIG_URL = params.get("config") || "config/assets.json";
const EPISODE_URL = params.get("episode") || "episodes/demo/episode.json";

const settings = {
  previewQuality: store.get("previewQuality", 0.5),
  exportQuality: store.get("exportQuality", 0.6667),
};

async function main() {
  const canvas = $("#scene");
  const audio = new AudioEngine();
  const library = new AssetLibrary(audio);
  const renderer = new Renderer(canvas, library);
  renderer.setQuality(settings.previewQuality);
  const engine = new Engine({ renderer, audio });
  window.kimo = { engine, library, renderer, audio }; // accès console pour le débogage

  setupTabs();
  setupTransport({ engine, renderer, audio, settings });
  const scenes = setupScenePanel({ engine, library });
  const refreshTitle = () => ($("#episode-title").textContent = engine.episode?.title || "");
  setupAssetPanel({ engine, library, onEpisode: () => (refreshTitle(), scenes.refresh()) });
  setupAudioPanel({ engine, library, audio });
  setupSettings({ engine, renderer });
  engine.draw();

  await library.loadConfig(CONFIG_URL);
  const ep = await loadJSON(EPISODE_URL);
  if (ep.ok) engine.setEpisode(new Episode(ep.value));
  else {
    library.report.error(`épisode — ${ep.error}`);
    toast("Épisode introuvable : ouvre un fichier .json dans l'onglet Assets.", true);
  }
  refreshTitle();
  scenes.refresh();
  const c = library.counts();
  if (c.error) toast(`${c.error} asset(s) en erreur — voir l'onglet Assets`, true);
}

function setupTabs() {
  document.querySelectorAll(".tabs button").forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
      document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${b.dataset.tab}`));
    };
  });
}

function setupSettings({ engine, renderer }) {
  const prev = $("#set-preview"), exp = $("#set-export"), guides = $("#set-guides"), loop = $("#set-loop");
  prev.value = String(settings.previewQuality);
  exp.value = String(settings.exportQuality);
  guides.checked = renderer.showGuides = store.get("guides", false);
  loop.checked = engine.loop = store.get("loop", false);
  prev.onchange = () => {
    settings.previewQuality = Number(prev.value);
    store.set("previewQuality", settings.previewQuality);
    renderer.setQuality(settings.previewQuality);
    engine.draw();
  };
  exp.onchange = () => {
    settings.exportQuality = Number(exp.value);
    store.set("exportQuality", settings.exportQuality);
  };
  guides.onchange = () => {
    renderer.showGuides = guides.checked;
    store.set("guides", guides.checked);
    engine.draw();
  };
  loop.onchange = () => {
    engine.loop = loop.checked;
    store.set("loop", loop.checked);
  };
  const sup = recordingSupport(renderer.canvas);
  $("#support").textContent = sup.ok
    ? `Enregistrement disponible : ${sup.mime}`
    : `Enregistrement indisponible : ${sup.reason}`;
}

main().catch((e) => {
  console.error(e);
  toast(`Erreur au démarrage : ${e.message}`, true);
});
