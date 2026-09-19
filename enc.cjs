const s = require('sharp');
const fs = require('fs');
const d = '/tmp/claude-0/-home-user-trudaines-dpe/87a0e98e-1d89-5d2f-8203-f427d20a26fe/scratchpad/modules';
(async () => {
  for (const [src, nom, larg] of [
    ['header-1.jpg', 'moulure', [1200, 2000]],
    ['favorites-1.jpg', 'facade-haussmannienne', [1200, 2000, 2560]],
  ]) {
    for (const l of larg) {
      const b = s(d + '/' + src).rotate().resize({ width: l, kernel: 'lanczos3' });
      await b.clone().avif({ quality: 70, effort: 4 }).toFile(`public/images/marque/${nom}-${l}.avif`);
      await b.clone().webp({ quality: 88, effort: 4, smartSubsample: true }).toFile(`public/images/marque/${nom}-${l}.webp`);
      console.log(nom, l, Math.round(fs.statSync(`public/images/marque/${nom}-${l}.avif`).size / 1024) + 'ko avif',
        Math.round(fs.statSync(`public/images/marque/${nom}-${l}.webp`).size / 1024) + 'ko webp');
    }
  }
})();
