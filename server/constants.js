// Reprend la structure de donnees de la version Apps Script, pour pouvoir
// reutiliser la meme feuille Google Sheets sans la restructurer.

export const ETABLISSEMENT_NOM = 'Lycee Simone Veil';
export const ETABLISSEMENT_SITE_CASSIN = '1 avenue Pierre Mendes France, 77186 Noisiel';
export const ETABLISSEMENT_SITE_NERVAL = '89 cours des Roches, 77186 Noisiel';
export const ETABLISSEMENT_TELEPHONE = '01 60 37 53 00';
export const ETABLISSEMENT_EMAIL = 'ce.0771940r@ac-creteil.fr';
export const ETABLISSEMENT_SITE_WEB = 'https://lyceesimoneveil.fr/';
export const CONTACT_PHOTOS_SORTIE = 'stephane.leger@ac-creteil.fr';

export const MAX_FILE_MB = 8;

export const STATUT_ATTENTE = 'En attente';
export const STATUT_VALIDEE = 'Validée';
export const STATUT_REFUSEE = 'Refusée';
export const STATUT_PRECISION = 'Précision demandée';

export const STATUT_COULEURS = {
  [STATUT_ATTENTE]: '#f9ab00',
  [STATUT_VALIDEE]: '#34a853',
  [STATUT_REFUSEE]: '#ea4335',
  [STATUT_PRECISION]: '#1a73e8'
};

export const TYPE_REMBOURSEMENT_OPTIONS = ['Achat matériel', 'Achat numérique', 'Formation', 'Prestation/service', 'Sortie', 'Voyage', 'Autre'];
export const STATUT_PRONOTE_OPTIONS = ['Déjà saisie dans Pronote', 'À saisir dans Pronote'];
export const PASS_CULTURE_ADAGE_OPTIONS = ['Oui', 'Non', 'Je ne sais pas encore'];

// Creneaux horaires de l'etablissement, pour les cours a banaliser d'une
// sortie (voir FormSortie.jsx / sortiePdf.js). Le code (ex: "M1") est ce qui
// est stocke dans la feuille (colonne CoursBanalises, liste separee par
// virgules) ; l'horaire n'est que du texte d'affichage.
export const COURS_BANALISABLES = [
  { code: 'M1', horaire: '8h-9h' },
  { code: 'M2', horaire: '9h-10h10' },
  { code: 'M3', horaire: '10h10-11h10' },
  { code: 'M4', horaire: '11h10-12h10' },
  { code: 'M5', horaire: '12h10-13h10' },
  { code: 'S1', horaire: '13h10-14h10' },
  { code: 'S2', horaire: '14h10-15h20' },
  { code: 'S3', horaire: '15h20-16h20' },
  { code: 'S4', horaire: '16h20-17h20' },
  { code: 'S5', horaire: '17h20-18h15' }
];

export const DEPENSE_COLUMNS = [
  'ID', 'NumeroRequest', 'DateSaisie', 'Email', 'Nom', 'Prenom',
  'Service', 'Intitule', 'Discussion', 'TypeDepense', 'DateLimite',
  'Montant', 'TTCouHT', 'PieceJointeUrl', 'PieceJointeNom',
  'Fournisseur', 'ContactFournisseur', 'FournisseurReference', 'Complement',
  'Statut', 'PrecisionDejaDemandee', 'CommentaireDirecteur',
  'PrecisionApportee', 'DateDecision', 'TraitePar'
];

export const REMBOURSEMENT_COLUMNS = [
  'ID', 'NumeroRequest', 'DateSaisie', 'Email', 'Nom', 'Prenom',
  'Service', 'Intitule', 'Discussion', 'TypeDepense', 'TypeDepenseAutre', 'DateLimite', 'Montant',
  'PieceJointeUrl', 'PieceJointeNom',
  'Fournisseur', 'ContactFournisseur', 'FournisseurReference', 'Complement',
  'Statut', 'PrecisionDejaDemandee', 'CommentaireDirecteur',
  'PrecisionApportee', 'DateDecision', 'TraitePar'
];

// Pas de connexion requise pour ce formulaire (public, personnes exterieures) :
// Email/Nom/Prenom (colonnes communes) sont remplis a la main par le demandeur,
// pas resolus via ConfigPersonnel -- d'ou DemandeurTelephone/DemandeurActivite
// en plus, qui n'existent pour aucun autre type.
export const SALLE_COLUMNS = [
  'ID', 'NumeroRequest', 'DateSaisie', 'Email', 'Nom', 'Prenom',
  'DemandeurTelephone', 'DemandeurActivite',
  'IntituleFormation', 'ReferentNom', 'ReferentTelephone', 'ReferentEmail',
  'DatesJSON', 'Horaires', 'NombreParticipants', 'Formateurs', 'MaterielJSON', 'MaterielAutre', 'Commentaire',
  'Statut', 'PrecisionDejaDemandee', 'CommentaireDirecteur',
  'PrecisionApportee', 'DateDecision', 'TraitePar', 'StatutPronote'
];

export const SORTIE_COLUMNS = [
  'ID', 'NumeroRequest', 'DateSaisie', 'Email', 'Nom', 'Prenom',
  'ProfesseurOrganisateur', 'EmailOrganisateur', 'OrganisateurCoursBanalises', 'NomSortie', 'LieuSortie', 'DateSortie',
  'HeureDepart', 'HeureRetour', 'LieuDepart', 'LieuRetour', 'AccompagnateursJSON',
  'NbBilletEntreeAccompagnateurs', 'CoutBilletEntreeAccompagnateurs',
  'NbTicketTransportAccompagnateurs', 'CoutTicketTransportAccompagnateurs',
  'ClasseGroupe', 'NombreEleves', 'CoutBilletEntreeEleves', 'CoutTicketTransportEleves',
  'CoursAvant', 'CoursApres', 'AutreTransportCout', 'PassCultureAdage',
  'Statut', 'PrecisionDejaDemandee', 'CommentaireDirecteur',
  'PrecisionApportee', 'DateDecision', 'TraitePar', 'PdfUrl'
];

export const INTERVENANT_COLUMNS = [
  'ID', 'NumeroRequest', 'DateSaisie', 'Email', 'Nom', 'Prenom',
  'ClassesJSON', 'SessionsJSON',
  'IntervenantNom', 'IntervenantEmail', 'IntervenantTelephone', 'IntervenantActivite', 'IntervenantStructure',
  'CoutIntervention', 'Objectifs', 'Commentaire',
  'Statut', 'PrecisionDejaDemandee', 'CommentaireDirecteur',
  'PrecisionApportee', 'DateDecision', 'TraitePar'
];

// Registre des types de demande -- point d'entree unique pour ajouter un futur
// formulaire similaire (numero de demande, feuille, mails, workflow de
// decision : tout est partage automatiquement par service.js).
export const TYPES = {
  DEPENSE: {
    prefix: 'DEP',
    sheet: 'Demandes',
    libelle: 'demande de dépense',
    libelleCap: 'Demande de dépense',
    columns: DEPENSE_COLUMNS,
    folderName: 'Justificatifs - Demandes de dépenses'
  },
  REMBOURSEMENT: {
    prefix: 'REMB',
    sheet: 'Demandes_Remboursement',
    libelle: 'demande de remboursement',
    libelleCap: 'Demande de remboursement',
    columns: REMBOURSEMENT_COLUMNS,
    folderName: 'Remboursements de frais' // sous-dossier, cree a l'interieur du dossier DEPENSE
  },
  SALLE: {
    prefix: 'SALLE',
    sheet: 'Demandes_Salle',
    libelle: 'réservation de salle',
    libelleCap: 'Réservation de salle',
    columns: SALLE_COLUMNS,
    public: true // accessible sans connexion (voir routes.js / service.js)
  },
  SORTIE: {
    prefix: 'SORTIE',
    sheet: 'Demandes_Sortie',
    libelle: 'sortie pédagogique',
    libelleCap: 'Sortie pédagogique',
    columns: SORTIE_COLUMNS
  },
  INTERVENANT: {
    prefix: 'INTERV',
    sheet: 'Demandes_Intervenant',
    libelle: "demande d'accueil d'intervenant extérieur",
    libelleCap: "Accueil d'intervenant extérieur",
    columns: INTERVENANT_COLUMNS
  }
};

// Roles notifies UNIQUEMENT quand une demande est validee (jamais a la
// soumission, jamais sur refus/precision -- seuls le createur et le directeur
// le sont a ces etapes, voir service.js). Cles = ConfigDestinataires.
export const VALIDATION_TIERS = {
  DEPENSE: ['intendance', 'gestionnaire'],
  REMBOURSEMENT: ['intendance', 'gestionnaire'],
  SALLE: ['secretariat', 'direction'],
  SORTIE: ['secretariat', 'direction'],
  INTERVENANT: ['secretariat', 'direction']
};
