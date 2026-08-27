// Liste de champs répétable (accompagnateurs de FormSortie, dates de FormSalle) :
// au moins une valeur, bouton "+ Ajouter" pour en révéler une autre, "Retirer"
// sur chaque ligne sauf la première.
export default function DynamicList({ label, required, values, onChange, type = 'text', placeholder, addLabel }) {
  function setValue(i, v) {
    const next = [...values];
    next[i] = v;
    onChange(next);
  }
  function add() {
    onChange([...values, '']);
  }
  function remove(i) {
    onChange(values.filter((_, idx) => idx !== i));
  }

  return (
    <div className="mb-4">
      <span className="label">{label}{required && <span className="text-red-500"> *</span>}</span>
      <div className="flex flex-col gap-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              type={type}
              className="input"
              placeholder={placeholder ? `${placeholder} ${i + 1}` : undefined}
              value={v}
              onChange={e => setValue(i, e.target.value)}
              required={i === 0 && required}
            />
            {i > 0 && (
              <button type="button" onClick={() => remove(i)} className="btn-secondary shrink-0 !px-3 text-red-600">
                Retirer
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-2 rounded-xl border border-dashed border-primary-300 px-3.5 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50">
        + {addLabel || 'Ajouter'}
      </button>
    </div>
  );
}
