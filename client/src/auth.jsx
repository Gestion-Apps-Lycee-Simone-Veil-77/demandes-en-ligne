import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext(null);

// Vrai seulement une fois google.accounts.id.initialize() effectivement
// appelé (pas juste une fois le script chargé -- voir renderButton
// ci-dessous). Variable de module plutôt qu'un state : un seul AuthProvider
// existe dans l'appli, pas besoin de re-render pour ça.
let gisInitialized = false;

// "Mémoire" de connexion. Deux limites à contourner :
// 1. sessionStorage est propre à chaque ONGLET : un lien ouvert depuis un mail
//    (nouvel onglet) repartait toujours de zéro. localStorage est partagé
//    entre onglets et survit à la fermeture du navigateur.
// 2. Le jeton Google expire au bout d'1 h : on ne le réutilise que s'il est
//    encore valide, sinon on retente une reconnexion silencieuse (voir
//    prompt() plus bas) au lieu d'afficher le bouton.
function readStoredToken() {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp || payload.exp * 1000 < Date.now() + 60_000) {
      localStorage.removeItem('idToken');
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

// Intègre Google Identity Services (le script est chargé dans index.html).
// Le jeton d'identité (JWT) obtenu après connexion est envoyé au serveur dans
// l'en-tête Authorization de chaque appel API (voir api.js) — c'est lui qui
// remplace Session.getActiveUser().getEmail() côté Apps Script.
export function AuthProvider({ children }) {
  const [idToken, setIdToken] = useState(readStoredToken);

  useEffect(() => {
    let cancelled = false;
    function init() {
      if (cancelled) return;
      if (!window.google?.accounts?.id) { setTimeout(init, 150); return; }
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
        callback: (resp) => {
          try { localStorage.setItem('idToken', resp.credential); } catch { /* stockage bloqué : on reste connecté pour cette session seulement */ }
          sessionStorage.removeItem('noAutoPrompt');
          setIdToken(resp.credential);
        },
        auto_select: true
      });
      gisInitialized = true;
      // Reconnexion silencieuse (auto_select) si aucun jeton valide n'est
      // gardé : Google reconnecte sans clic quand une seule session Google
      // est ouverte dans le navigateur. Pas sur /salle (formulaire public pour
      // personnes extérieures, qui n'ont pas à se voir proposer de connexion),
      // et pas après un 401 de la session en cours (évite une boucle avec un
      // compte hors domaine, voir forceSignOut).
      if (!readStoredToken() && window.location.pathname !== '/salle' && !sessionStorage.getItem('noAutoPrompt')) {
        window.google.accounts.id.prompt();
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Réessaie tant que google.accounts.id.initialize() (ci-dessus) n'a pas
  // effectivement été appelé, au lieu d'abandonner silencieusement. Deux
  // pièges corrigés ici : (1) le script Google se charge de façon
  // asynchrone (voir index.html), (2) même une fois chargé, appeler
  // renderButton() avant initialize() échoue aussi silencieusement -- et
  // comme cet effet (dans un composant enfant, ex: Menu) s'exécute AVANT
  // celui d'AuthProvider ci-dessus (React exécute les effets des enfants
  // avant ceux du parent), se contenter de vérifier que le script est chargé
  // ne suffisait pas : il fallait aussi attendre `gisInitialized`. Renvoie
  // une fonction d'annulation, à utiliser dans le cleanup du useEffect
  // appelant.
  const renderButton = useCallback((el) => {
    if (!el) return () => {};
    let cancelled = false;
    function attempt() {
      if (cancelled) return;
      if (!gisInitialized) { setTimeout(attempt, 150); return; }
      el.innerHTML = '';
      window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 280, locale: 'fr' });
    }
    attempt();
    return () => { cancelled = true; };
  }, []);

  // Déconnexion voulue par l'utilisateur : disableAutoSelect() empêche Google
  // de le reconnecter tout seul juste après.
  const signOut = useCallback(() => {
    try { localStorage.removeItem('idToken'); } catch { /* ignore */ }
    setIdToken(null);
    window.google?.accounts?.id?.disableAutoSelect();
  }, []);

  // Appelé par api.js quand le serveur renvoie 401 (jeton refusé) : on efface
  // le jeton sans désactiver l'auto-sélection, et on bloque la reconnexion
  // silencieuse pour le reste de l'onglet — sinon un compte refusé par le
  // serveur (hors domaine) serait reconnecté puis refusé en boucle.
  const forceSignOut = useCallback(() => {
    try { localStorage.removeItem('idToken'); } catch { /* ignore */ }
    sessionStorage.setItem('noAutoPrompt', '1');
    setIdToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ idToken, renderButton, signOut, forceSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
