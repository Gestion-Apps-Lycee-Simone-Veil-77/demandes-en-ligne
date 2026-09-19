import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { IdentityBox, StatusBanner, Field, inputClass } from '../components/FormShell.jsx';
import DynamicList from '../components/DynamicList.jsx';
import { useShell } from '../App.jsx';

const today = new Date().toISOString().slice(0, 10);
const SEANCE_VIDE = { date: '', heure: '', salle: '' };

export default function FormIntervenant() {
  const { api } = useShell();
  const [bootstrap, setBootstrap] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [classes, setClasses] = useState(['']);
  const [sessions, setSessions] = useState([{ ...SEANCE_VIDE }]);

  const [f, setF] = useState({
    intervenantNom: '', intervenantEmail: '', intervenantTelephone: '', intervenantActivite: '', intervenantStructure: '',
    coutIntervention: '', objectifs: '', commentaire: ''
  });
  const set = k => e => setF({ ...f, [k]: e.target.value });

  useEffect(() => { api.get('/bootstrap/intervenant').then(setBootstrap); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disabled = bootstrap && !bootstrap.nom;

  function setSession(i, field, value) {
    const next = [...sessions];
    next[i] = { ...next[i], [field]: value };
    setSessions(next);
  }
  function addSession() { setSessions([...sessions, { ...SEANCE_VIDE }]); }
  function removeSession(i) { setSessions(sessions.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanClasses = classes.map(c => c.trim()).filter(Boolean);
    if (!cleanClasses.length) { setStatus({ type: 'error', text: 'Merci de renseigner au moins une classe concernée.' }); return; }
    const cleanSessions = sessions.filter(s => s.date && s.heure && s.salle);
    if (!cleanSessions.length) { setStatus({ type: 'error', text: 'Merci de renseigner au moins une séance complète (date, heure, salle).' }); return; }

    setBusy(true);
    setStatus({ type: 'loading', text: 'Envoi en cours...' });
    try {
      const res = await api.post('/submit/intervenant', { ...f, classes: cleanClasses, sessions: cleanSessions });
      setStatus({ type: 'success', text: `Demande envoyée avec succès ! Numéro de demande : ${res.numeroRequest}. Un mail de confirmation vous a été envoyé.` });
      setF({ intervenantNom: '', intervenantEmail: '', intervenantTelephone: '', intervenantActivite: '', intervenantStructure: '', coutIntervention: '', objectifs: '', commentaire: '' });
      setClasses(['']);
      setSessions([{ ...SEANCE_VIDE }]);
    } catch (err) {
      setStatus({ type: 'error', text: 'Erreur : ' + err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout back="/">
      <h2 className="page-title">Accueil d'intervenant extérieur</h2>
      <p className="mb-4 text-sm leading-relaxed text-slate-500">
        Ce formulaire permet de déclarer l'intervention d'une personne extérieure à l'établissement.<br />
        Votre demande sera examinée par le proviseur avant validation.
      </p>
      <IdentityBox identite={bootstrap} />

      {bootstrap && (
        <form onSubmit={handleSubmit}>
          <DynamicList label="Classes concernées" required values={classes} onChange={setClasses}
                       placeholder="Classe" addLabel="Ajouter une classe" />

          <div className="mb-4">
            <span className="label">Séances (date, heure, salle) <span className="text-red-500">*</span></span>
            <div className="flex flex-col gap-2">
              {sessions.map((s, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-2.5">
                  <div className="min-w-[130px] flex-1">
                    <span className="mb-1 block text-xs text-slate-400">Date</span>
                    <input type="date" className={inputClass} min={today} value={s.date} onChange={e => setSession(i, 'date', e.target.value)} required={i === 0} />
                  </div>
                  <div className="min-w-[100px] flex-1">
                    <span className="mb-1 block text-xs text-slate-400">Heure</span>
                    <input type="time" className={inputClass} value={s.heure} onChange={e => setSession(i, 'heure', e.target.value)} required={i === 0} />
                  </div>
                  <div className="min-w-[130px] flex-1">
                    <span className="mb-1 block text-xs text-slate-400">Salle</span>
                    <input className={inputClass} value={s.salle} onChange={e => setSession(i, 'salle', e.target.value)} required={i === 0} />
                  </div>
                  {i > 0 && (
                    <button type="button" onClick={() => removeSession(i)} className="btn-secondary shrink-0 !px-3 text-red-600">Retirer</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addSession} className="mt-2 rounded-xl border border-dashed border-primary-300 px-3.5 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50">
              + Ajouter une séance
            </button>
          </div>

          <Field label="Nom Prénom de l'intervenant" required>
            <input className={inputClass} required value={f.intervenantNom} onChange={set('intervenantNom')} />
          </Field>
          <div className="flex gap-2">
            <div className="flex-1"><Field label="Adresse mail de l'intervenant" required hint="Extérieur à l'établissement.">
              <input className={inputClass} required value={f.intervenantEmail} onChange={set('intervenantEmail')} />
            </Field></div>
            <div className="flex-1"><Field label="Numéro de téléphone de l'intervenant" required>
              <input className={inputClass} required value={f.intervenantTelephone} onChange={set('intervenantTelephone')} />
            </Field></div>
          </div>
          <Field label="Activité / fonction de l'intervenant" required>
            <input className={inputClass} required value={f.intervenantActivite} onChange={set('intervenantActivite')} />
          </Field>
          <Field label="Structure / entreprise / association de l'intervenant" required>
            <input className={inputClass} required value={f.intervenantStructure} onChange={set('intervenantStructure')} />
          </Field>
          <Field label="Coût de l'intervention" required hint="En euros — la virgule est acceptée, indiquez 0 si gratuit.">
            <input className={inputClass} inputMode="decimal" placeholder="Ex : 150,00" required value={f.coutIntervention} onChange={set('coutIntervention')} />
          </Field>
          <Field label="Objectifs de l'intervention" required>
            <textarea className={inputClass + ' min-h-[90px]'} required value={f.objectifs} onChange={set('objectifs')} />
          </Field>
          <Field label="Ajoutez tout élément qui vous semble important et que vous n'avez pas pu préciser précédemment">
            <textarea className={inputClass + ' min-h-[70px]'} value={f.commentaire} onChange={set('commentaire')} />
          </Field>

          <button type="submit" disabled={disabled || busy} className="btn-primary w-full !py-3">
            Envoyer la demande
          </button>
        </form>
      )}
      <StatusBanner status={status} />
    </Layout>
  );
}
