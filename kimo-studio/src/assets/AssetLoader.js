// Chargement des fichiers. Aucune fonction ne rejette : chaque chargement renvoie
// { ok, value, error } pour qu'une image manquante n'arrête pas tout le studio.

const TIMEOUT_MS = 20000;

export function joinPath(base, src) {
  if (!src) return src;
  if (/^(blob:|data:|https?:|\/)/.test(src)) return src;
  return (base || "") + src;
}

export function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve({ ok: false, error: `délai dépassé : ${url}` }), TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      // Firefox : un SVG sans width/height a une taille nulle
      if (!img.naturalWidth) resolve({ ok: false, error: `image vide (taille 0) : ${url}` });
      else resolve({ ok: true, value: img });
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve({ ok: false, error: `introuvable ou illisible : ${url}` });
    };
    img.decoding = "async";
    img.src = url;
  });
}

// Découpe une zone [x, y, w, h] d'une planche (sprite sheet) dans un canvas réutilisable par drawImage.
export function cropImage(img, rect) {
  const [x, y, w, h] = rect;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").drawImage(img, x, y, w, h, 0, 0, w, h);
  return c;
}

export async function loadJSON(url) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return { ok: false, error: `${res.status} ${res.statusText} : ${url}` };
    return { ok: true, value: await res.json() };
  } catch (e) {
    const hint = location.protocol === "file:" ? " (ouvre le studio via un serveur web, pas en file://)" : "";
    return { ok: false, error: `${e.message} : ${url}${hint}` };
  }
}

export async function loadArrayBuffer(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `${res.status} ${res.statusText} : ${url}` };
    return { ok: true, value: await res.arrayBuffer() };
  } catch (e) {
    return { ok: false, error: `${e.message} : ${url}` };
  }
}
