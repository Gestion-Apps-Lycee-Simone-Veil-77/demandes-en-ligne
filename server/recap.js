// Récapitulatifs par type de demande -- utilisés à la fois pour les emails et
// pour les pages Décision/Précision. Chaque fonction renvoie un tableau de
// { label, value } en texte brut (jamais de HTML) : chaque consommateur
// (email, JSON renvoyé au client) l'échappe/l'affiche à sa manière.
import { formatDateFr, formatDateTimeFr, formatHeureFr, formatMontant, safeJsonParse } from './util.js';

export function buildRecapDepense(row) {
  return [
    { label: 'N° de demande', value: row.NumeroRequest },
    { label: 'Date de saisie', value: formatDateTimeFr(row.DateSaisie) },
    { label: 'Demandeur', value: `${row.Prenom} ${row.Nom} (${row.Email})` },
    { label: 'Service / discipline', value: row.Service },
    { label: 'Intitulé et objectif de la dépense', value: row.Intitule },
    { label: 'Discussions / validation préalable', value: row.Discussion },
    { label: 'Type de dépense', value: row.TypeDepense },
    { label: 'Délai souhaité', value: formatDateFr(row.DateLimite) },
    { label: 'Montant', value: `${formatMontant(row.Montant)} € ${row.TTCouHT}` },
    { label: 'Fournisseur / prestataire', value: row.Fournisseur },
    { label: 'Contact chez le fournisseur', value: row.ContactFournisseur || '—' },
    { label: 'Fournisseur déjà référencé ?', value: row.FournisseurReference },
    { label: "Complément d'information", value: row.Complement || '—' }
  ];
}

export function buildRecapRemboursement(row) {
  const type = row.TypeDepense === 'Autre' && row.TypeDepenseAutre ? `Autre : ${row.TypeDepenseAutre}` : row.TypeDepense;
  return [
    { label: 'N° de demande', value: row.NumeroRequest },
    { label: 'Date de saisie', value: formatDateTimeFr(row.DateSaisie) },
    { label: 'Demandeur', value: `${row.Prenom} ${row.Nom} (${row.Email})` },
    { label: 'Service / discipline', value: row.Service },
    { label: 'Intitulé de la dépense avancée', value: row.Intitule },
    { label: 'Discussions / validation préalable', value: row.Discussion },
    { label: 'Type de dépense', value: type },
    { label: 'Date de la dépense', value: formatDateFr(row.DateLimite) },
    { label: 'Montant', value: `${formatMontant(row.Montant)} €` },
    { label: 'Fournisseur / prestataire', value: row.Fournisseur },
    { label: 'Contact chez le fournisseur', value: row.ContactFournisseur || '—' },
    { label: 'Fournisseur déjà référencé ?', value: row.FournisseurReference },
    { label: "Complément d'information", value: row.Complement || '—' }
  ];
}

export function buildRecapSalle(row) {
  const dates = safeJsonParse(row.DatesJSON, []).map(formatDateFr).join(', ');
  const materielListe = safeJsonParse(row.MaterielJSON, []);
  const materielTxt = materielListe.length
    ? materielListe.map(m => (m === 'Autre' && row.MaterielAutre) ? `Autre : ${row.MaterielAutre}` : m).join(', ')
    : '—';
  return [
    { label: 'N° de demande', value: row.NumeroRequest },
    { label: 'Date de saisie', value: formatDateTimeFr(row.DateSaisie) },
    { label: 'Demandeur', value: `${row.Prenom} ${row.Nom} (${row.Email})` },
    { label: 'Téléphone du demandeur', value: row.DemandeurTelephone },
    { label: 'Activité / fonction du demandeur', value: row.DemandeurActivite },
    { label: 'Intitulé de la formation', value: row.IntituleFormation },
    { label: 'Référent de la formation', value: row.ReferentNom },
    { label: 'Téléphone du référent', value: row.ReferentTelephone },
    { label: 'Email du référent', value: row.ReferentEmail },
    { label: 'Date(s)', value: dates || '—' },
    { label: 'Horaires', value: row.Horaires },
    { label: 'Nombre de participants / stagiaires', value: row.NombreParticipants },
    { label: 'Formateur(s) - Fonction', value: row.Formateurs },
    { label: 'Matériel nécessaire', value: materielTxt },
    { label: 'Commentaire', value: row.Commentaire || '—' },
    { label: 'Statut Pronote', value: row.StatutPronote || '—' }
  ];
}

export function buildRecapSortie(row) {
  const accompagnateurs = safeJsonParse(row.AccompagnateursJSON, []);
  return [
    { label: 'N° de demande', value: row.NumeroRequest },
    { label: 'Date de saisie', value: formatDateTimeFr(row.DateSaisie) },
    { label: 'Demandeur (compte connecté)', value: `${row.Prenom} ${row.Nom} (${row.Email})` },
    { label: 'Professeur organisateur', value: row.ProfesseurOrganisateur },
    { label: "Email de l'organisateur", value: row.EmailOrganisateur },
    { label: 'Nom de la sortie', value: row.NomSortie },
    { label: 'Lieu de la sortie', value: row.LieuSortie },
    { label: 'Date de la sortie', value: formatDateFr(row.DateSortie) },
    { label: 'Heure de départ', value: formatHeureFr(row.HeureDepart) },
    { label: 'Heure de retour', value: formatHeureFr(row.HeureRetour) },
    { label: 'Lieu de départ', value: row.LieuDepart },
    { label: 'Lieu de retour', value: row.LieuRetour },
    { label: 'Accompagnateurs', value: accompagnateurs.length ? accompagnateurs.join(', ') : '—' },
    { label: "Billets d'entrée accompagnateurs — nombre", value: row.NbBilletEntreeAccompagnateurs },
    { label: "Billets d'entrée accompagnateurs — coût individuel", value: row.CoutBilletEntreeAccompagnateurs ? `${formatMontant(row.CoutBilletEntreeAccompagnateurs)} €` : '—' },
    { label: 'Tickets de transport accompagnateurs — nombre', value: row.NbTicketTransportAccompagnateurs },
    { label: 'Tickets de transport accompagnateurs — coût individuel', value: row.CoutTicketTransportAccompagnateurs ? `${formatMontant(row.CoutTicketTransportAccompagnateurs)} €` : '—' },
    { label: 'Classe / groupe', value: row.ClasseGroupe },
    { label: "Nombre d'élèves", value: row.NombreEleves },
    { label: "Élèves — coût individuel billet d'entrée", value: row.CoutBilletEntreeEleves ? `${formatMontant(row.CoutBilletEntreeEleves)} €` : '—' },
    { label: 'Élèves — coût individuel ticket de transport', value: row.CoutTicketTransportEleves ? `${formatMontant(row.CoutTicketTransportEleves)} €` : '—' },
    { label: 'Cours maintenu avant la sortie ?', value: row.CoursAvant },
    { label: 'Cours maintenu après la sortie ?', value: row.CoursApres },
    { label: 'Coût individuel autre moyen de transport', value: row.AutreTransportCout ? `${formatMontant(row.AutreTransportCout)} €` : '—' }
  ];
}

export function buildRecapIntervenant(row) {
  const classes = safeJsonParse(row.ClassesJSON, []);
  const sessions = safeJsonParse(row.SessionsJSON, []);
  const sessionsTxt = sessions.length
    ? sessions.map(s => `${formatDateFr(s.date)} ${s.heure || ''} — ${s.salle || ''}`.trim()).join(' ; ')
    : '—';
  return [
    { label: 'N° de demande', value: row.NumeroRequest },
    { label: 'Date de saisie', value: formatDateTimeFr(row.DateSaisie) },
    { label: 'Demandeur', value: `${row.Prenom} ${row.Nom} (${row.Email})` },
    { label: 'Classes concernées', value: classes.length ? classes.join(', ') : '—' },
    { label: 'Séances (date — heure — salle)', value: sessionsTxt },
    { label: "Nom de l'intervenant", value: row.IntervenantNom },
    { label: "Email de l'intervenant", value: row.IntervenantEmail },
    { label: "Téléphone de l'intervenant", value: row.IntervenantTelephone },
    { label: "Activité / fonction de l'intervenant", value: row.IntervenantActivite },
    { label: "Structure / entreprise / association", value: row.IntervenantStructure },
    { label: "Coût de l'intervention", value: `${formatMontant(row.CoutIntervention)} €` },
    { label: "Objectifs de l'intervention", value: row.Objectifs },
    { label: 'Commentaire', value: row.Commentaire || '—' }
  ];
}

export const RECAP_BUILDERS = {
  DEPENSE: buildRecapDepense,
  REMBOURSEMENT: buildRecapRemboursement,
  SALLE: buildRecapSalle,
  SORTIE: buildRecapSortie,
  INTERVENANT: buildRecapIntervenant
};
