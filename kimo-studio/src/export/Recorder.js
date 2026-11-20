// Enregistrement WebM en temps réel : canvas.captureStream() + piste audio Web Audio → MediaRecorder.
// Limites : l'enregistrement dure autant que l'épisode, et si le téléphone ralentit,
// des images peuvent manquer. Un export image par image viendra en phase 2.

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
];

export function recordingSupport(canvas) {
  if (!canvas.captureStream) return { ok: false, reason: "canvas.captureStream() non disponible sur ce navigateur" };
  if (!window.MediaRecorder) return { ok: false, reason: "MediaRecorder non disponible sur ce navigateur" };
  const mime = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m));
  if (!mime) return { ok: false, reason: "aucun format vidéo enregistrable (WebM/MP4)" };
  return { ok: true, mime };
}

export class Recorder {
  constructor(canvas) {
    this.canvas = canvas;
    this.rec = null;
    this.chunks = [];
  }

  get recording() {
    return this.rec?.state === "recording";
  }

  start({ fps = 30, audioStream = null, bitrate = 8_000_000 } = {}) {
    const sup = recordingSupport(this.canvas);
    if (!sup.ok) throw new Error(sup.reason);
    const stream = this.canvas.captureStream(fps);
    if (audioStream) audioStream.getAudioTracks().forEach((t) => stream.addTrack(t));
    this.mime = sup.mime;
    this.chunks = [];
    this.rec = new MediaRecorder(stream, { mimeType: sup.mime, videoBitsPerSecond: bitrate });
    this.rec.ondataavailable = (e) => e.data?.size && this.chunks.push(e.data);
    this.rec.start(1000);
    this.stream = stream;
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.rec || this.rec.state === "inactive") return resolve(null);
      this.rec.onstop = () => {
        this.stream.getVideoTracks().forEach((t) => t.stop());
        resolve(new Blob(this.chunks, { type: this.mime.split(";")[0] }));
      };
      this.rec.stop();
    });
  }
}
