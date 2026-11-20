import kimo from "./kimo.json";

const sections = {
  poses: { titre: "POSES", items: kimo.poses },
  "expressions-a": { titre: "EXPRESSIONS A", items: kimo.expressions.a },
  "expressions-b": { titre: "EXPRESSIONS B", items: kimo.expressions.b },
  rotation: { titre: "ROTATION", items: kimo.rotation },
  planches: {
    titre: "PLANCHES",
    items: kimo.planches.map((src) => ({ nom: src.split("/").pop().replace(".jpg", ""), src })),
  },
};

const onglets = document.getElementById("onglets");
const grille = document.getElementById("grille");
const img = document.getElementById("apercu-img");
const nom = document.getElementById("apercu-nom");
const chemin = document.getElementById("apercu-src");
const scene = document.querySelector(".scene");

function choisir(item) {
  img.src = item.src;
  nom.textContent = item.nom.replace(/-/g, " ").toUpperCase();
  chemin.textContent = item.src;
  grille.querySelectorAll(".carte").forEach((c) => c.classList.toggle("actif", c.dataset.src === item.src));
}

function afficher(cle) {
  onglets.querySelectorAll("button").forEach((b) => b.classList.toggle("actif", b.dataset.cle === cle));
  grille.className = cle === "planches" ? "large" : "";
  grille.innerHTML = "";
  for (const item of sections[cle].items) {
    const carte = document.createElement("button");
    carte.className = "carte";
    carte.dataset.src = item.src;
    carte.innerHTML = `<img src="${item.src}" alt="${item.nom}" loading="lazy" /><span>${item.nom.replace(/-/g, " ")}</span>`;
    carte.onclick = () => choisir(item);
    grille.appendChild(carte);
  }
  choisir(sections[cle].items[0]);
}

for (const [cle, s] of Object.entries(sections)) {
  const b = document.createElement("button");
  b.dataset.cle = cle;
  b.textContent = `${s.titre} (${s.items.length})`;
  b.onclick = () => afficher(cle);
  onglets.appendChild(b);
}

document.querySelectorAll("[data-fond]").forEach((b) => {
  b.onclick = () => (scene.dataset.fond = b.dataset.fond);
});
scene.dataset.fond = "clair";
afficher("poses");
