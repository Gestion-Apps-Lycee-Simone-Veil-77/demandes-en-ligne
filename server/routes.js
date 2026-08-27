import { Router } from 'express';
import { requireAuth } from './auth.js';
import { config } from './config.js';
import { getDriveFile } from './drive.js';
import {
  getPersonnelInfo,
  getFormBootstrapDepense, getFormBootstrapRemboursement, getFormBootstrapSortie, getFormBootstrapIntervenant,
  submitDepense, submitRemboursement, submitSalle, submitSortie, submitIntervenant,
  getDemandeForDecision, traiterDecision, getDemandeForPrecision, soumettrePrecision,
  requireDirecteur
} from './service.js';

export const router = Router();

function wrap(handler) {
  return async (req, res) => {
    try {
      res.json(await handler(req));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

// URL publique de l'appli, utilisée pour les liens de décision/précision
// dans les emails. Priorité à config.publicUrl (APP_PUBLIC_URL) si définie
// -- indispensable en dev local, où le frontend (Vite) et l'API (Express)
// tournent sur deux ports différents (voir config.js). Sinon, déduite de la
// requête -- valable en prod (un seul serveur derrière Render, qui a besoin
// de app.set('trust proxy', 1) côté index.js pour refléter le https).
function appUrl(req) {
  return config.publicUrl || `${req.protocol}://${req.get('host')}`;
}

// ---------------------------------------------------------------
// Routes PUBLIQUES (pas d'auth), déclarées AVANT router.use(requireAuth())
// ci-dessous, qui protège tout le reste de /api/*.
// ---------------------------------------------------------------

// Une balise <img> ne peut pas envoyer d'en-tête Authorization, et un logo
// n'a rien de sensible.
router.get('/logo', async (req, res) => {
  if (!config.logoFileId) return res.status(404).end();
  try {
    const { mimeType, buffer } = await getDriveFile(config.logoFileId);
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=21600');
    res.send(buffer);
  } catch (err) {
    console.error('Logo introuvable :', err.message);
    res.status(404).end();
  }
});

// Seul formulaire accessible sans connexion (personnes extérieures à
// l'établissement) : l'identité est saisie à la main dans le formulaire,
// vérifiée côté service.js (champs obligatoires), pas via un compte Google.
router.post('/submit/salle', wrap(req => submitSalle(appUrl(req), req.body)));

// Toutes les routes /api/* suivantes exigent un jeton Google valide (voir server/auth.js).
router.use(requireAuth());

// ---------- Identité ----------
router.get('/me', wrap(async req => {
  const personnel = await getPersonnelInfo(req.userEmail);
  const directeur = await requireDirecteur(req.userEmail).then(() => true).catch(() => false);
  return { email: req.userEmail, nom: personnel?.nom || null, prenom: personnel?.prenom || null, isDirecteur: directeur };
}));

// ---------- Bootstrap formulaires ----------
router.get('/bootstrap/depense', wrap(req => getFormBootstrapDepense(req.userEmail)));
router.get('/bootstrap/remboursement', wrap(req => getFormBootstrapRemboursement(req.userEmail)));
router.get('/bootstrap/sortie', wrap(req => getFormBootstrapSortie(req.userEmail)));
router.get('/bootstrap/intervenant', wrap(req => getFormBootstrapIntervenant(req.userEmail)));

// ---------- Soumissions (authentifiées -- Salle est publique, voir plus haut) ----------
router.post('/submit/depense', wrap(req => submitDepense(req.userEmail, appUrl(req), req.body)));
router.post('/submit/remboursement', wrap(req => submitRemboursement(req.userEmail, appUrl(req), req.body)));
router.post('/submit/sortie', wrap(req => submitSortie(req.userEmail, appUrl(req), req.body)));
router.post('/submit/intervenant', wrap(req => submitIntervenant(req.userEmail, appUrl(req), req.body)));

// ---------- Décision (proviseur) ----------
router.get('/decision/:type/:id', wrap(req => getDemandeForDecision(req.userEmail, req.params.type.toUpperCase(), req.params.id)));
router.post('/decision/:type/:id', wrap(req =>
  traiterDecision(req.userEmail, appUrl(req), req.params.type.toUpperCase(), req.params.id, req.body.action, req.body.commentaire, req.body.statutPronote)
));

// ---------- Précision (demandeur) ----------
router.get('/precision/:type/:id', wrap(req => getDemandeForPrecision(req.userEmail, req.params.type.toUpperCase(), req.params.id)));
router.post('/precision/:type/:id', wrap(req =>
  soumettrePrecision(req.userEmail, appUrl(req), req.params.type.toUpperCase(), req.params.id, req.body.texte)
));
