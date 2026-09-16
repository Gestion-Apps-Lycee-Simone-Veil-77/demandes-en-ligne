import { escapeHtml } from './emailTemplates.js';
import { formatDateFr, formatHeureFr, formatMontant, formatDateTimeFr, safeJsonParse } from './util.js';
import { ETABLISSEMENT_NOM, ETABLISSEMENT_SITE_CASSIN, ETABLISSEMENT_SITE_NERVAL, ETABLISSEMENT_TELEPHONE, ETABLISSEMENT_EMAIL, ETABLISSEMENT_SITE_WEB, CONTACT_PHOTOS_SORTIE, COURS_BANALISABLES } from './constants.js';

// ['M1','M3'] -> "M1 (8h-9h), M3 (10h10-11h10)"
function formatCoursBanalises(codes) {
  if (!Array.isArray(codes) || !codes.length) return 'aucun';
  return codes.map(code => {
    const c = COURS_BANALISABLES.find(c => c.code === code);
    return c ? `${c.code} (${c.horaire})` : code;
  }).join(', ');
}

// Construit le HTML du document "Sortie pédagogique" envoyé à htmlToPdfBuffer()
// (server/pdf.js). `logoDataUri` est une chaîne data: (voir service.js), vide
// si aucun logo configuré.
export function buildSortiePdfHtml(row, logoDataUri) {
  const accompagnateurs = safeJsonParse(row.AccompagnateursJSON, []);

  const ligne = (label, value) =>
    `<tr><td class="cle">${escapeHtml(label)}</td><td class="val">${escapeHtml(value === undefined || value === null || value === '' ? '-' : value)}</td></tr>`;

  const accompagnateursRows = accompagnateurs.length
    ? accompagnateurs.map((a, i) => ligne('Accompagnateur ' + (i + 1), `${a.nom} - Cours a banaliser : ${formatCoursBanalises(a.coursBanalises)}`)).join('')
    : ligne('Accompagnateurs', '-');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body{font-family:'Segoe UI', Arial, sans-serif;font-size:12px;color:#2c2c2c;line-height:1.5;margin:0;padding:0;}
    .entete{display:flex;align-items:center;gap:18px;border-bottom:2px solid #d5dbe3;padding-bottom:14px;margin-bottom:14px;}
    .entete img{height:52px;width:auto;}
    .entete h1{font-size:16px;margin:0;color:#333;letter-spacing:.3px;font-weight:700;}
    .entete .sous-titre{font-size:11px;color:#777;margin-top:2px;}
    .fiche{
      background:#f4f6f9;border:1px solid #e2e6ec;border-left:4px solid #1a73e8;border-radius:4px;
      padding:12px 16px;margin-bottom:20px;
    }
    .fiche .nom{font-size:15px;font-weight:700;color:#1a3a5c;}
    .fiche .date{font-size:12px;color:#555;margin-top:2px;}
    h2.section{
      font-size:12px;color:#fff;font-weight:700;padding:7px 12px;margin:20px 0 8px;
      border-radius:4px;letter-spacing:.4px;text-transform:uppercase;
    }
    .section-bleu{background:#1a73e8;}
    .section-gris{background:#455a64;}
    .section-bleufonce{background:#174ea6;}
    table{border-collapse:collapse;width:100%;margin-bottom:6px;font-size:12px;}
    td.cle{padding:7px 12px;font-weight:600;background:#f4f6f9;width:42%;border:1px solid #e2e6ec;color:#444;}
    td.val{padding:7px 12px;border:1px solid #e2e6ec;}
    .encadre{background:#f4f6f9;border:1px solid #259156;border-radius:4px;padding:14px 16px;margin-bottom:14px;}
    .encadre p{margin:0 0 8px;}
    .encadre h3{font-size:12.5px;font-weight:700;color:#259156;text-align:center;margin:16px 0 8px;}
    .encadre h3:first-of-type{margin-top:4px;}
    .encadre ol{margin:6px 0 10px;padding-left:20px;}
    .encadre ol ol{margin:4px 0 4px 4px;padding-left:18px;list-style-type:lower-alpha;}
    .encadre li{margin-bottom:6px;}
    .encadre a{color:#1a73e8;text-decoration:underline;}
    .valide{font-size:16px;font-weight:700;color:#259156;margin:0 0 10px;}
    .bonne-sortie{text-align:center;font-weight:700;color:#259156;margin-top:14px;font-size:13px;}
    .page-break{page-break-before:always;}
    .footer{
      margin-top:28px;padding-top:10px;border-top:1px solid #ddd;font-size:9.5px;color:#777;
      display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;
    }
  </style></head><body>

    <div class="entete">
      ${logoDataUri ? `<img src="${logoDataUri}">` : ''}
      <div>
        <h1>SORTIE PEDAGOGIQUE — ${escapeHtml(row.NumeroRequest)}</h1>
        <div class="sous-titre">${escapeHtml(ETABLISSEMENT_NOM)}</div>
      </div>
    </div>

    <div class="fiche">
      <div class="nom">${escapeHtml(row.NomSortie)}</div>
      <div class="date">${escapeHtml(formatDateFr(row.DateSortie))} — ${escapeHtml(row.LieuSortie)}</div>
    </div>

    <h2 class="section section-bleu">Organisateur</h2>
    <table>
      ${ligne('Professeur organisateur', row.ProfesseurOrganisateur)}
      ${ligne("Email de l'organisateur", row.EmailOrganisateur)}
    </table>

    <p class="valide">Votre demande de sortie est validee.</p>
    <div class="encadre">
      <p><strong>La suite des etapes :</strong></p>

      <h3>En cas de sortie obligatoire (donc gratuite pour les eleves), mais financement par le lycee :</h3>
      <ol>
        <li>Se rapprocher <strong>IMPERATIVEMENT</strong> de Mme Dwarka SIN, secretaire generale pour :
          <ol type="a">
            <li>Determiner precisement les modalites de paiement de la facture, si l'entree n'est pas gratuite</li>
            <li>Determiner le nombre de tickets de carte Navigo a prevoir en demandant prealablement aux eleves ceux qui n'en ont pas, ou determiner les modalites payantes de transport. Informer les familles et collecter les autorisations individuelles des eleves.</li>
          </ol>
        </li>
        <li>Verifier les PAI (ou protocole d'urgence) de vos eleves sur Pronote. Si un ou plusieurs eleves sont concernes, veiller a se conformer aux preconisations pour ces eleves ou se rapprocher de Mme Chhean, infirmiere, pour des conseils.</li>
        <li>Le jour de la sortie, faire l'appel sur Pronote (depuis un smartphone) ou informer la vie scolaire (${escapeHtml(ETABLISSEMENT_TELEPHONE)}).</li>
        <li>Penser a faire 3 ou 4 photos, un texte de 3 ou 4 lignes a envoyer ensuite par mail a M. Leger : <a href="mailto:${escapeHtml(CONTACT_PHOTOS_SORTIE)}">${escapeHtml(CONTACT_PHOTOS_SORTIE)}</a>.</li>
        <li>Rapporter imperativement <strong>TOUTES</strong> les cartes Navigo fournies par Mme la secretaire-generale, utilisees ou non utilisees.</li>
      </ol>

      <h3>En cas de sortie facultative avec participation financiere des familles :</h3>
      <ol>
        <li>Se rapprocher <strong>IMPERATIVEMENT</strong> de l'adjointe-gestionnaire pour preciser les modalites.</li>
        <li>Recuperer les versements par cheque (a l'ordre de "l'agent comptable du lycee Simone Veil") et remplir le bordereau de versement.</li>
        <li>Orienter les eleves vers l'intendance pour tout paiement en espece. Ne prenez jamais d'especes vous-meme.</li>
        <li>Remettre le tout a Mme Dwarka Sing, secretaire generale, au plus tard 1 semaine avant la sortie.</li>
        <li>Verifier les PAI (ou protocole d'urgence) de vos eleves sur Pronote. Si un ou plusieurs eleves sont concernes, veiller a se conformer aux preconisations pour ces eleves ou se rapprocher de Mme Chhean, infirmiere, pour des conseils.</li>
        <li>Le jour de la sortie, faire l'appel sur Pronote (depuis un smartphone) ou informer la vie scolaire (${escapeHtml(ETABLISSEMENT_TELEPHONE)}).</li>
        <li>Penser a faire 3 ou 4 photos, un texte de 3 ou 4 lignes a envoyer ensuite par mail a M. Leger : <a href="mailto:${escapeHtml(CONTACT_PHOTOS_SORTIE)}">${escapeHtml(CONTACT_PHOTOS_SORTIE)}</a>.</li>
      </ol>

      <p class="bonne-sortie">Bonne sortie !</p>
    </div>

    <div class="page-break"></div>

    <h2 class="section section-gris">Details de la sortie</h2>
    <table>
      ${ligne('Lieu', row.LieuSortie)}
      ${ligne('Date', formatDateFr(row.DateSortie))}
      ${ligne('Heure de depart', formatHeureFr(row.HeureDepart))}
      ${ligne('Heure de retour', formatHeureFr(row.HeureRetour))}
      ${ligne('Lieu de depart', row.LieuDepart)}
      ${ligne('Lieu de retour', row.LieuRetour)}
      ${ligne('Classe / groupe', row.ClasseGroupe)}
      ${ligne("Nombre d'eleves", row.NombreEleves)}
      ${ligne("Eleves - cout individuel billet d'entree", row.CoutBilletEntreeEleves ? (formatMontant(row.CoutBilletEntreeEleves) + ' EUR') : '-')}
      ${ligne('Eleves - cout individuel ticket transport', row.CoutTicketTransportEleves ? (formatMontant(row.CoutTicketTransportEleves) + ' EUR') : '-')}
      ${ligne('Cours maintenu avant la sortie', row.CoursAvant)}
      ${ligne('Cours maintenu apres la sortie', row.CoursApres)}
      ${ligne('Pass Culture / Adage', row.PassCultureAdage)}
    </table>

    <h2 class="section section-bleufonce">Accompagnateurs</h2>
    <table>
      ${accompagnateursRows}
      ${ligne("Billets d'entree - nombre", row.NbBilletEntreeAccompagnateurs)}
      ${ligne("Billets d'entree - cout individuel", row.CoutBilletEntreeAccompagnateurs ? (formatMontant(row.CoutBilletEntreeAccompagnateurs) + ' EUR') : '-')}
      ${ligne('Tickets transport - nombre', row.NbTicketTransportAccompagnateurs)}
      ${ligne('Tickets transport - cout individuel', row.CoutTicketTransportAccompagnateurs ? (formatMontant(row.CoutTicketTransportAccompagnateurs) + ' EUR') : '-')}
      ${row.AutreTransportCout ? ligne('Autre moyen de transport - cout individuel', formatMontant(row.AutreTransportCout) + ' EUR') : ''}
    </table>

    <div class="footer">
      <span>${escapeHtml(ETABLISSEMENT_SITE_CASSIN)}</span>
      <span>${escapeHtml(ETABLISSEMENT_SITE_NERVAL)}</span>
      <span>${escapeHtml(ETABLISSEMENT_TELEPHONE)} — ${escapeHtml(ETABLISSEMENT_EMAIL)}</span>
      <span>${escapeHtml(ETABLISSEMENT_SITE_WEB)}</span>
    </div>
    <div class="footer" style="border-top:none;margin-top:0;padding-top:0;">
      <span>Document genere automatiquement le ${formatDateTimeFr(new Date())}</span>
    </div>
  </body></html>`;
}
