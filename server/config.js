import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example)`);
  return v;
}

export const config = {
  port: process.env.PORT || 3000,
  serviceAccountKeyFile: required('GOOGLE_SERVICE_ACCOUNT_KEY_FILE'),
  oauthClientId: required('GOOGLE_OAUTH_CLIENT_ID'),
  allowedDomain: required('ALLOWED_WORKSPACE_DOMAIN'),
  spreadsheetId: required('SPREADSHEET_ID'),
  gmailSender: required('GMAIL_SENDER_ADDRESS'),
  logoFileId: process.env.LOGO_FILE_ID || '',
  // Dossier Drive racine pour les pieces jointes DEPENSE (les autres types
  // creent/utilisent des sous-dossiers a l'interieur de celui-ci). Si vide,
  // un dossier est cherche/cree automatiquement par son nom.
  driveFolderId: process.env.DRIVE_FOLDER_ID || '',
  // URL publique de l'appli, utilisee pour les liens de decision/precision
  // dans les mails. Si vide, deduite de la requete (req.protocol + host) --
  // ce qui fonctionne en prod (un seul serveur) mais pas en dev local, ou le
  // frontend (Vite, :5173) et l'API (Express, :3000) tournent separement :
  // sans cette variable les liens pointeraient vers :3000, qui ne sert pas
  // la page React en dev. Mettre http://localhost:5173 dans .env pour tester
  // les mails en local.
  publicUrl: process.env.APP_PUBLIC_URL || ''
};
