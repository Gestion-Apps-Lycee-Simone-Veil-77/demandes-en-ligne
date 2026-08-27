// Génération de PDF à partir d'un gabarit HTML, via Chromium headless
// (Puppeteer). Équivalent de Utilities.newBlob(html).getAs('application/pdf')
// côté Apps Script -- le HTML/CSS du document (voir emailTemplates.js) est
// repris quasiment à l'identique.
//
// Le navigateur est lancé une seule fois et réutilisé entre les requêtes
// (c'est justement l'intérêt d'un process qui reste allumé en continu, plutôt
// que du serverless) : le premier PDF généré après le démarrage du serveur est
// un peu plus lent (lancement de Chromium), les suivants sont rapides.
import puppeteer from 'puppeteer';

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // requis dans la plupart des environnements cloud (Render inclus)
    });
  }
  return browserPromise;
}

export async function htmlToPdfBuffer(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' }
    });
  } finally {
    await page.close();
  }
}
