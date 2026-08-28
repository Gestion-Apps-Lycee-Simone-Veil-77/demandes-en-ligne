import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout, { Logo, Topbar } from '../components/Layout.jsx';
import { useAuth } from '../auth.jsx';
import { createApi } from '../api.js';

const ITEMS = [
  { to: '/depense', icon: '💳', badge: 'bg-primary-50', label: 'Demande de dépense', desc: 'Achat, prestation ou service payé directement par le lycée', public: false },
  { to: '/remboursement', icon: '🧾', badge: 'bg-violet-50', label: "Remboursement d'avance de frais", desc: 'Vous avez avancé personnellement une dépense pour le lycée', public: false },
  { to: '/salle', icon: '🏫', badge: 'bg-sky-50', label: 'Réservation de salle pour formation', desc: "Organiser une formation dans l'établissement (accessible sans connexion)", public: true },
  { to: '/sortie', icon: '🚌', badge: 'bg-amber-50', label: 'Sortie pédagogique', desc: 'Déclarer une sortie ou un voyage scolaire', public: false },
  { to: '/intervenant', icon: '🎤', badge: 'bg-emerald-50', label: "Accueil d'intervenant extérieur", desc: "Déclarer l'intervention d'une personne extérieure", public: false }
];

// Page d'accueil : accessible sans connexion (pour que les personnes
// extérieures puissent trouver directement la réservation de salle), mais
// gère elle-même l'affichage connecté/déconnecté puisqu'elle n'est plus
// protégée par <Shell> (voir App.jsx).
export default function Menu() {
  const { idToken, renderButton, signOut } = useAuth();
  // Déconnecté : seule la réservation de salle (personnes extérieures).
  // Connecté : les 4 formulaires internes, la salle disparaît du menu (elle
  // reste accessible via son lien direct /salle si besoin).
  const visibleItems = ITEMS.filter(item => item.public === !idToken);

  return (
    <div className="min-h-screen bg-slate-100">
      {idToken ? <ConnectedTopbar idToken={idToken} signOut={signOut} /> : <PublicHeader renderButton={renderButton} />}

      <Layout>
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Demandes en ligne</h1>
          <h2 className="text-sm font-semibold text-slate-500 sm:text-base">Choisissez le type de demande que vous souhaitez soumettre</h2>
        </div>

        {!idToken && (
          <p className="mb-5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-center text-sm text-primary-800">
            Vous êtes membre de l'établissement ? Connectez-vous ci-dessus pour accéder aux autres formulaires.
          </p>
        )}

        <nav className="flex flex-col gap-2.5">
          {visibleItems.map(item => <MenuButton key={item.to} {...item} />)}
        </nav>
      </Layout>
    </div>
  );
}

// Réplique du <Shell> pour la page d'accueil connectée : va chercher /me
// pour afficher l'email + le bouton de déconnexion dans la Topbar, sans
// passer par le contexte d'Outlet (Menu n'est plus un enfant de Shell).
function ConnectedTopbar({ idToken, signOut }) {
  const [me, setMe] = useState(null);
  useEffect(() => {
    createApi(idToken, signOut).get('/me').then(setMe).catch(() => {});
  }, [idToken]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Topbar me={me} onSignOut={signOut} />;
}

function PublicHeader({ renderButton }) {
  const ref = useRef(null);
  useEffect(() => renderButton(ref.current), [renderButton]);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-6">
        <span className="flex min-w-0 items-center gap-2.5">
          <Logo className="h-8 w-auto shrink-0" />
          <span className="truncate text-sm font-bold text-slate-800 sm:text-base">Demandes en ligne</span>
        </span>
        <div ref={ref} />
      </div>
    </header>
  );
}

function MenuButton({ to, icon, badge, label, desc }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
    >
      <span className={`icon-badge ${badge}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-800">{label}</span>
        <span className="block truncate text-xs text-slate-400">{desc}</span>
      </span>
      <span className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500">→</span>
    </Link>
  );
}
