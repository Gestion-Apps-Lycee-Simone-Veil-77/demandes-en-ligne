import {
  readSheetAsObjects, appendObjectRow, findRowById, updateRow,
  sheetExists, createSheet, getHeaders, getSheetValues, ensureColumns
} from './sheets.js';
import { getAttachmentFolderId, uploadFile, getDriveFile } from './drive.js';
import { htmlToPdfBuffer } from './pdf.js';
import { buildSortiePdfHtml } from './sortiePdf.js';
import { RECAP_BUILDERS } from './recap.js';
import {
  sendRecapInitial, sendDecisionValidee, sendDecisionRefusee, sendDemandePrecision, sendPrecisionApportee
} from './emailTemplates.js';
import { uuid, formatDateTimeFr } from './util.js';
import { cacheGet, cacheSet, cacheDel } from './cache.js';
import { withLock } from './lock.js';
import { config } from './config.js';
import {
  TYPES, TYPE_REMBOURSEMENT_OPTIONS, STATUT_PRONOTE_OPTIONS, VALIDATION_TIERS,
  STATUT_ATTENTE, STATUT_VALIDEE, STATUT_REFUSEE, STATUT_PRECISION,
  MAX_FILE_MB, PASS_CULTURE_ADAGE_OPTIONS, COURS_BANALISABLES
} from './constants.js';

// ---------- Identité / annuaire ----------

// Volontairement PAS mise en cache (comme isAdmin côté Heures Supp) : un ajout
// dans ConfigPersonnel doit être pris en compte immédiatement.
export async function getPersonnelInfo(email) {
  if (!email) return null;
  const { rows } = await readSheetAsObjects('ConfigPersonnel');
  const cible = String(email).trim().toLowerCase();
  const row = rows.find(r => String(r.Email || '').trim().toLowerCase() === cible);
  if (!row) return null;
  return { nom: String(row.Nom || '').trim(), prenom: String(row.Prenom || '').trim() };
}

async function requirePersonnel(email) {
  if (!email) {
    const err = new Error("Impossible de récupérer votre adresse mail. Merci de vous connecter avec votre compte de l'établissement.");
    err.status = 401;
    throw err;
  }
  const personnel = await getPersonnelInfo(email);
  if (!personnel) {
    const err = new Error(`Votre compte (${email}) n'est pas reconnu dans l'annuaire du formulaire. Merci de contacter l'intendance pour être ajouté.`);
    err.status = 400;
    throw err;
  }
  return { email, ...personnel };
}

// Destinataires fixes (ConfigDestinataires) : lus à chaque appel, pas mis en
// cache -- comme `directeur` sert aussi de contrôle d'accès, un changement
// doit être pris en compte immédiatement, sans délai.
export async function getDestinataire(cle) {
  const { rows } = await readSheetAsObjects('ConfigDestinataires');
  const row = rows.find(r => String(r.Cle || '').trim().toLowerCase() === cle.toLowerCase());
  if (!row || !row.Valeur) {
    const err = new Error(`Destinataire non configuré dans ConfigDestinataires : ${cle}`);
    err.status = 500;
    throw err;
  }
  return String(row.Valeur).trim();
}

export async function requireDirecteur(email) {
  const directeur = await getDestinataire('directeur');
  if (!email || email.trim().toLowerCase() !== directeur.trim().toLowerCase()) {
    const err = new Error('Cette page est réservée au proviseur.');
    err.status = 403;
    throw err;
  }
  return email;
}

// Roles notifies uniquement quand la demande est validee (voir constants.js).
async function destinatairesValidation(type) {
  return Promise.all((VALIDATION_TIERS[type] || []).map(getDestinataire));
}

// ---------- Configs / bootstrap formulaires ----------

export async function getTypesDepense() {
  const cached = cacheGet('typesDepense');
  if (cached) return cached;
  const { rows } = await readSheetAsObjects('ConfigTypeDepense');
  const result = rows.map(r => r.TypeDepense).filter(Boolean);
  cacheSet('typesDepense', result, 1800);
  return result;
}

export async function getFormBootstrapDepense(email) {
  const [personnel, typesDepense] = await Promise.all([requirePersonnel(email), getTypesDepense()]);
  return { ...personnel, typesDepense };
}

export async function getFormBootstrapRemboursement(email) {
  const personnel = await requirePersonnel(email);
  return { ...personnel, typesDepense: TYPE_REMBOURSEMENT_OPTIONS };
}

export async function getFormBootstrapSortie(email) {
  return requirePersonnel(email);
}

export async function getFormBootstrapIntervenant(email) {
  return requirePersonnel(email);
}

// ---------- Numérotation ----------

// Chaque type a sa propre séquence dans la feuille Compteurs (ex: DEP-00001,
// SALLE-00001... indépendamment les uns des autres).
//
// IMPORTANT : ne prend PAS son propre verrou -- toujours appelée depuis
// l'intérieur d'un withLock('sheet-write', ...) englobant (voir submitDepense
// etc.). Notre verrou en mémoire (lock.js) n'est pas réentrant : l'acquérir
// deux fois en cascade sur la même clé bloquerait indéfiniment.
async function getNextRequestNumber(type) {
  const cfg = TYPES[type];
  const values = await getSheetValues('Compteurs');
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === type) {
      const next = (Number(values[i][1]) || 0) + 1;
      await updateRow('Compteurs', i + 1, ['Type', 'Dernier'], { Type: type, Dernier: next });
      return `${cfg.prefix}-${String(next).padStart(5, '0')}`;
    }
  }
  await appendObjectRow('Compteurs', ['Type', 'Dernier'], { Type: type, Dernier: 1 });
  return `${cfg.prefix}-00001`;
}

// ---------- Pièces jointes ----------

async function saveAttachment(type, fichier, numeroRequest) {
  if (!fichier || !fichier.base64 || !fichier.name) {
    const err = new Error('La pièce jointe est obligatoire.');
    err.status = 400;
    throw err;
  }
  if (fichier.mimeType !== 'application/pdf') {
    const err = new Error('La pièce jointe doit être un fichier PDF.');
    err.status = 400;
    throw err;
  }
  const buffer = Buffer.from(fichier.base64, 'base64');
  const sizeMb = buffer.length / (1024 * 1024);
  if (sizeMb > MAX_FILE_MB) {
    const err = new Error(`Le fichier dépasse la taille maximale autorisée (${MAX_FILE_MB} Mo).`);
    err.status = 400;
    throw err;
  }
  const safeName = `${numeroRequest} - ${fichier.name}`.replace(/[\\/:*?"<>|]/g, '_');
  const folderId = await getAttachmentFolderId(type, TYPES[type].folderName);
  const uploaded = await uploadFile(folderId, safeName, 'application/pdf', buffer);
  return { url: uploaded.url, name: safeName };
}

function creerLigneBase(email, personnel, numero) {
  return {
    ID: uuid(),
    NumeroRequest: numero,
    DateSaisie: new Date(),
    Email: email,
    Nom: personnel.nom,
    Prenom: personnel.prenom,
    Statut: STATUT_ATTENTE,
    PrecisionDejaDemandee: false,
    CommentaireDirecteur: '',
    PrecisionApportee: '',
    DateDecision: '',
    TraitePar: ''
  };
}

async function envoyerRecapInitial(appUrl, type, row) {
  try {
    const directeur = await getDestinataire('directeur');
    await sendRecapInitial(type, row, appUrl, directeur);
  } catch (mailErr) {
    // La demande est déjà enregistrée à ce stade : une erreur de configuration
    // des destinataires ne doit pas faire croire à l'utilisateur que sa saisie a échoué.
    console.error(`Demande ${row.NumeroRequest} enregistrée mais erreur envoi email : ${mailErr.message}`);
  }
}

// ---------- Soumission : DEPENSE ----------

export async function submitDepense(email, appUrl, payload) {
  const personnel = await requirePersonnel(email);

  const requis = {
    service: 'Service ou discipline', intitule: 'Intitulé et objectif de la dépense',
    discussion: 'Discussions / validation préalable', typeDepense: 'Type de dépense',
    dateLimite: 'Délai de dépense', montant: 'Montant de la dépense', ttcOuHt: 'TTC ou HT',
    fournisseur: 'Nom du fournisseur', fournisseurReference: 'Fournisseur déjà référencé'
  };
  requireFields(payload, requis);

  const montant = parseFloat(String(payload.montant).replace(',', '.'));
  if (isNaN(montant) || montant <= 0) badRequest('Le montant de la dépense est invalide.');

  return withLock('sheet-write', async () => {
    const numero = await getNextRequestNumber('DEPENSE');
    const piece = await saveAttachment('DEPENSE', payload.fichier, numero);

    const row = {
      ...creerLigneBase(email, personnel, numero),
      Service: String(payload.service).trim(),
      Intitule: String(payload.intitule).trim(),
      Discussion: String(payload.discussion).trim(),
      TypeDepense: String(payload.typeDepense).trim(),
      DateLimite: payload.dateLimite,
      Montant: montant,
      TTCouHT: String(payload.ttcOuHt).trim(),
      PieceJointeUrl: piece.url,
      PieceJointeNom: piece.name,
      Fournisseur: String(payload.fournisseur).trim(),
      ContactFournisseur: payload.contactFournisseur ? String(payload.contactFournisseur).trim() : '',
      FournisseurReference: String(payload.fournisseurReference).trim(),
      Complement: payload.complement ? String(payload.complement).trim() : ''
    };

    await appendObjectRow('Demandes', await getHeaders('Demandes'), row);
    await envoyerRecapInitial(appUrl, 'DEPENSE', row);
    return { numeroRequest: numero };
  });
}

// ---------- Soumission : REMBOURSEMENT ----------

export async function submitRemboursement(email, appUrl, payload) {
  const personnel = await requirePersonnel(email);

  const requis = {
    service: 'Service ou discipline', intitule: 'Intitulé de la dépense',
    discussion: 'Discussions / validation préalable', typeDepense: 'Type de dépense',
    dateLimite: 'Date de la dépense', montant: 'Montant',
    fournisseur: 'Nom du fournisseur', fournisseurReference: 'Fournisseur déjà référencé'
  };
  requireFields(payload, requis);
  if (payload.typeDepense === 'Autre' && !String(payload.typeDepenseAutre || '').trim()) {
    badRequest('Merci de préciser le type de dépense.');
  }
  const montant = parseFloat(String(payload.montant).replace(',', '.'));
  if (isNaN(montant) || montant <= 0) badRequest('Le montant est invalide.');

  return withLock('sheet-write', async () => {
    const numero = await getNextRequestNumber('REMBOURSEMENT');
    const piece = await saveAttachment('REMBOURSEMENT', payload.fichier, numero);

    const row = {
      ...creerLigneBase(email, personnel, numero),
      Service: String(payload.service).trim(),
      Intitule: String(payload.intitule).trim(),
      Discussion: String(payload.discussion).trim(),
      TypeDepense: String(payload.typeDepense).trim(),
      TypeDepenseAutre: payload.typeDepenseAutre ? String(payload.typeDepenseAutre).trim() : '',
      DateLimite: payload.dateLimite,
      Montant: montant,
      PieceJointeUrl: piece.url,
      PieceJointeNom: piece.name,
      Fournisseur: String(payload.fournisseur).trim(),
      ContactFournisseur: payload.contactFournisseur ? String(payload.contactFournisseur).trim() : '',
      FournisseurReference: String(payload.fournisseurReference).trim(),
      Complement: payload.complement ? String(payload.complement).trim() : ''
    };

    await appendObjectRow('Demandes_Remboursement', await getHeaders('Demandes_Remboursement'), row);
    await envoyerRecapInitial(appUrl, 'REMBOURSEMENT', row);
    return { numeroRequest: numero };
  });
}

// ---------- Soumission : SALLE ----------
// Seul formulaire accessible SANS connexion (personnes exterieures a
// l'etablissement). Pas d'email de session ni de ConfigPersonnel ici :
// l'identite du demandeur est saisie a la main dans le formulaire.

export async function submitSalle(appUrl, payload) {
  const requis = {
    demandeurNom: 'Nom', demandeurPrenom: 'Prénom', demandeurEmail: 'Email',
    demandeurTelephone: 'Numéro de téléphone', demandeurActivite: 'Activité / fonction',
    intituleFormation: 'Intitulé de la formation', referentNom: 'Nom du référent.e',
    referentTelephone: 'Téléphone du référent.e', referentEmail: 'Email du référent.e',
    horaires: 'Horaires', nombreParticipants: 'Nombre de participants', formateurs: 'Formateur.ices'
  };
  requireFields(payload, requis);

  const dates = Array.isArray(payload.dates) ? payload.dates.filter(Boolean) : [];
  if (!dates.length) badRequest('Merci de renseigner au moins une date.');

  const materiel = Array.isArray(payload.materiel) ? payload.materiel : [];
  if (materiel.includes('Autre') && !String(payload.materielAutre || '').trim()) {
    badRequest('Merci de préciser le matériel "Autre".');
  }
  const nombreParticipants = parseInt(payload.nombreParticipants, 10);
  if (isNaN(nombreParticipants) || nombreParticipants <= 0) badRequest('Le nombre de participants est invalide.');

  return withLock('sheet-write', async () => {
    const numero = await getNextRequestNumber('SALLE');
    const personnel = { nom: String(payload.demandeurNom).trim(), prenom: String(payload.demandeurPrenom).trim() };
    const row = {
      ...creerLigneBase(String(payload.demandeurEmail).trim(), personnel, numero),
      DemandeurTelephone: String(payload.demandeurTelephone).trim(),
      DemandeurActivite: String(payload.demandeurActivite).trim(),
      IntituleFormation: String(payload.intituleFormation).trim(),
      ReferentNom: String(payload.referentNom).trim(),
      ReferentTelephone: String(payload.referentTelephone).trim(),
      ReferentEmail: String(payload.referentEmail).trim(),
      DatesJSON: JSON.stringify(dates),
      Horaires: String(payload.horaires).trim(),
      NombreParticipants: nombreParticipants,
      Formateurs: String(payload.formateurs).trim(),
      MaterielJSON: JSON.stringify(materiel),
      MaterielAutre: payload.materielAutre ? String(payload.materielAutre).trim() : '',
      Commentaire: payload.commentaire ? String(payload.commentaire).trim() : '',
      StatutPronote: ''
    };
    await appendObjectRow('Demandes_Salle', await getHeaders('Demandes_Salle'), row);
    await envoyerRecapInitial(appUrl, 'SALLE', row);
    return { numeroRequest: numero };
  });
}

// ---------- Soumission : SORTIE ----------

export async function submitSortie(email, appUrl, payload) {
  const personnel = await requirePersonnel(email);

  const requis = {
    professeurOrganisateur: 'Professeur.e organisateur.ices', emailOrganisateur: "Email de l'organisateur.ices",
    nomSortie: 'Nom de la sortie', lieuSortie: 'Lieu de la sortie', dateSortie: 'Date de la sortie',
    heureDepart: 'Heure de départ', heureRetour: 'Heure de retour',
    lieuDepart: 'Lieu de départ', lieuRetour: 'Lieu de retour',
    classeGroupe: 'Classe / groupe', nombreEleves: "Nombre d'élèves",
    coursAvant: 'Cours avant la sortie', coursApres: 'Cours après la sortie',
    passCultureAdage: 'Pass Culture / Adage'
  };
  requireFields(payload, requis);
  if (!PASS_CULTURE_ADAGE_OPTIONS.includes(payload.passCultureAdage)) {
    badRequest('Réponse invalide pour "Pass Culture / Adage".');
  }

  // Chaque accompagnateur.ice a ses propres cours a banaliser (deux
  // accompagnateur.ices peuvent avoir des creneaux differents) -- payload.accompagnateurs
  // est donc un tableau de { nom, coursBanalises }, pas juste des noms.
  // Le/la professeur.e organisateur.ices a aussi les siens, a part.
  const codesBanalisables = COURS_BANALISABLES.map(c => c.code);
  const accompagnateurs = Array.isArray(payload.accompagnateurs)
    ? payload.accompagnateurs
        .map(a => ({
          nom: String(a?.nom ?? '').trim(),
          coursBanalises: Array.isArray(a?.coursBanalises) ? a.coursBanalises.filter(c => codesBanalisables.includes(c)) : []
        }))
        .filter(a => a.nom)
    : [];
  if (!accompagnateurs.length) badRequest('Merci de renseigner au moins un accompagnateur.ice.');
  const organisateurCoursBanalises = Array.isArray(payload.organisateurCoursBanalises)
    ? payload.organisateurCoursBanalises.filter(c => codesBanalisables.includes(c)) : [];

  const nbBillet = parseInt(payload.nbBilletEntreeAccompagnateurs, 10) || 0;
  const nbTicket = parseInt(payload.nbTicketTransportAccompagnateurs, 10) || 0;
  if (nbBillet > 0 && !String(payload.coutBilletEntreeAccompagnateurs ?? '').trim()) {
    badRequest("Merci de préciser le coût individuel du billet d'entrée.");
  }
  if (nbTicket > 0 && !String(payload.coutTicketTransportAccompagnateurs ?? '').trim()) {
    badRequest('Merci de préciser le coût individuel du ticket de transport.');
  }
  const nombreEleves = parseInt(payload.nombreEleves, 10);
  if (isNaN(nombreEleves) || nombreEleves <= 0) badRequest("Le nombre d'élèves est invalide.");
  // Des qu'un nombre d'eleves est indique, les couts individuels (comme pour
  // les accompagnateurs) sont obligatoires.
  if (!String(payload.coutBilletEntreeEleves ?? '').trim()) {
    badRequest("Merci de préciser le coût individuel du billet d'entrée pour les élèves.");
  }
  if (!String(payload.coutTicketTransportEleves ?? '').trim()) {
    badRequest('Merci de préciser le coût individuel du ticket de transport pour les élèves.');
  }

  return withLock('sheet-write', async () => {
    const numero = await getNextRequestNumber('SORTIE');
    const row = {
      ...creerLigneBase(email, personnel, numero),
      ProfesseurOrganisateur: String(payload.professeurOrganisateur).trim(),
      EmailOrganisateur: String(payload.emailOrganisateur).trim(),
      OrganisateurCoursBanalises: organisateurCoursBanalises.join(','),
      NomSortie: String(payload.nomSortie).trim(),
      LieuSortie: String(payload.lieuSortie).trim(),
      DateSortie: payload.dateSortie,
      HeureDepart: String(payload.heureDepart).trim(),
      HeureRetour: String(payload.heureRetour).trim(),
      LieuDepart: String(payload.lieuDepart).trim(),
      LieuRetour: String(payload.lieuRetour).trim(),
      AccompagnateursJSON: JSON.stringify(accompagnateurs),
      NbBilletEntreeAccompagnateurs: nbBillet,
      CoutBilletEntreeAccompagnateurs: nbBillet > 0 ? parseFloat(String(payload.coutBilletEntreeAccompagnateurs).replace(',', '.')) : 0,
      NbTicketTransportAccompagnateurs: nbTicket,
      CoutTicketTransportAccompagnateurs: nbTicket > 0 ? parseFloat(String(payload.coutTicketTransportAccompagnateurs).replace(',', '.')) : 0,
      ClasseGroupe: String(payload.classeGroupe).trim(),
      NombreEleves: nombreEleves,
      CoutBilletEntreeEleves: parseFloat(String(payload.coutBilletEntreeEleves).replace(',', '.')),
      CoutTicketTransportEleves: parseFloat(String(payload.coutTicketTransportEleves).replace(',', '.')),
      CoursAvant: String(payload.coursAvant).trim(),
      CoursApres: String(payload.coursApres).trim(),
      AutreTransportCout: payload.autreTransportCout ? parseFloat(String(payload.autreTransportCout).replace(',', '.')) : 0,
      PassCultureAdage: payload.passCultureAdage,
      PdfUrl: ''
    };
    await appendObjectRow('Demandes_Sortie', await getHeaders('Demandes_Sortie'), row);
    await envoyerRecapInitial(appUrl, 'SORTIE', row);
    return { numeroRequest: numero };
  });
}

// ---------- Soumission : INTERVENANT ----------

export async function submitIntervenant(email, appUrl, payload) {
  const personnel = await requirePersonnel(email);

  const requis = {
    intervenantNom: "Nom de l'intervenant.e", intervenantEmail: "Email de l'intervenant.e",
    intervenantTelephone: "Téléphone de l'intervenant.e", intervenantActivite: "Activité / fonction de l'intervenant.e",
    intervenantStructure: "Structure / entreprise / association", coutIntervention: "Coût de l'intervention",
    objectifs: "Objectifs de l'intervention"
  };
  requireFields(payload, requis);

  const classes = Array.isArray(payload.classes) ? payload.classes.map(c => String(c).trim()).filter(Boolean) : [];
  if (!classes.length) badRequest('Merci de renseigner au moins une classe concernée.');

  const sessions = Array.isArray(payload.sessions)
    ? payload.sessions.filter(s => s && s.date && s.heure && s.salle)
    : [];
  if (!sessions.length) badRequest('Merci de renseigner au moins une séance (date, heure, salle).');

  const cout = parseFloat(String(payload.coutIntervention).replace(',', '.'));
  if (isNaN(cout) || cout < 0) badRequest("Le coût de l'intervention est invalide.");

  return withLock('sheet-write', async () => {
    const numero = await getNextRequestNumber('INTERVENANT');
    const row = {
      ...creerLigneBase(email, personnel, numero),
      ClassesJSON: JSON.stringify(classes),
      SessionsJSON: JSON.stringify(sessions),
      IntervenantNom: String(payload.intervenantNom).trim(),
      IntervenantEmail: String(payload.intervenantEmail).trim(),
      IntervenantTelephone: String(payload.intervenantTelephone).trim(),
      IntervenantActivite: String(payload.intervenantActivite).trim(),
      IntervenantStructure: String(payload.intervenantStructure).trim(),
      CoutIntervention: cout,
      Objectifs: String(payload.objectifs).trim(),
      Commentaire: payload.commentaire ? String(payload.commentaire).trim() : ''
    };
    await appendObjectRow('Demandes_Intervenant', await getHeaders('Demandes_Intervenant'), row);
    await envoyerRecapInitial(appUrl, 'INTERVENANT', row);
    return { numeroRequest: numero };
  });
}

// ---------- Décision (proviseur), générique pour tous les types ----------

export async function getDemandeForDecision(directeurEmail, type, id) {
  await requireDirecteur(directeurEmail);
  const cfg = TYPES[type];
  if (!cfg) badRequest('Type de demande inconnu.');
  const found = await findRowById(cfg.sheet, id);
  if (!found) notFound('Demande introuvable.');
  const row = found.row;
  return {
    libelle: cfg.libelleCap,
    numeroRequest: row.NumeroRequest,
    statut: row.Statut,
    peutTraiter: row.Statut === STATUT_ATTENTE,
    precisionDejaDemandee: row.PrecisionDejaDemandee === true || row.PrecisionDejaDemandee === 'true' || row.PrecisionDejaDemandee === 'TRUE',
    recap: RECAP_BUILDERS[type](row),
    pieceJointe: row.PieceJointeUrl ? { url: row.PieceJointeUrl, name: row.PieceJointeNom } : null,
    documentGenere: row.PdfUrl ? { url: row.PdfUrl, name: 'Document généré' } : null,
    precisionApportee: row.PrecisionApportee || '',
    commentaireDirecteur: row.CommentaireDirecteur || '',
    dateDecision: row.DateDecision ? formatDateTimeFr(row.DateDecision) : ''
  };
}

async function genererPdfSortie(row) {
  let logoDataUri = '';
  if (config.logoFileId) {
    try {
      const { mimeType, buffer } = await getDriveFile(config.logoFileId);
      logoDataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.error('Logo introuvable pour le PDF de sortie : ' + err.message);
    }
  }
  const html = buildSortiePdfHtml(row, logoDataUri);
  const pdfBuffer = await htmlToPdfBuffer(html);
  const folderId = await getAttachmentFolderId('SORTIE', 'Sorties pédagogiques - PDF validés');
  const safeName = `${row.NumeroRequest} - ${row.NomSortie}.pdf`.replace(/[\\/:*?"<>|]/g, '_');
  const uploaded = await uploadFile(folderId, safeName, 'application/pdf', pdfBuffer);
  return uploaded.url;
}

export async function traiterDecision(directeurEmail, appUrl, type, id, action, commentaire, statutPronote) {
  await requireDirecteur(directeurEmail);
  const cfg = TYPES[type];
  if (!cfg) badRequest('Type de demande inconnu.');

  return withLock('sheet-write', async () => {
    const found = await findRowById(cfg.sheet, id);
    if (!found) notFound('Demande introuvable.');
    const { headers, row, rowNumber } = found;

    if (row.Statut !== STATUT_ATTENTE) {
      badRequest(`Cette demande a déjà été traitée (statut actuel : ${row.Statut}).`);
    }

    const now = new Date();
    commentaire = commentaire ? String(commentaire).trim() : '';

    if (action === 'accepter') {
      if (type === 'SALLE') {
        statutPronote = statutPronote ? String(statutPronote).trim() : '';
        if (!STATUT_PRONOTE_OPTIONS.includes(statutPronote)) {
          badRequest('Merci d\'indiquer le statut Pronote de la réservation.');
        }
        row.StatutPronote = statutPronote;
      }
      row.Statut = STATUT_VALIDEE;
      row.CommentaireDirecteur = commentaire;
      row.DateDecision = now;
      row.TraitePar = directeurEmail;
      if (type === 'SORTIE') {
        try {
          row.PdfUrl = await genererPdfSortie(row);
        } catch (genErr) {
          console.error(`Erreur génération PDF sortie ${row.NumeroRequest} : ${genErr.message}`);
        }
      }
      await updateRow(cfg.sheet, rowNumber, headers, row);
      try {
        const [tiers, directeur] = await Promise.all([destinatairesValidation(type), getDestinataire('directeur')]);
        await sendDecisionValidee(type, row, tiers, directeur);
      } catch (mailErr) {
        console.error(`Décision enregistrée mais erreur envoi email : ${mailErr.message}`);
      }
      return 'OK';
    }

    if (action === 'refuser') {
      if (!commentaire) badRequest("Merci d'indiquer le motif du refus.");
      row.Statut = STATUT_REFUSEE;
      row.CommentaireDirecteur = commentaire;
      row.DateDecision = now;
      row.TraitePar = directeurEmail;
      await updateRow(cfg.sheet, rowNumber, headers, row);
      try { await sendDecisionRefusee(type, row); } catch (mailErr) { console.error(`Décision enregistrée mais erreur envoi email : ${mailErr.message}`); }
      return 'OK';
    }

    if (action === 'preciser') {
      const dejaDemandee = row.PrecisionDejaDemandee === true || row.PrecisionDejaDemandee === 'true' || row.PrecisionDejaDemandee === 'TRUE';
      if (dejaDemandee) badRequest('Des précisions ont déjà été demandées pour cette demande : seules Accepter/Refuser sont possibles.');
      if (!commentaire) badRequest('Merci de préciser ce qui est attendu.');
      row.Statut = STATUT_PRECISION;
      row.PrecisionDejaDemandee = true;
      row.CommentaireDirecteur = commentaire;
      row.DateDecision = now;
      row.TraitePar = directeurEmail;
      await updateRow(cfg.sheet, rowNumber, headers, row);
      try { await sendDemandePrecision(type, row, appUrl); } catch (mailErr) { console.error(`Décision enregistrée mais erreur envoi email : ${mailErr.message}`); }
      return 'OK';
    }

    badRequest('Action inconnue : ' + action);
  });
}

// ---------- Précision (demandeur), générique pour tous les types ----------

export async function getDemandeForPrecision(email, type, id) {
  const cfg = TYPES[type];
  if (!cfg) badRequest('Type de demande inconnu.');
  const found = await findRowById(cfg.sheet, id);
  if (!found) notFound('Demande introuvable.');
  const row = found.row;
  if (!email || String(row.Email).trim().toLowerCase() !== email.trim().toLowerCase()) {
    const err = new Error("Cette page est réservée à l'auteur de la demande.");
    err.status = 403;
    throw err;
  }
  if (row.Statut !== STATUT_PRECISION) {
    badRequest(`Aucune précision n'est attendue pour cette demande actuellement (statut : ${row.Statut}).`);
  }
  return {
    libelle: cfg.libelleCap,
    numeroRequest: row.NumeroRequest,
    recap: RECAP_BUILDERS[type](row),
    pieceJointe: row.PieceJointeUrl ? { url: row.PieceJointeUrl, name: row.PieceJointeNom } : null,
    commentaireDirecteur: row.CommentaireDirecteur || ''
  };
}

export async function soumettrePrecision(email, appUrl, type, id, texte) {
  const cfg = TYPES[type];
  if (!cfg) badRequest('Type de demande inconnu.');

  return withLock('sheet-write', async () => {
    const found = await findRowById(cfg.sheet, id);
    if (!found) notFound('Demande introuvable.');
    const { headers, row, rowNumber } = found;
    if (!email || String(row.Email).trim().toLowerCase() !== email.trim().toLowerCase()) {
      const err = new Error("Cette page est réservée à l'auteur de la demande.");
      err.status = 403;
      throw err;
    }
    if (row.Statut !== STATUT_PRECISION) {
      badRequest("Aucune précision n'est attendue pour cette demande actuellement.");
    }
    texte = texte ? String(texte).trim() : '';
    if (!texte) badRequest('Merci de renseigner votre réponse.');

    row.PrecisionApportee = texte;
    row.Statut = STATUT_ATTENTE;
    await updateRow(cfg.sheet, rowNumber, headers, row);
    try {
      const directeur = await getDestinataire('directeur');
      await sendPrecisionApportee(type, row, appUrl, directeur);
    } catch (mailErr) {
      console.error(`Précisions enregistrées mais erreur envoi email : ${mailErr.message}`);
    }
    return 'OK';
  });
}

// ---------- Installation initiale ----------

export async function setupSheets() {
  for (const type of Object.keys(TYPES)) {
    const cfg = TYPES[type];
    if (!(await sheetExists(cfg.sheet))) {
      await createSheet(cfg.sheet, cfg.columns);
    } else {
      // Feuille déjà existante (créée avant l'ajout de nouvelles colonnes,
      // ex: coûts élèves de Sortie) : on rattrape les colonnes manquantes
      // plutôt que de les perdre silencieusement à l'écriture.
      await ensureColumns(cfg.sheet, cfg.columns);
    }
  }
  if (!(await sheetExists('ConfigPersonnel'))) {
    await createSheet('ConfigPersonnel', ['Email', 'Nom', 'Prenom']);
  }
  if (!(await sheetExists('ConfigTypeDepense'))) {
    await createSheet('ConfigTypeDepense', ['TypeDepense']);
  }
  if (!(await sheetExists('ConfigDestinataires'))) {
    await createSheet('ConfigDestinataires', ['Cle', 'Valeur']);
    for (const cle of ['intendance', 'gestionnaire', 'secretariat', 'direction', 'directeur']) {
      await appendObjectRow('ConfigDestinataires', ['Cle', 'Valeur'], { Cle: cle, Valeur: '' });
    }
  } else {
    // Ajoute la cle si le tableur existe deja mais ne l'a pas encore.
    const { rows } = await readSheetAsObjects('ConfigDestinataires');
    const existant = rows.map(r => String(r.Cle || '').trim().toLowerCase());
    if (!existant.includes('direction')) {
      await appendObjectRow('ConfigDestinataires', ['Cle', 'Valeur'], { Cle: 'direction', Valeur: '' });
    }
  }
  if (!(await sheetExists('Compteurs'))) {
    await createSheet('Compteurs', ['Type', 'Dernier']);
    for (const type of Object.keys(TYPES)) {
      await appendObjectRow('Compteurs', ['Type', 'Dernier'], { Type: type, Dernier: 0 });
    }
  }
  console.log('Feuilles prêtes. Pensez à compléter ConfigPersonnel, ConfigTypeDepense et ConfigDestinataires.');
}

export function clearConfigCache() {
  cacheDel('typesDepense');
}

// ---------- Utilitaires internes ----------

function requireFields(payload, requis) {
  for (const k of Object.keys(requis)) {
    if (payload[k] === undefined || payload[k] === null || String(payload[k]).trim() === '') {
      badRequest(`Le champ "${requis[k]}" est obligatoire.`);
    }
  }
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  throw err;
}

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  throw err;
}
