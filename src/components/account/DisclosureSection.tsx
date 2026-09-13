import { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface DisclosureSectionProps {
  title: string;
  summary: string;
  children: ReactNode;
}

/** Section repliable réutilisée par "Ma zone" et "Ma sélection hebdo" : résumé
 *  toujours visible, contenu affiché uniquement une fois dépliée. */
const DisclosureSection = ({ title, summary, children: content }: DisclosureSectionProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 14, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontFamily: 'Fraunces', fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{summary}</div>
        </div>
        <ChevronDown
          size={18}
          style={{ color: 'var(--text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>
      {open && <div style={{ padding: '0 14px 16px' }}>{content}</div>}
    </div>
  );
};

export default DisclosureSection;
