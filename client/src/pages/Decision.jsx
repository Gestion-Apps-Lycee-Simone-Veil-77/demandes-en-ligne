import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { StatusBanner } from '../components/FormShell.jsx';
import { StatutBadge, RecapTable } from '../components/Recap.jsx';
import { useShell } from '../App.jsx';

const STATUT_PRONOTE_OPTIONS = ['Déjà saisie dans Pronote', 'À saisir dans Pronote'];

const ACTIONS = {
  accepter: { label: 'Accepter la demande', classe: 'btn-success', besoinCommentaire: false, confirmText: "Confirmer l'acceptation de cette demande ?" },
  refuser: { label: 'Refuser la demande', classe: 'btn-danger', besoinCommentaire: true, confirmText: 'Confirmer le refus de cette demande ?' },
  preciser: { label: 'Demander des précisions', classe: 'btn-warning', besoinCommentaire: true, confirmText: "Confirmer l'envoi de cette demande de précisions ?" }
};

export default function Decision() {
  const { type, id } = useParams();
  const { api } = useShell();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [statutPronote, setStatutPronote] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  function charger() {
    setError(null);
    api.get(`/decision/${type}/${id}`).then(setData).catch(err => setError(err.message));
  }
  useEffect(charger, [type, id]); // eslint-disable-line react-hooks/exhaustive-deps

  function ouvrir(a) {
    setAction(a);
    setCommentaire('');
    setStatutPronote('');
    setStatus(null);
  }

  async function confirmer() {
    const cfg = ACTIONS[action];
    if (cfg.besoinCommentaire && !commentaire.trim()) { setStatus({ type: 'error', text: 'Merci de renseigner un commentaire.' }); return; }
    if (type === 'SALLE' && action === 'accepter' && !statutPronote) { setStatus({ type: 'error', text: 'Merci de choisir le statut Pronote.' }); return; }
    if (!window.confirm(cfg.confirmText)) return;

    setBusy(true);
    setStatus({ type: 'loading', text: 'Envoi en cours...' });
    try {
      await api.post(`/decision/${type}/${id}`, { action, commentaire, statutPronote });
      setStatus({ type: 'success', text: 'Action enregistrée. La page va se rafraîchir...' });
      setTimeout(() => { setAction(null); charger(); }, 1200);
    } catch (err) {
      setStatus({ type: 'error', text: 'Erreur : ' + err.message });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Layout><p className="font-semibold text-red-600">{error}</p></Layout>;
  if (!data) return <Layout>Chargement...</Layout>;

  return (
    <Layout>
      <h1 className="page-title !mb-2">{data.libelle} {data.numeroRequest}</h1>
      <div className="mb-4"><StatutBadge statut={data.statut} /></div>

      {data.precisionApportee && (
        <>
          <h2 className="section-title">Précisions apportées par le demandeur</h2>
          <p className="mb-4 whitespace-pre-wrap rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm">{data.precisionApportee}</p>
        </>
      )}

      {!data.peutTraiter && data.commentaireDirecteur && (
        <>
          <h2 className="section-title">Votre commentaire</h2>
          <p className="mb-4 whitespace-pre-wrap rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm">
            {data.commentaireDirecteur}{data.dateDecision ? `\n\n(${data.dateDecision})` : ''}
          </p>
        </>
      )}

      <h2 className="section-title">Récapitulatif de la demande</h2>
      <RecapTable recap={data.recap} pieceJointe={data.pieceJointe} documentGenere={data.documentGenere} />

      {!data.peutTraiter ? (
        <p className="mt-5 text-sm text-slate-500">
          {data.statut === 'Précision demandée'
            ? "Cette demande est en attente des précisions du demandeur. Vous pourrez la traiter dès qu'il aura répondu."
            : "Cette demande a déjà été traitée, aucune action supplémentaire n'est possible."}
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {Object.entries(ACTIONS).map(([key, cfg]) => {
              if (key === 'preciser' && data.precisionDejaDemandee) return null;
              return (
                <button key={key} type="button" className={cfg.classe} onClick={() => ouvrir(key)}>
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {action && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-2.5 text-sm font-bold text-slate-800">{ACTIONS[action].label}</h3>

              {type === 'SALLE' && action === 'accepter' && (
                <label className="mb-3 block">
                  <span className="label">Statut Pronote <span className="text-red-500">*</span></span>
                  <select className="input" value={statutPronote} onChange={e => setStatutPronote(e.target.value)}>
                    <option value="">Choisissez</option>
                    {STATUT_PRONOTE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              )}

              <label className="mb-3 block">
                <span className="label">Commentaire {ACTIONS[action].besoinCommentaire ? '(obligatoire)' : '(facultatif)'}</span>
                <textarea className="input min-h-[90px]" value={commentaire} onChange={e => setCommentaire(e.target.value)} />
              </label>

              <div className="flex flex-wrap gap-2.5">
                <button type="button" disabled={busy} className={ACTIONS[action].classe} onClick={confirmer}>
                  Confirmer : {ACTIONS[action].label}
                </button>
                <button type="button" disabled={busy} className="btn-secondary" onClick={() => setAction(null)}>Annuler</button>
              </div>
              <StatusBanner status={status} />
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
