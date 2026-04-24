import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginTop: '28px' }}>
    <h2 style={{
      fontFamily: 'Fraunces, serif',
      fontSize: '20px',
      fontWeight: 500,
      letterSpacing: '-0.02em',
      color: 'var(--text)',
      marginBottom: '8px',
    }}>
      {title}
    </h2>
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '15px',
      lineHeight: 1.65,
      color: 'var(--text)',
    }}>
      {children}
    </div>
  </section>
);

const PrivacyPage = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '120px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 20px 0' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text-muted)',
            textDecoration: 'none', marginBottom: '24px',
          }}
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <h1 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: '32px',
          fontWeight: 500,
          letterSpacing: '-0.03em',
          color: 'var(--text)',
          lineHeight: 1.15,
        }}>
          Politique de confidentialité de Kidmapp
        </h1>
        <div style={{
          fontFamily: 'Caveat, cursive',
          fontSize: '17px',
          color: 'var(--text-muted)',
          marginTop: '6px',
        }}>
          Dernière mise à jour : avril 2026
        </div>

        <Section title="Données collectées">
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>Adresse email (lors de la création de compte)</li>
            <li>Contenu généré (contributions, propositions de lieux)</li>
          </ul>
        </Section>

        <Section title="Utilisation des données">
          Vos données sont utilisées uniquement pour faire fonctionner l'application :
          authentification, affichage de vos contributions et favoris.
        </Section>

        <Section title="Partage des données">
          Aucune donnée n'est vendue ni partagée avec des tiers à des fins publicitaires.
          L'application utilise Supabase (hébergement EU) pour le stockage sécurisé des données.
        </Section>

        <Section title="Suppression de compte">
          Vous pouvez demander la suppression de votre compte et de vos données en nous
          contactant à :{' '}
          <a
            href="mailto:hello@kidmapp.app"
            style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}
          >
            hello@kidmapp.app
          </a>.
        </Section>

        <Section title="Contact">
          <a
            href="mailto:hello@kidmapp.app"
            style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}
          >
            hello@kidmapp.app
          </a>
        </Section>
      </div>
    </div>
  );
};

export default PrivacyPage;
