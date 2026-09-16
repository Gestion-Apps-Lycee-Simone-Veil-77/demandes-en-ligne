import { sendEmail } from './mail.js';
import { TYPES, STATUT_COULEURS, STATUT_ATTENTE, STATUT_VALIDEE, STATUT_REFUSEE, STATUT_PRECISION, ETABLISSEMENT_NOM } from './constants.js';
import { RECAP_BUILDERS } from './recap.js';

export function escapeHtml(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function emailShell(titre, destinataireNom, innerHtml, couleur) {
  const salutation = destinataireNom ? `Bonjour ${escapeHtml(destinataireNom)},` : 'Bonjour,';
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:${couleur};color:#fff;padding:16px 20px;font-size:18px;font-weight:bold;">${escapeHtml(titre)}</div>
      <div style="padding:20px;">
        <p>${salutation}</p>
        ${innerHtml}
        <p style="color:#888;font-size:12px;margin-top:24px;">${escapeHtml(ETABLISSEMENT_NOM)} — message automatique, merci de ne pas répondre directement à cet email.</p>
      </div>
    </div>`;
}

function recapTableHtml(type, row) {
  const recap = RECAP_BUILDERS[type](row);
  const lignes = recap.map(l =>
    `<tr><td style="padding:5px 8px;color:#666;vertical-align:top;white-space:nowrap;">${escapeHtml(l.label)}</td><td style="padding:5px 8px;font-weight:bold;">${escapeHtml(l.value)}</td></tr>`
  ).join('');
  const pieceJointeRow = row.PieceJointeUrl
    ? `<tr><td style="padding:5px 8px;color:#666;vertical-align:top;">Pièce jointe</td><td style="padding:5px 8px;font-weight:bold;"><a href="${escapeHtml(row.PieceJointeUrl)}">${escapeHtml(row.PieceJointeNom)}</a></td></tr>`
    : '';
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">${lignes}${pieceJointeRow}</table>`;
}

function actionButtonHtml(label, url, couleur) {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${escapeHtml(url)}" style="background:${couleur};color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;display:inline-block;">${escapeHtml(label)}</a>
  </div>`;
}

// ---------- Soumission initiale : mail au demandeur + au directeur (avec bouton) ----------
// Les tiers (intendance/gestionnaire/secretariat/direction) ne sont PAS
// notifies a la soumission -- seulement a la validation (voir
// sendDecisionValidee), pour ne pas les submerger de mails sur des demandes
// pas encore traitees.
export async function sendRecapInitial(type, row, appUrl, directeurEmail) {
  const cfg = TYPES[type];
  const table = recapTableHtml(type, row);
  const numero = row.NumeroRequest;

  const demandeurInner = `<p>Votre ${cfg.libelle} a bien été enregistrée sous le numéro <strong>${escapeHtml(numero)}</strong>. Elle va être examinée par le proviseur. Vous recevrez un nouvel email dès qu'une décision sera prise.</p>${table}`;
  await sendEmail({
    to: row.Email, subject: `${cfg.libelleCap} ${numero} — Enregistrée`,
    html: emailShell(`${cfg.libelleCap} enregistrée`, row.Prenom, demandeurInner, STATUT_COULEURS[STATUT_ATTENTE]),
    text: `Votre ${cfg.libelle} ${numero} a bien été enregistrée.`
  });

  const directeurUrl = `${appUrl}/decision/${type}/${row.ID}`;
  const directeurInner = `<p>Une nouvelle ${cfg.libelle} (<strong>${escapeHtml(numero)}</strong>) a été soumise par <strong>${escapeHtml(row.Prenom + ' ' + row.Nom)}</strong> et doit être examinée.</p>${table}${actionButtonHtml('Traiter la demande', directeurUrl, '#1a73e8')}`;
  await sendEmail({
    to: directeurEmail,
    subject: `Nouvelle ${cfg.libelle} ${numero} — À traiter`,
    html: emailShell('Nouvelle demande à traiter', 'Monsieur le Proviseur', directeurInner, STATUT_COULEURS[STATUT_ATTENTE]),
    text: `Nouvelle ${cfg.libelle} ${numero} à traiter : ${directeurUrl}`
  });
}

// ---------- Décision : validée / refusée / précision demandée ----------
export async function sendDecisionValidee(type, row, tiersEmails, directeurEmail) {
  const cfg = TYPES[type];
  const table = recapTableHtml(type, row);
  const numero = row.NumeroRequest;
  const commentaire = row.CommentaireDirecteur ? `<p>Commentaire du proviseur : ${escapeHtml(row.CommentaireDirecteur)}</p>` : '';
  const pdfLink = row.PdfUrl ? actionButtonHtml('Voir le document généré', row.PdfUrl, '#34a853') : '';
  const inner = `<p>La ${cfg.libelle} <strong>${escapeHtml(numero)}</strong> a été <strong>validée</strong>.</p>${commentaire}${table}${pdfLink}`;
  const html = emailShell(`${cfg.libelleCap} validée`, '', inner, STATUT_COULEURS[STATUT_VALIDEE]);
  const destinataires = [row.Email, ...tiersEmails, directeurEmail];
  for (const to of destinataires) {
    await sendEmail({ to, subject: `${cfg.libelleCap} ${numero} — Validée`, html, text: `${cfg.libelleCap} ${numero} validée.` });
  }
}

export async function sendDecisionRefusee(type, row) {
  const cfg = TYPES[type];
  const table = recapTableHtml(type, row);
  const numero = row.NumeroRequest;
  const commentaire = row.CommentaireDirecteur ? `<p>Motif : ${escapeHtml(row.CommentaireDirecteur)}</p>` : '';
  const inner = `<p>Votre ${cfg.libelle} <strong>${escapeHtml(numero)}</strong> a été <strong>refusée</strong> par le proviseur.</p>${commentaire}${table}`;
  await sendEmail({
    to: row.Email, subject: `${cfg.libelleCap} ${numero} — Refusée`,
    html: emailShell(`${cfg.libelleCap} refusée`, row.Prenom, inner, STATUT_COULEURS[STATUT_REFUSEE]),
    text: `${cfg.libelleCap} ${numero} refusée.`
  });
}

export async function sendDemandePrecision(type, row, appUrl) {
  const cfg = TYPES[type];
  const table = recapTableHtml(type, row);
  const numero = row.NumeroRequest;
  const commentaire = `<p>Le proviseur souhaite les précisions suivantes :</p><p style="padding:10px;background:#f0f4ff;border-radius:6px;">${escapeHtml(row.CommentaireDirecteur)}</p>`;
  const precisionUrl = `${appUrl}/precision/${type}/${row.ID}`;
  const inner = `<p>Le proviseur demande des précisions concernant votre ${cfg.libelle} <strong>${escapeHtml(numero)}</strong>.</p>${commentaire}${table}${actionButtonHtml('Apporter des précisions', precisionUrl, '#1a73e8')}`;
  await sendEmail({
    to: row.Email, subject: `${cfg.libelleCap} ${numero} — Précisions demandées`,
    html: emailShell('Précisions demandées', row.Prenom, inner, STATUT_COULEURS[STATUT_PRECISION]),
    text: `Précisions demandées pour ${cfg.libelle} ${numero} : ${precisionUrl}`
  });
}

export async function sendPrecisionApportee(type, row, appUrl, directeurEmail) {
  const cfg = TYPES[type];
  const table = recapTableHtml(type, row);
  const numero = row.NumeroRequest;
  const precision = `<p>Précisions apportées par le demandeur.euse :</p><p style="padding:10px;background:#f0f4ff;border-radius:6px;">${escapeHtml(row.PrecisionApportee)}</p>`;

  await sendEmail({
    to: row.Email, subject: `${cfg.libelleCap} ${numero} — Précisions transmises`,
    html: emailShell('Précisions transmises', row.Prenom, `<p>Vos précisions concernant la ${cfg.libelle} <strong>${escapeHtml(numero)}</strong> ont bien été transmises au proviseur.</p>${precision}${table}`, STATUT_COULEURS[STATUT_ATTENTE]),
    text: `Vos précisions pour ${cfg.libelle} ${numero} ont été transmises.`
  });

  const directeurUrl = `${appUrl}/decision/${type}/${row.ID}`;
  const directeurInner = `<p>Le demandeur.euse a apporté les précisions demandées concernant la ${cfg.libelle} <strong>${escapeHtml(numero)}</strong>.</p>${precision}${table}${actionButtonHtml('Traiter la demande', directeurUrl, '#1a73e8')}`;
  await sendEmail({
    to: directeurEmail, subject: `${cfg.libelleCap} ${numero} — Précisions apportées`,
    html: emailShell('Précisions apportées', 'Monsieur le Proviseur', directeurInner, STATUT_COULEURS[STATUT_ATTENTE]),
    text: `Précisions apportées pour ${cfg.libelle} ${numero} : ${directeurUrl}`
  });
}
