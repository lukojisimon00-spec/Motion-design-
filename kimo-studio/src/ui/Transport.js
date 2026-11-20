// Play / Pause / Reset / Enregistrer + barre de position.

import { $, toast, fmt, slug } from "./dom.js";
import { Recorder, recordingSupport } from "../export/Recorder.js";

export function setupTransport({ engine, renderer, audio, settings }) {
  const play = $("#btn-play"), pause = $("#btn-pause"), reset = $("#btn-reset"), rec = $("#btn-rec");
  const seek = $("#seek"), time = $("#time"), sceneName = $("#scene-name");
  const recorder = new Recorder(renderer.canvas);
  let seeking = false;

  play.onclick = () => engine.play();
  pause.onclick = () => engine.pause();
  reset.onclick = () => engine.reset();

  seek.addEventListener("input", () => {
    seeking = true;
    engine.seek(Number(seek.value));
  });
  seek.addEventListener("change", () => (seeking = false));

  engine.on("time", ({ time: t, loc }) => {
    seek.max = String(engine.duration || 1);
    if (!seeking) seek.value = String(t);
    time.textContent = `${fmt(t)} / ${fmt(engine.duration)} s`;
    sceneName.textContent = loc ? `${loc.index + 1}. ${loc.scene.title}` : "";
    play.disabled = engine.playing;
    pause.disabled = !engine.playing;
  });

  // --- Enregistrement ---
  const sup = recordingSupport(renderer.canvas);
  if (!sup.ok) {
    rec.disabled = true;
    rec.title = sup.reason;
  }

  async function startRecording() {
    try {
      engine.pause();
      renderer.setQuality(settings.exportQuality);
      engine.seek(0);
      await audio.unlock();
      recorder.start({ fps: 30, audioStream: audio.getRecordStream() });
    } catch (e) {
      renderer.setQuality(settings.previewQuality);
      engine.draw();
      toast(`Enregistrement impossible : ${e.message}`, true);
      return;
    }
    rec.classList.add("on");
    rec.textContent = "■ Stop";
    $("#rec-badge").hidden = false;
    [play, pause, reset, seek].forEach((b) => (b.disabled = true));
    await engine.play();
  }

  async function stopRecording() {
    engine.pause();
    const blob = await recorder.stop();
    renderer.setQuality(settings.previewQuality);
    engine.draw();
    rec.classList.remove("on");
    rec.textContent = "● Rec";
    $("#rec-badge").hidden = true;
    [reset, seek].forEach((b) => (b.disabled = false));
    play.disabled = false;
    if (!blob || !blob.size) {
      toast("Aucune image enregistrée.", true);
      return;
    }
    showExport(blob, recorder.mime, engine.episode?.title || "kimo");
  }

  rec.onclick = () => (recorder.recording ? stopRecording() : startRecording());
  engine.on("end", () => recorder.recording && stopRecording());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && recorder.recording) {
      stopRecording();
      toast("Enregistrement arrêté : l'onglet est passé en arrière-plan.", true);
    }
  });
}

function showExport(blob, mime, title) {
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  const url = URL.createObjectURL(blob);
  const dlg = $("#export-dialog");
  $("#export-video").src = url;
  const link = $("#export-link");
  link.href = url;
  link.download = `${slug(title)}.${ext}`;
  $("#export-info").textContent = `${(blob.size / 1e6).toFixed(1)} Mo · ${mime}`;
  $("#export-close").onclick = () => {
    dlg.close();
    $("#export-video").removeAttribute("src");
    URL.revokeObjectURL(url);
  };
  dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
}
