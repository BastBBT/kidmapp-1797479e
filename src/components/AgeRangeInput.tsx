import type { AgeUnit } from '@/lib/ageFormat';

/**
 * Saisie d'un âge conseillé min/max avec sélecteur d'unité (ans/mois).
 * Les valeurs affichées restent dans l'unité choisie ; la conversion en mois
 * (unité de stockage, age_min_months/age_max_months) se fait à la soumission
 * du formulaire appelant, via `ageToMonths`. Miroir du sélecteur iOS/Android
 * (AgeUnit) et de `monthsPairToDraft` pour l'édition.
 */
export default function AgeRangeInput({
  label = 'Âge conseillé (optionnel)',
  minValue,
  maxValue,
  unit,
  onMinChange,
  onMaxChange,
  onUnitChange,
}: {
  label?: string;
  minValue: string;
  maxValue: string;
  unit: AgeUnit;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  onUnitChange: (u: AgeUnit) => void;
}) {
  const maxAllowed = unit === 'years' ? 99 : 36;
  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
  };

  return (
    <div>
      <label style={{ fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="number" min={0} max={maxAllowed} inputMode="numeric"
          value={minValue}
          onChange={(e) => onMinChange(e.target.value.replace(/[^\d]/g, ''))}
          placeholder={unit === 'years' ? 'Dès X ans' : 'Dès X mois'}
          style={inputStyle}
        />
        <input
          type="number" min={0} max={maxAllowed} inputMode="numeric"
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value.replace(/[^\d]/g, ''))}
          placeholder={unit === 'years' ? "Jusqu'à Y ans" : "Jusqu'à Y mois"}
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['years', 'months'] as const).map((u) => {
            const active = unit === u;
            return (
              <button
                type="button"
                key={u}
                onClick={() => onUnitChange(u)}
                style={{
                  padding: '6px 10px', borderRadius: 8,
                  border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                  background: active ? 'var(--primary-light)' : 'var(--surface)',
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                  fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {u === 'years' ? 'ans' : 'mois'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
