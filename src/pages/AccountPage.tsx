import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DeleteAccountSection from '@/components/DeleteAccountSection';
import LevelCard from '@/components/LevelCard';
import { EQUIP_ICONS, CATEGORY_ICONS } from '@/assets/icons';
import { translateToken } from '@/i18n/tokenMaps';
import { supabaseResized } from '@/lib/imageUrl';


const CategoryThumb = ({ category }: { category?: string | null }) => {
  const src = category ? CATEGORY_ICONS[category] : undefined;
  if (!src) return null;
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%',
      background: 'var(--primary-light)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <img src={src} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
    </div>
  );
};

const EquipBadge = ({ icon, value }: { icon: string; value: boolean }) => {
  const { t } = useTranslation();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg)', color: 'var(--text-muted)' }}>
      <img src={icon} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
      {value ? t('common.yes') : t('common.no')}
    </span>
  );
};

const JoinKidmappView = () => {
  const { t } = useTranslation();
  const { openAuth } = useRequireAuth();
  const benefits = [
    { emoji: '❤️', label: t('account.benefit_save') },
    { emoji: '✍️', label: t('account.benefit_contribute') },
    { emoji: '📍', label: t('account.benefit_propose') },
    { emoji: '👤', label: t('account.benefit_track') },
  ];
  return (
    <div style={{ paddingBottom: '120px', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        background: 'linear-gradient(160deg, #FAF0EC 0%, #F0C4B4 100%)',
        padding: '64px 24px 36px',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        <svg style={{ position: 'absolute', top: '-30px', right: '-40px', width: 200, height: 200, opacity: 0.5 }} viewBox="0 0 220 220">
          <path d="M110,20 C155,15 200,55 210,100 C220,145 190,190 145,205 C100,220 50,200 25,160 C0,120 10,65 50,40 C70,27 85,22 110,20Z" fill="rgba(255,255,255,0.4)" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: 160, height: 160, opacity: 0.4 }} viewBox="0 0 160 160">
          <path d="M80,10 C115,8 148,35 155,70 C162,105 145,140 112,152 C79,164 42,150 22,120 C2,90 8,50 35,28 C52,14 62,11 80,10Z" fill="rgba(255,255,255,0.4)" />
        </svg>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--primary)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, marginBottom: 14,
          boxShadow: '0 6px 20px rgba(217,95,59,0.35)',
          position: 'relative', zIndex: 1,
        }}>✦</div>
        <div style={{
          fontFamily: 'Fraunces', fontSize: 28, fontWeight: 500,
          letterSpacing: '-0.02em', color: 'var(--text)', position: 'relative', zIndex: 1,
        }}>
          {t('account.join_title')}
        </div>
        <div style={{
          fontFamily: 'Caveat', fontSize: 17, color: 'var(--text-muted)',
          marginTop: 6, position: 'relative', zIndex: 1,
        }}>
          {t('account.join_subtitle')}
        </div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)', padding: '6px 4px',
        }}>
          {benefits.map((b, i) => (
            <div key={b.label} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>{b.emoji}</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)' }}>
                {b.label}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => openAuth('signup')}
          style={{
            width: '100%', marginTop: 24, padding: 15, borderRadius: 100,
            border: 'none', background: 'var(--primary)', color: '#fff',
            fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 8px 22px rgba(217,95,59,0.28)',
          }}
        >
          {t('account.signup_cta')}
        </button>
        <button
          onClick={() => openAuth('login')}
          style={{
            width: '100%', marginTop: 10, padding: 13, borderRadius: 100,
            border: '1.5px solid var(--border)', background: 'transparent',
            color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t('account.login_cta')}
        </button>
      </div>

      <div style={{ padding: '32px 16px 0', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <Link to="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t('common.privacy')}</Link>
          <span aria-hidden="true">·</span>
          <Link to="/support" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t('common.support')}</Link>
        </div>
        <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>
          {t('account.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </div>
  );
};

const AccountPage = () => {
  const { t, i18n } = useTranslation();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { favoriteIds } = useFavorites();
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    setNameDraft(profile?.full_name ?? '');
  }, [profile?.full_name]);

  const saveName = async () => {
    if (!user) return;
    const trimmed = nameDraft.trim();
    if (trimmed === (profile?.full_name ?? '')) return;
    setSavingName(true);
    setNameSaved(false);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: trimmed || null } as any)
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (e) {
      console.error('Update name failed:', e);
    } finally {
      setSavingName(false);
    }
  };


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

  const { data: myEvents = [] } = useQuery({
    queryKey: ['my-events', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('events' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as any[];
    }
  });

  if (!user) return <JoinKidmappView />;

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
          {t('account.title')}
        </div>
        <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {user?.email}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'DM Sans' }}>
          {t('account.member_since', { date: user?.created_at ? new Date(user.created_at).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }) : '—' })}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px', background: 'var(--border)',
        borderBottom: '1px solid var(--border)'
      }}>
        {[
          { value: favoriteIds.length, label: t('account.stat_favorites') },
          { value: myContributions.length, label: t('account.stat_contributions') },
          { value: myProposals.length, label: t('account.stat_places') },
          { value: myEvents.length, label: t('account.stat_events') },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)', padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: '24px', fontWeight: 500, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              {stat.value}
            </div>
            <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Niveau */}
      {profile?.points !== undefined && (
        <div style={{ padding: '20px 16px 0' }}>
          <LevelCard points={profile.points} />
        </div>
      )}

      {/* Prénom */}
      <div style={{ padding: '20px 16px 0' }}>

        <div style={{ fontFamily: 'Fraunces', fontSize: '18px', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: '12px' }}>
          {t('account.name_title')}
        </div>
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
          padding: '14px', boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            {t('account.name_hint')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t('common.example_name')}
              maxLength={60}
              autoComplete="given-name"
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid var(--border)', background: 'var(--bg)',
                fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={saveName}
              disabled={savingName || nameDraft.trim() === (profile?.full_name ?? '')}
              style={{
                padding: '0 18px', borderRadius: 10, border: 'none',
                background: 'var(--primary)', color: '#fff',
                fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
                cursor: savingName ? 'wait' : 'pointer',
                opacity: (savingName || nameDraft.trim() === (profile?.full_name ?? '')) ? 0.5 : 1,
              }}
            >
              {savingName ? '…' : nameSaved ? '✓' : t('common.save')}
            </button>
          </div>
        </div>
      </div>

      {/* Contributions */}
      <div style={{ padding: '20px 16px 0' }}>

        <div style={{ fontFamily: 'Fraunces', fontSize: '18px', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: '12px' }}>
          {t('account.contributions_title')}
        </div>
        {myContributions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontFamily: 'Caveat', fontSize: '16px', color: 'var(--text-muted)' }}>
              {t('account.contributions_empty')}
            </div>
          </div>
        ) : myContributions.map((c: any) => (
          <div key={c.id} style={{
            background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
            padding: '14px', marginBottom: '10px', boxShadow: 'var(--shadow)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '4px' }}>
                <CategoryThumb category={c.locations?.category} />
                <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500 }}>
                  {c.locations?.name}
                </div>
              </div>
              <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)' }}>
                {new Date(c.created_at).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' })}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {c.high_chair !== null && <EquipBadge icon={EQUIP_ICONS.high_chair} value={c.high_chair} />}
                {c.changing_table !== null && <EquipBadge icon={EQUIP_ICONS.changing_table} value={c.changing_table} />}
                {c.kids_area !== null && <EquipBadge icon={EQUIP_ICONS.kids_area} value={c.kids_area} />}
                {(c as any).kids_menu !== null && (c as any).kids_menu !== undefined && (
                  <EquipBadge icon={EQUIP_ICONS.kids_menu} value={(c as any).kids_menu} />
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              {c.status === 'validated' && (
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  background: 'rgba(217,95,59,0.08)', color: '#D95F3B',
                  padding: '2px 8px', borderRadius: 20,
                }}>{t('account.points_earned', { points: 10 })}</div>
              )}
              <div style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px',
                background: c.status === 'validated' ? '#EBF6EC' : c.status === 'rejected' ? '#FEF0EC' : 'var(--accent-light)',
                color: c.status === 'validated' ? '#2E7D32' : c.status === 'rejected' ? 'var(--primary)' : '#C49A35'
              }}>
                {c.status === 'validated' ? t('account.status_validated') : c.status === 'rejected' ? t('account.status_rejected') : t('account.status_pending')}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Propositions */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontFamily: 'Fraunces', fontSize: '18px', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: '12px' }}>
          {t('account.proposals_title')}
        </div>
        {myProposals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontFamily: 'Caveat', fontSize: '16px', color: 'var(--text-muted)' }}>
              {t('account.proposals_empty')}
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
                  <img src={supabaseResized(p.photo, { width: 160, height: 160, quality: 70 })} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '4px' }}>
                {!p.photo && <CategoryThumb category={p.category} />}
                <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500 }}>
                  {p.name}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {p.address}
              </div>
              <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)' }}>
                {new Date(p.created_at).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              {p.status === 'approved' && (
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  background: 'rgba(217,95,59,0.08)', color: '#D95F3B',
                  padding: '2px 8px', borderRadius: 20,
                }}>{t('account.points_earned', { points: 25 })}</div>
              )}
              <div style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px',
                background: p.status === 'approved' ? '#EBF6EC' : p.status === 'rejected' ? '#FEF0EC' : 'var(--accent-light)',
                color: p.status === 'approved' ? '#2E7D32' : p.status === 'rejected' ? 'var(--primary)' : '#C49A35'
              }}>
                {p.status === 'approved' ? t('account.status_published_place') : p.status === 'rejected' ? t('account.status_rejected') : t('account.status_pending')}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Mes événements proposés */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontFamily: 'Fraunces', fontSize: '18px', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: '12px' }}>
          {t('account.events_title')}
        </div>
        {myEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontFamily: 'Caveat', fontSize: '16px', color: 'var(--text-muted)' }}>
              {t('account.events_empty')}
            </div>
          </div>
        ) : myEvents.map((e: any) => (
          <div key={e.id} style={{
            background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
            padding: '14px', marginBottom: '10px', boxShadow: 'var(--shadow)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500, marginBottom: 4 }}>
                {e.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {translateToken('category_event', e.category)} · {new Date(e.date_start).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)' }}>
                {t('account.proposed_on', { date: new Date(e.created_at).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }) })}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              {e.status === 'published' && (
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  background: 'rgba(217,95,59,0.08)', color: '#D95F3B',
                  padding: '2px 8px', borderRadius: 20,
                }}>{t('account.points_earned', { points: 25 })}</div>
              )}
              <div style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px',
                background: e.status === 'published' ? '#EBF6EC' : e.status === 'rejected' ? '#FEF0EC' : 'var(--accent-light)',
                color: e.status === 'published' ? '#2E7D32' : e.status === 'rejected' ? 'var(--primary)' : '#C49A35'
              }}>
                {e.status === 'published' ? t('account.status_published_event') : e.status === 'rejected' ? t('account.status_rejected_event') : t('account.status_pending')}
              </div>
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
          {t('account.logout_cta')}
        </button>
      </div>

      {/* Instagram */}
      <div style={{ padding: '10px 16px 0' }}>
        <a
          href="https://instagram.com/kidmapp"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '100%', padding: '14px', borderRadius: '100px',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            fontFamily: 'DM Sans', fontSize: '14px', fontWeight: 600,
            color: 'var(--primary)', cursor: 'pointer', textDecoration: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxSizing: 'border-box'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          {t('account.instagram_cta')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </a>
      </div>

      <DeleteAccountSection />

      {/* Footer */}
      <div style={{
        padding: '32px 16px 0',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}>
          <Link
            to="/privacy"
            style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            {t('common.privacy')}
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            to="/support"
            style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            {t('common.support')}
          </Link>
        </div>
        <div style={{
          fontFamily: 'Caveat, cursive',
          fontSize: '14px',
          color: 'var(--text-muted)',
          marginTop: '8px',
        }}>
          {t('account.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
