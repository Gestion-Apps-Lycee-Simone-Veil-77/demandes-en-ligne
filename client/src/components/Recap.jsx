const BADGE_CLASS = {
  'En attente': 'badge-attente',
  'Validée': 'badge-validee',
  'Refusée': 'badge-refusee',
  'Précision demandée': 'badge-precision'
};

export function StatutBadge({ statut }) {
  return <span className={`badge ${BADGE_CLASS[statut] || 'badge-attente'}`}>{statut}</span>;
}

// Tableau de récapitulatif générique (utilisé par Decision.jsx et Precision.jsx),
// plus les lignes "Pièce jointe" / "Document généré" si présentes.
export function RecapTable({ recap, pieceJointe, documentGenere }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {recap.map((l, i) => (
          <tr key={i} className="border-b border-slate-100">
            <td className="whitespace-nowrap py-2 pr-3 align-top text-slate-500">{l.label}</td>
            <td className="py-2 font-semibold text-slate-800" style={{ wordBreak: 'break-word' }}>{String(l.value)}</td>
          </tr>
        ))}
        {pieceJointe && (
          <tr className="border-b border-slate-100">
            <td className="whitespace-nowrap py-2 pr-3 align-top text-slate-500">Pièce jointe</td>
            <td className="py-2 font-semibold">
              <a href={pieceJointe.url} target="_blank" rel="noreferrer" className="text-primary-700 underline">{pieceJointe.name}</a>
            </td>
          </tr>
        )}
        {documentGenere && (
          <tr className="border-b border-slate-100">
            <td className="whitespace-nowrap py-2 pr-3 align-top text-slate-500">Document généré</td>
            <td className="py-2 font-semibold">
              <a href={documentGenere.url} target="_blank" rel="noreferrer" className="text-primary-700 underline">{documentGenere.name}</a>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
