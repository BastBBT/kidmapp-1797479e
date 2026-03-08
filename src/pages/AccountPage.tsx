import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AccountPage = () => {
  const { user, signOut } = useAuth();
  const { favoriteIds } = useFavorites();

  const { data: myContributions = [] } = useQuery({
    queryKey: ['my-contributions', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('contributions')
        .select('*, locations(name, category)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    }
  });

  const { data: myProposals = [] } = useQuery({
    queryKey: ['my-proposals', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('location_proposals')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    }
  });

  return (
    <div style={{ paddingBottom: '120px' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(160deg, #FAF0EC 0%, #F0C4B4 100%)',
        padding: '52px 20px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <svg style={{ position: 'absolute', top: '-20px', right: '-30px', width: '160px', height: '160px', opacity: 0.6 }} viewBox="0 0 160 160">
          <path d="M80,10 C115,8 148,35 155,70 C162,105 145,140 112,152 C79,164 42,150 22,120 C2,90 8,50 35,28 C52,14 62,11 80,10Z" fill="rgba(255,255,255,0.25)" />
        </svg>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'var(--primary)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px', fontWeight: 700, fontFamily: 'Fraunces',
          marginBottom: '12px',
          boxShadow: '0 4px 16px rgba(217,95,59,0.3)'
        }}>
          {user?.email?.[0].toUpperCase()}
        </div>
        <div style={{ fontFamily: 'Fraunces', fontSize: '22px', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Mon compte
        </div>
        <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {user?.email}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'DM Sans' }}>
          Membre depuis {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '1px', background: 'var(--border)',
        borderBottom: '1px solid var(--border)'
      }}>
        {[
          { value: favoriteIds.length, label: 'Favoris' },
          { value: myContributions.length, label: 'Contributions' },
          { value: myProposals.length, label: 'Propositions' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)', padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: '28px', fontWeight: 500, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              {stat.value}
            </div>
            <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Contributions */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontFamily: 'Fraunces', fontSize: '18px', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: '12px' }}>
          Mes contributions
        </div>
        {myContributions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontFamily: 'Caveat', fontSize: '16px', color: 'var(--text-muted)' }}>
              Aucune contribution pour l'instant ✦
            </div>
          </div>
        ) : myContributions.map((c: any) => (
          <div key={c.id} style={{
            background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
            padding: '14px', marginBottom: '10px', boxShadow: 'var(--shadow)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>
                {c.locations?.name}
              </div>
              <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)' }}>
                {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {c.high_chair !== null && (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg)', color: 'var(--text-muted)' }}>
                    🪑 {c.high_chair ? 'Oui' : 'Non'}
                  </span>
                )}
                {c.changing_table !== null && (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg)', color: 'var(--text-muted)' }}>
                    👶 {c.changing_table ? 'Oui' : 'Non'}
                  </span>
                )}
                {c.kids_area !== null && (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg)', color: 'var(--text-muted)' }}>
                    🎨 {c.kids_area ? 'Oui' : 'Non'}
                  </span>
                )}
              </div>
            </div>
            <div style={{
              fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', flexShrink: 0,
              background: c.status === 'validated' ? '#EBF6EC' : c.status === 'rejected' ? '#FEF0EC' : 'var(--accent-light)',
              color: c.status === 'validated' ? '#2E7D32' : c.status === 'rejected' ? 'var(--primary)' : '#C49A35'
            }}>
              {c.status === 'validated' ? '✓ Validée' : c.status === 'rejected' ? '✗ Refusée' : '⏳ En attente'}
            </div>
          </div>
        ))}
      </div>

      {/* Propositions */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontFamily: 'Fraunces', fontSize: '18px', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: '12px' }}>
          Mes propositions
        </div>
        {myProposals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontFamily: 'Caveat', fontSize: '16px', color: 'var(--text-muted)' }}>
              Tu n'as pas encore proposé de lieu ✦
            </div>
          </div>
        ) : myProposals.map((p: any) => (
          <div key={p.id} style={{
            background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
            padding: '14px', marginBottom: '10px', boxShadow: 'var(--shadow)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px'
          }}>
            <div style={{ flex: 1 }}>
              {p.photo && (
                <div style={{ width: '100%', height: '80px', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' }}>
                  <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>
                {p.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {p.address}
              </div>
              <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)' }}>
                {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div style={{
              fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', flexShrink: 0,
              background: p.status === 'approved' ? '#EBF6EC' : p.status === 'rejected' ? '#FEF0EC' : 'var(--accent-light)',
              color: p.status === 'approved' ? '#2E7D32' : p.status === 'rejected' ? 'var(--primary)' : '#C49A35'
            }}>
              {p.status === 'approved' ? '✓ Publiée' : p.status === 'rejected' ? '✗ Refusée' : '⏳ En attente'}
            </div>
          </div>
        ))}
      </div>

      {/* Déconnexion */}
      <div style={{ padding: '24px 16px 0' }}>
        <button
          onClick={() => signOut()}
          style={{
            width: '100%', padding: '14px', borderRadius: '100px',
            border: '1.5px solid var(--border)', background: 'transparent',
            fontFamily: 'DM Sans', fontSize: '14px', fontWeight: 600,
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default AccountPage;
