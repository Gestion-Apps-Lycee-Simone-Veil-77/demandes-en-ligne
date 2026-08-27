import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { config } from './config.js';

// Portee complete (pas "drive.readonly" comme dans Suivi Heures Supp) : ici on a
// aussi besoin d'ecrire (pieces jointes, PDF genere), pas seulement de lire le logo.
const auth = new google.auth.GoogleAuth({
  keyFile: config.serviceAccountKeyFile,
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

// ---------- Lecture (logo) ----------
export async function getDriveFile(fileId) {
  const meta = await drive.files.get({ fileId, fields: 'mimeType', supportsAllDrives: true });
  const res = await drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' });
  return { mimeType: meta.data.mimeType, buffer: Buffer.from(res.data) };
}

// ---------- Dossiers ----------
function escapeForQuery(name) {
  return name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findFolderByName(name, parentId) {
  const q = [
    `name = '${escapeForQuery(name)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
    parentId ? `'${parentId}' in parents` : null
  ].filter(Boolean).join(' and ');
  // supportsAllDrives + includeItemsFromAllDrives : indispensables des qu'on
  // travaille dans un Drive partage (voir getDepenseFolderId ci-dessous) --
  // sans ca, l'API se comporte comme si le dossier/sous-dossier n'existait
  // pas pour le compte de service.
  const res = await drive.files.list({
    q, fields: 'files(id, name)', pageSize: 1,
    supportsAllDrives: true, includeItemsFromAllDrives: true, corpora: 'allDrives'
  });
  return res.data.files?.[0] || null;
}

async function createFolder(name, parentId) {
  const res = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined },
    fields: 'id',
    supportsAllDrives: true
  });
  return res.data.id;
}

export async function getOrCreateFolder(name, parentId) {
  const found = await findFolderByName(name, parentId);
  if (found) return found.id;
  const id = await createFolder(name, parentId);
  console.log(`Dossier Drive cree : ${name} (${id})`);
  return id;
}

// Dossier racine des pieces jointes DEPENSE : config.driveFolderId, obligatoire.
//
// Il n'y a volontairement PAS de repli "creation automatique par son nom" :
// un compte de service n'a pas de stockage Drive qui lui soit propre (c'est
// le sens exact de l'erreur Google "Service Accounts do not have storage
// quota") -- il ne peut deposer des fichiers que dans un dossier appartenant
// a un vrai compte humain et partage avec lui. Creer un dossier "a la racine"
// sans parent le creerait dans le Drive du compte de service lui-meme, ce qui
// echoue toujours. Voir README section 7 pour creer/partager ce dossier.
export function getDepenseFolderId() {
  if (!config.driveFolderId) {
    const err = new Error(
      "Configuration incomplète : DRIVE_FOLDER_ID n'est pas défini dans .env. " +
      "Créez un dossier Drive, partagez-le avec l'adresse email du compte de service (rôle Éditeur), " +
      "puis renseignez son ID dans .env (voir README section 7)."
    );
    err.status = 500;
    throw err;
  }
  return config.driveFolderId;
}

// Resout le dossier de destination pour un type donne : DEPENSE va directement
// dans le dossier racine ; les autres (REMBOURSEMENT, PDF de sortie) vont dans un
// sous-dossier a l'interieur de celui-ci, nomme `subfolderName`.
export async function getAttachmentFolderId(type, subfolderName) {
  const depenseFolderId = await getDepenseFolderId();
  if (type === 'DEPENSE') return depenseFolderId;
  return getOrCreateFolder(subfolderName, depenseFolderId);
}

// ---------- Fichiers ----------
async function shareWithDomain(fileId) {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'domain', domain: config.allowedDomain },
      supportsAllDrives: true
    });
  } catch (err) {
    // Le partage par lien/domaine peut etre bloque par la politique de partage
    // du Workspace. Dans ce cas, partagez le dossier concerne manuellement,
    // une fois, avec les adresses intendance/gestionnaire/secretariat/directeur.
    console.error(`Echec du partage du fichier ${fileId} : ${err.message}`);
  }
}

// Depose un fichier (buffer) dans un dossier Drive, le partage avec tout le
// domaine en lecture, et renvoie { id, url, name }.
export async function uploadFile(folderId, name, mimeType, buffer) {
  // Readable.from() traite un vrai Buffer comme un bloc unique, mais un
  // Uint8Array "nu" (ex : renvoyé par Puppeteer page.pdf(), voir pdf.js) comme
  // un iterable a parcourir octet par octet -- ce qui plante plus loin dans
  // l'upload (chunk = un simple nombre au lieu du fichier). On force donc un
  // vrai Buffer ici, quelle que soit la source de l'appelant.
  const safeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body: Readable.from(safeBuffer) },
    fields: 'id, webViewLink, name',
    supportsAllDrives: true
  });
  await shareWithDomain(res.data.id);
  return { id: res.data.id, url: res.data.webViewLink, name: res.data.name };
}
