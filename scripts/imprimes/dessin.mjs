/**
 * Illustrations au trait, dessinées en vecteur (unités : millimètres).
 * Un immeuble haussmannien en élévation, stores orange au rez-de-chaussée,
 * et le Sacré-Cœur sur sa butte. Trait d'encre régulier, comme une gravure
 * d'architecte : net à toutes les tailles, sans photo d'origine.
 */
const ENCRE = '#1f1f1c';
const ORANGE = '#f7b366';
const f = (n) => Math.round(n * 100) / 100;

const ligne = (x1, y1, x2, y2, e = 0.18) =>
  `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="${e}"/>`;
const rect = (x, y, l, h, e = 0.25, fond = '#fff') =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(l)}" height="${f(h)}" stroke-width="${e}" fill="${fond}"/>`;

/* Garde-corps en fer forgé : lisses, barreaux et volutes. */
function gardeCorps(x, y, l, h) {
  let s = rect(x, y, l, h, 0.22, '#fff');
  s += ligne(x, y + 0.9, x + l, y + 0.9, 0.14) + ligne(x, y + h - 0.9, x + l, y + h - 0.9, 0.14);
  const pas = 2.2;
  const n = Math.max(1, Math.round(l / pas));
  const p = l / n;
  for (let i = 0; i < n; i++) {
    const cx = x + p * (i + 0.5);
    const cy = y + h / 2;
    const r = Math.min(p, h - 1.8) * 0.36;
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" stroke-width="0.12" fill="none"/>`;
    s += ligne(x + p * i, y + 0.9, x + p * i, y + h - 0.9, 0.12);
  }
  return s;
}

/* Fenêtre à la française : chambranle, montant, traverses, garde-corps bas. */
function fenetre(x, y, l, h, { arc = false, fronton = false, balconnet = true } = {}) {
  let s = '';
  if (arc) {
    s += `<path d="M ${f(x - 0.8)} ${f(y + 2)} Q ${f(x + l / 2)} ${f(y - 2.6)} ${f(x + l + 0.8)} ${f(y + 2)}" stroke-width="0.22" fill="none"/>`;
    s += rect(x + l / 2 - 0.8, y - 1.4, 1.6, 2.2, 0.16); // clé
  }
  if (fronton) {
    s += `<path d="M ${f(x - 1.4)} ${f(y - 1.2)} L ${f(x + l / 2)} ${f(y - 4.6)} L ${f(x + l + 1.4)} ${f(y - 1.2)} Z" stroke-width="0.22" fill="#fff"/>`;
  }
  s += rect(x - 0.8, y, l + 1.6, h + 0.6, 0.22); // chambranle
  s += rect(x, y + 0.6, l, h - 0.6, 0.2, '#fff');
  s += ligne(x + l / 2, y + 0.6, x + l / 2, y + h, 0.14);
  for (const t of [0.28, 0.56]) s += ligne(x, y + 0.6 + (h - 0.6) * t, x + l, y + 0.6 + (h - 0.6) * t, 0.12);
  if (balconnet) s += gardeCorps(x - 0.4, y + h - 3.2, l + 0.8, 3.4);
  return s;
}

/* Corniche : double filet et denticules. */
function corniche(x, y, l, saillie = 1.6) {
  let s = rect(x - saillie, y, l + 2 * saillie, 1.2, 0.24) + rect(x - saillie / 2, y + 1.2, l + saillie, 1, 0.2);
  for (let i = x; i < x + l; i += 1.6) s += ligne(i, y + 1.2, i, y + 2.2, 0.12);
  return s;
}

/* Balcon filant sur consoles. */
function balconFilant(x, y, l) {
  let s = rect(x - 1.2, y, l + 2.4, 1, 0.24);
  for (let i = x + 2; i < x + l; i += 16) {
    s += `<path d="M ${f(i)} ${f(y + 1)} q 0 2.6 1.4 2.6 q 0 -1.4 -0.2 -2.6 Z" stroke-width="0.16" fill="#fff"/>`;
  }
  return s + gardeCorps(x - 0.6, y - 3.6, l + 1.2, 3.6);
}

/* Store à lambrequin festonné, orange. */
function store(x, y, l, h, texte = '') {
  const n = Math.round(l / 2.4);
  const p = l / n;
  const feston = Array.from({ length: n }, () => ` q ${f(-p / 2)} 1.4 ${f(-p)} 0`).join('');
  let s = `<path d="M ${f(x + 1.2)} ${f(y)} L ${f(x + l - 1.2)} ${f(y)} L ${f(x + l)} ${f(y + h)}${feston} Z" fill="${ORANGE}" stroke-width="0.24"/>`;
  for (let i = 1; i < 6; i++) s += ligne(x + 1.2 + ((l - 2.4) * i) / 6, y, x + (l * i) / 6, y + h, 0.1);
  if (texte)
    s += `<text x="${f(x + l / 2)}" y="${f(y + h - 1.6)}" text-anchor="middle" font-family="MS, Montserrat, sans-serif" font-weight="600" font-size="1.75" letter-spacing="0.35" fill="${ENCRE}" stroke="none">${texte}</text>`;
  return s;
}

/** Immeuble haussmannien en élévation : largeur 92 mm, hauteur 198 mm. */
export function immeuble({ enseigne = 'TRUDAINES', travees = 5 } = {}) {
  const L = 92;
  const marge = 7;
  const pas = (L - 2 * marge) / travees;
  const lf = 8.6; // largeur de fenêtre
  const X = (i) => marge + pas * i + (pas - lf) / 2;
  const niveaux = { toit: 0, mansarde: 10, corniche: 34, e5: 38, e4: 61, e3: 84, e2: 108, entresol: 136, rdc: 152, sol: 198 };
  let s = '';

  /* Toit : souches de cheminée, brisis en zinc, lucarnes. */
  for (const cx of [9, L - 15]) {
    s += rect(cx, 2, 6, 10, 0.24);
    s += rect(cx - 0.6, 1.2, 7.2, 1.2, 0.2);
    for (let k = 0; k < 3; k++) s += rect(cx + 0.6 + k * 1.8, -0.8, 1.2, 2, 0.16);
  }
  s += `<path d="M 3 ${niveaux.corniche} L 7 ${niveaux.mansarde} L ${L - 7} ${niveaux.mansarde} L ${L - 3} ${niveaux.corniche} Z" fill="#fff" stroke-width="0.26"/>`;
  for (let x = 4; x < L - 3; x += 1.4) {
    const t = Math.min(Math.max((x - 3) / 4, 0), 1) * Math.min(Math.max((L - 3 - x) / 4, 0), 1);
    s += ligne(x, niveaux.mansarde + (1 - t) * 24, x, niveaux.corniche, 0.09);
  }
  s += ligne(7, niveaux.mansarde, L - 7, niveaux.mansarde, 0.3);
  for (let i = 0; i < travees; i++) {
    const x = X(i) + 0.6;
    const y = niveaux.mansarde + 7;
    s += `<path d="M ${f(x - 1.6)} ${f(y + 15)} L ${f(x - 1.6)} ${f(y + 2)} Q ${f(x + 3.7)} ${f(y - 4.4)} ${f(x + 9)} ${f(y + 2)} L ${f(x + 9)} ${f(y + 15)} Z" fill="#fff" stroke-width="0.24"/>`;
    s += `<path d="M ${f(x)} ${f(y + 14)} L ${f(x)} ${f(y + 3)} Q ${f(x + 3.7)} ${f(y - 1.6)} ${f(x + 7.4)} ${f(y + 3)} L ${f(x + 7.4)} ${f(y + 14)} Z" fill="#fff" stroke-width="0.18"/>`;
    s += ligne(x + 3.7, y + 1, x + 3.7, y + 14, 0.12) + ligne(x, y + 8, x + 7.4, y + 8, 0.12);
  }

  /* Façade de pierre. */
  s += rect(0, niveaux.corniche, L, niveaux.sol - niveaux.corniche, 0.3);
  s += corniche(0, niveaux.corniche, L, 2.2);
  /* Chaînes d'angle. */
  for (const x of [0, L - 3.2])
    for (let y = niveaux.e5 + 2; y < niveaux.entresol; y += 4.6) s += rect(x, y, 3.2, 2.3, 0.12);

  /* Étages courants. */
  const etages = [
    ['e5', 19, { balconnet: false }],
    ['e4', 19, {}],
    ['e3', 20, { arc: true }],
    ['e2', 22, { fronton: true, balconnet: false }],
  ];
  for (const [n, h, o] of etages) {
    const y0 = niveaux[n] + 2.5;
    for (let i = 0; i < travees; i++) s += fenetre(X(i), y0, lf, h, o);
    s += ligne(0, niveaux[n] + h + 3.6, L, niveaux[n] + h + 3.6, 0.14); // bandeau
  }
  s += balconFilant(4, niveaux.e5 + 19.4, L - 8);
  s += balconFilant(4, niveaux.e2 + 23, L - 8);
  /* Mascarons sur l'étage noble. */
  for (let i = 0; i < travees; i++) {
    const cx = X(i) + lf / 2;
    s += `<path d="M ${f(cx - 1.6)} ${f(niveaux.e2 - 2.4)} q 1.6 -2 3.2 0 q -0.4 1.6 -1.6 1.8 q -1.2 -0.2 -1.6 -1.8 Z" stroke-width="0.14" fill="#fff"/>`;
  }

  /* Entresol et rez-de-chaussée à refends. */
  s += corniche(0, niveaux.entresol - 2.2, L, 0.8);
  for (let y = niveaux.entresol + 3; y < niveaux.sol; y += 3.4) s += ligne(0, y, L, y, 0.12);
  for (let i = 0; i < travees; i++) {
    s += rect(X(i), niveaux.entresol + 2.4, lf, 10, 0.22);
    s += ligne(X(i) + lf / 2, niveaux.entresol + 2.4, X(i) + lf / 2, niveaux.entresol + 12.4, 0.12);
  }
  /* Arcades de boutique et stores. */
  for (let i = 0; i < travees; i++) {
    const x = marge + pas * i + 1.2;
    const l = pas - 2.4;
    const y = niveaux.rdc + 2;
    s += `<path d="M ${f(x)} ${niveaux.sol} L ${f(x)} ${f(y + 6)} Q ${f(x + l / 2)} ${f(y - 1)} ${f(x + l)} ${f(y + 6)} L ${f(x + l)} ${niveaux.sol} Z" fill="#fff" stroke-width="0.26"/>`;
    s += ligne(x + l / 2, y + 16, x + l / 2, niveaux.sol, 0.14);
    for (let k = 1; k < 4; k++) s += ligne(x, y + 12 + k * 7.5, x + l, y + 12 + k * 7.5, 0.1);
    s += store(x - 0.6, y + 6.5, l + 1.2, 8.5, i === 2 ? enseigne : '');
  }
  s += ligne(-4, niveaux.sol, L + 4, niveaux.sol, 0.35);

  return { l: L, h: niveaux.sol + 2, svg: `<g stroke="${ENCRE}" fill="none" stroke-linejoin="round" stroke-linecap="round">${s}</g>` };
}

/** Sacré-Cœur sur la butte, arbres en boules : largeur 60 mm, hauteur 52 mm. */
export function sacreCoeur() {
  let s = '';
  /* Campanile à l'arrière. */
  s += rect(43, 6, 5, 22, 0.2);
  s += `<path d="M 42.6 6 Q 45.5 -1 48.4 6 Z" fill="#fff" stroke-width="0.2"/>`;
  s += ligne(45.5, 1.2, 45.5, -1.6, 0.16);
  for (let y = 9; y < 26; y += 4) s += ligne(43, y, 48, y, 0.1);
  /* Corps et dômes latéraux. */
  s += rect(14, 24, 32, 12, 0.24);
  for (const cx of [17, 43]) {
    s += rect(cx - 3, 17, 6, 7, 0.2);
    s += `<path d="M ${cx - 3.4} 17 Q ${cx} 9.5 ${cx + 3.4} 17 Z" fill="#fff" stroke-width="0.2"/>`;
    s += ligne(cx, 11.4, cx, 9.8, 0.14);
  }
  /* Grand dôme : tambour à colonnes, coupole ovoïde, lanterne. */
  s += rect(22.5, 15, 15, 10, 0.24);
  for (let x = 24; x < 37; x += 1.6) s += ligne(x, 15.8, x, 24.4, 0.1);
  s += `<path d="M 22 15 C 22 5 26.5 1.5 30 0.6 C 33.5 1.5 38 5 38 15 Z" fill="#fff" stroke-width="0.26"/>`;
  for (const k of [-4, 0, 4]) s += `<path d="M ${30 + k * 1.6} 15 Q ${30 + k} 6 30 0.9" stroke-width="0.1" fill="none"/>`;
  s += rect(29, -2.6, 2, 3.2, 0.16);
  s += ligne(30, -2.6, 30, -5, 0.16) + ligne(29.2, -4.1, 30.8, -4.1, 0.16);
  /* Portique. */
  for (let x = 20; x <= 40; x += 4) {
    s += `<path d="M ${x} 36 L ${x} 30 Q ${x + 2} 27.6 ${x + 4} 30 L ${x + 4} 36" stroke-width="0.14" fill="none"/>`;
  }
  s += ligne(12, 36, 48, 36, 0.24);
  /* Butte, escaliers et arbres. */
  s += `<path d="M -4 52 Q 10 40 22 38 L 38 38 Q 52 40 64 52" stroke-width="0.24" fill="#fff"/>`;
  for (let y = 39.5; y < 52; y += 1.6) s += ligne(30 - (y - 36) * 0.45, y, 30 + (y - 36) * 0.45, y, 0.1);
  const arbre = (cx, cy, r) => {
    let p = '';
    for (let a = 0; a < 7; a++) {
      const ang = (a / 7) * Math.PI * 2;
      p += `<circle cx="${f(cx + Math.cos(ang) * r * 0.55)}" cy="${f(cy + Math.sin(ang) * r * 0.45)}" r="${f(r * 0.55)}" stroke-width="0.14" fill="#fff"/>`;
    }
    return p + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.6)}" stroke-width="0" fill="#fff"/>`;
  };
  for (const [cx, cy, r] of [
    [4, 46, 4.2], [11, 43, 4.6], [18, 46, 3.8], [42, 46, 3.8], [49, 43, 4.6], [56, 46, 4.2], [8, 50, 3.6], [52, 50, 3.6],
  ])
    s += arbre(cx, cy, r);
  return { l: 60, h: 52, svg: `<g stroke="${ENCRE}" fill="none" stroke-linejoin="round" stroke-linecap="round">${s}</g>` };
}

/**
 * Scène prête à poser : une rue d'immeubles mitoyens, le Sacré-Cœur à côté.
 * Renvoie un <svg> de l x h mm, immeubles calés en bas et à pleine hauteur.
 * cote : 'gauche' (immeubles à gauche, butte à droite) ou 'droite'.
 */
export function scene({ l, h, batiments = 1, butte = true, cote = 'gauche', style = '' }) {
  const k = (h - 3) / 198;
  const i5 = immeuble();
  const i4 = immeuble({ enseigne: '', travees: 4 });
  const sc = sacreCoeur();
  const kc = Math.min(k * 0.95, 0.95);
  const largeurRue = batiments * i5.l * k;
  const largeurButte = butte ? sc.l * kc : 0;
  let x = cote === 'gauche' ? 0 : l - largeurRue;
  let g = '';
  for (let b = 0; b < batiments; b++) {
    const im = b === 0 ? i5 : i4;
    g += `<g transform="translate(${f(x + b * i5.l * k)} ${f(h - im.h * k)}) scale(${f(k)})">${im.svg}</g>`;
  }
  if (butte) {
    const xb = cote === 'gauche' ? largeurRue + (l - largeurRue - largeurButte) / 2 : (l - largeurRue - largeurButte) / 2;
    g += `<g transform="translate(${f(xb)} ${f(h - 1 - sc.h * kc)}) scale(${f(kc)})">${sc.svg}</g>`;
  }
  g += `<line x1="0" y1="${f(h - 1)}" x2="${l}" y2="${f(h - 1)}" stroke="${ENCRE}" stroke-width="0.3"/>`;
  return `<svg class="abs" viewBox="0 0 ${l} ${h}" style="width:${l}mm;height:${h}mm;${style}" overflow="hidden">${g}</svg>`;
}
