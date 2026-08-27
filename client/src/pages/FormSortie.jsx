import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { IdentityBox, StatusBanner, Field, inputClass } from '../components/FormShell.jsx';
import DynamicList from '../components/DynamicList.jsx';
import { useShell } from '../App.jsx';

const today = new Date().toISOString().slice(0, 10);

export default function FormSortie() {
  const { api } = useShell();
  const [bootstrap, setBootstrap] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [accompagnateurs, setAccompagnateurs] = useState(['']);

  const [f, setF] = useState({
    professeurOrganisateur: '', emailOrganisateur: '', nomSortie: '', lieuSortie: '', dateSortie: '',
    heureDepart: '', heureRetour: '', lieuDepart: '', lieuRetour: '',
    nbBilletEntreeAccompagnateurs: '0', coutBilletEntreeAccompagnateurs: '',
    nbTicketTransportAccompagnateurs: '0', coutTicketTransportAccompagnateurs: '',
    classeGroupe: '', nombreEleves: '', coutBilletEntreeEleves: '', coutTicketTransportEleves: '',
    coursAvant: '', coursApres: '', autreTransportCout: ''
  });
  const set = k => e => setF({ ...f, [k]: e.target.value });

  useEffect(() => { api.get('/bootstrap/sortie').then(setBootstrap); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disabled = bootstrap && !bootstrap.nom;
  const nbBillet = parseInt(f.nbBilletEntreeAccompagnateurs, 10) || 0;
  const nbTicket = parseInt(f.nbTicketTransportAccompagnateurs, 10) || 0;
  const aDesEleves = (parseInt(f.nombreEleves, 10) || 0) > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanAccompagnateurs = accompagnateurs.map(a => a.trim()).filter(Boolean);
    if (!cleanAccompagnateurs.length) { setStatus({ type: 'error', text: 'Merci de renseigner au moins un accompagnateur.' }); return; }
    if (nbBillet > 0 && !f.coutBilletEntreeAccompagnateurs.trim()) {
      setStatus({ type: 'error', text: "Merci de préciser le coût individuel du billet d'entrée." }); return;
    }
    if (nbTicket > 0 && !f.coutTicketTransportAccompagnateurs.trim()) {
      setStatus({ type: 'error', text: 'Merci de préciser le coût individuel du ticket de transport.' }); return;
    }
    if (aDesEleves && !f.coutBilletEntreeEleves.trim()) {
      setStatus({ type: 'error', text: "Merci de préciser le coût individuel du billet d'entrée pour les élèves." }); return;
    }
    if (aDesEleves && !f.coutTicketTransportEleves.trim()) {
      setStatus({ type: 'error', text: 'Merci de préciser le coût individuel du ticket de transport pour les élèves.' }); return;
    }

    setBusy(true);
    setStatus({ type: 'loading', text: 'Envoi en cours...' });
    try {
      const res = await api.post('/submit/sortie', { ...f, accompagnateurs: cleanAccompagnateurs });
      setStatus({ type: 'success', text: `Demande envoyée avec succès ! Numéro de demande : ${res.numeroRequest}. Un mail de confirmation vous a été envoyé.` });
      setF({
        professeurOrganisateur: '', emailOrganisateur: '', nomSortie: '', lieuSortie: '', dateSortie: '',
        heureDepart: '', heureRetour: '', lieuDepart: '', lieuRetour: '',
        nbBilletEntreeAccompagnateurs: '0', coutBilletEntreeAccompagnateurs: '',
        nbTicketTransportAccompagnateurs: '0', coutTicketTransportAccompagnateurs: '',
        classeGroupe: '', nombreEleves: '', coutBilletEntreeEleves: '', coutTicketTransportEleves: '',
        coursAvant: '', coursApres: '', autreTransportCout: ''
      });
      setAccompagnateurs(['']);
    } catch (err) {
      setStatus({ type: 'error', text: 'Erreur : ' + err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout back="/">
      <h2 className="page-title">Sortie pédagogique</h2>
      <p className="mb-4 text-sm leading-relaxed text-slate-500">
        Ce formulaire permet de déclarer une sortie ou un voyage scolaire.<br />
        Votre demande sera examinée par le proviseur et la gestionnaire avant validation.
      </p>
      <IdentityBox identite={bootstrap} />

      {bootstrap && (
        <form onSubmit={handleSubmit}>
          <Field label="Professeur organisateur" required>
            <input className={inputClass} required value={f.professeurOrganisateur} onChange={set('professeurOrganisateur')} />
          </Field>
          <Field label="Adresse email de l'organisateur" required>
            <input className={inputClass} required value={f.emailOrganisateur} onChange={set('emailOrganisateur')} />
          </Field>
          <Field label="Nom de la sortie" required>
            <input className={inputClass} required value={f.nomSortie} onChange={set('nomSortie')} />
          </Field>
          <Field label="Lieu de la sortie" required>
            <input className={inputClass} required value={f.lieuSortie} onChange={set('lieuSortie')} />
          </Field>
          <Field label="Date de la sortie" required>
            <input type="date" className={inputClass} min={today} required value={f.dateSortie} onChange={set('dateSortie')} />
          </Field>

          <div className="flex gap-2">
            <div className="flex-1"><Field label="Heure de départ" required>
              <input type="time" className={inputClass} required value={f.heureDepart} onChange={set('heureDepart')} />
            </Field></div>
            <div className="flex-1"><Field label="Heure de retour" required>
              <input type="time" className={inputClass} required value={f.heureRetour} onChange={set('heureRetour')} />
            </Field></div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1"><Field label="Lieu de départ" required>
              <input className={inputClass} required value={f.lieuDepart} onChange={set('lieuDepart')} />
            </Field></div>
            <div className="flex-1"><Field label="Lieu de retour" required>
              <input className={inputClass} required value={f.lieuRetour} onChange={set('lieuRetour')} />
            </Field></div>
          </div>

          <DynamicList label="Accompagnateurs" required values={accompagnateurs} onChange={setAccompagnateurs}
                       placeholder="Nom de l'accompagnateur" addLabel="Ajouter un accompagnateur" />

          <div className="flex gap-2">
            <div className="flex-1"><Field label="Accompagnateurs — nombre de billets d'entrée">
              <input type="number" min="0" className={inputClass} value={f.nbBilletEntreeAccompagnateurs} onChange={set('nbBilletEntreeAccompagnateurs')} />
            </Field></div>
            {nbBillet > 0 && (
              <div className="flex-1"><Field label="Coût individuel du billet d'entrée" required>
                <input className={inputClass} inputMode="decimal" placeholder="Ex : 5,00" required value={f.coutBilletEntreeAccompagnateurs} onChange={set('coutBilletEntreeAccompagnateurs')} />
              </Field></div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1"><Field label="Accompagnateurs — nombre de tickets de transport">
              <input type="number" min="0" className={inputClass} value={f.nbTicketTransportAccompagnateurs} onChange={set('nbTicketTransportAccompagnateurs')} />
            </Field></div>
            {nbTicket > 0 && (
              <div className="flex-1"><Field label="Coût individuel du ticket de transport" required>
                <input className={inputClass} inputMode="decimal" placeholder="Ex : 2,00" required value={f.coutTicketTransportAccompagnateurs} onChange={set('coutTicketTransportAccompagnateurs')} />
              </Field></div>
            )}
          </div>

          <Field label="Classe / groupe" required>
            <input className={inputClass} required value={f.classeGroupe} onChange={set('classeGroupe')} />
          </Field>
          <Field label="Nombre d'élèves" required>
            <input type="number" min="1" className={inputClass} required value={f.nombreEleves} onChange={set('nombreEleves')} />
          </Field>

          {aDesEleves && (
            <div className="flex gap-2">
              <div className="flex-1"><Field label="Élèves — coût individuel du billet d'entrée" required>
                <input className={inputClass} inputMode="decimal" placeholder="Ex : 5,00" required value={f.coutBilletEntreeEleves} onChange={set('coutBilletEntreeEleves')} />
              </Field></div>
              <div className="flex-1"><Field label="Élèves — coût individuel du ticket de transport" required>
                <input className={inputClass} inputMode="decimal" placeholder="Ex : 2,00" required value={f.coutTicketTransportEleves} onChange={set('coutTicketTransportEleves')} />
              </Field></div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1"><Field label="Les élèves ont-ils cours AVANT la sortie ?" required>
              <select className={inputClass} required value={f.coursAvant} onChange={set('coursAvant')}>
                <option value="" disabled>Choisissez</option>
                <option value="OUI">OUI</option>
                <option value="NON">NON</option>
              </select>
            </Field></div>
            <div className="flex-1"><Field label="Les élèves ont-ils cours APRÈS la sortie ?" required>
              <select className={inputClass} required value={f.coursApres} onChange={set('coursApres')}>
                <option value="" disabled>Choisissez</option>
                <option value="OUI">OUI</option>
                <option value="NON">NON</option>
              </select>
            </Field></div>
          </div>

          <Field label="Si autre moyen de transport (car, etc.) : coût individuel" hint="En euros — laissez vide si non concerné.">
            <input className={inputClass} inputMode="decimal" placeholder="Ex : 8,00" value={f.autreTransportCout} onChange={set('autreTransportCout')} />
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
