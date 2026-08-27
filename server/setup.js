// À exécuter une seule fois avant la première utilisation : "npm run setup"
// Crée les onglets manquants sur la feuille (Demandes, Demandes_Remboursement,
// Demandes_Salle, Demandes_Sortie, ConfigPersonnel, ConfigTypeDepense,
// ConfigDestinataires, Compteurs).
import { setupSheets } from './service.js';

setupSheets()
  .then(() => {
    console.log('OK — pensez à remplir manuellement ConfigPersonnel, ConfigTypeDepense et ConfigDestinataires.');
    process.exit(0);
  })
  .catch(err => {
    console.error("Échec de l'installation :", err);
    process.exit(1);
  });
