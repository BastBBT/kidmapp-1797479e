import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Lang = 'fr' | 'en' | 'es';

const LANGS: Lang[] = ['fr', 'en', 'es'];

const LANG_NAMES: Record<Lang, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
};

type Block = {
  title: string;
  list?: string[];
  text?: string;
  /** Ajoute le lien mailto hello@kidmapp.app à la fin du bloc. */
  email?: boolean;
};

/**
 * Document juridique consulté par des visiteurs de toutes langues (lien stores /
 * pied de page). Les trois versions sont affichées en même temps, celle du
 * navigateur en premier. La version française fait foi.
 */
const CONTENT: Record<Lang, {
  back: string;
  title: string;
  updated: string;
  blocks: Block[];
  authoritative: string;
}> = {
  fr: {
    back: 'Retour',
    title: 'Politique de confidentialité de Kidmapp',
    updated: 'Dernière mise à jour : avril 2026',
    blocks: [
      {
        title: 'Données collectées',
        list: [
          'Adresse email (lors de la création de compte)',
          'Contenu généré (contributions, propositions de lieux)',
        ],
      },
      {
        title: 'Utilisation des données',
        text: 'Vos données sont utilisées uniquement pour faire fonctionner l’application : authentification, affichage de vos contributions et favoris.',
      },
      {
        title: 'Partage des données',
        text: 'Aucune donnée n’est vendue ni partagée avec des tiers à des fins publicitaires. L’application utilise Supabase (hébergement EU) pour le stockage sécurisé des données.',
      },
      {
        title: 'Suppression de compte',
        text: 'Vous pouvez demander la suppression de votre compte et de vos données en nous contactant à :',
        email: true,
      },
      { title: 'Contact', email: true },
    ],
    authoritative: 'En cas de divergence entre les versions, la version française fait foi.',
  },
  en: {
    back: 'Back',
    title: 'Kidmapp privacy policy',
    updated: 'Last updated: April 2026',
    blocks: [
      {
        title: 'Data we collect',
        list: [
          'Email address (when you create an account)',
          'User-generated content (contributions, suggested places)',
        ],
      },
      {
        title: 'How we use your data',
        text: 'Your data is only used to run the app: authentication, and displaying your contributions and favorites.',
      },
      {
        title: 'Data sharing',
        text: 'No data is sold or shared with third parties for advertising purposes. The app uses Supabase (EU hosting) for secure data storage.',
      },
      {
        title: 'Account deletion',
        text: 'You can request the deletion of your account and your data by contacting us at:',
        email: true,
      },
      { title: 'Contact', email: true },
    ],
    authoritative: 'In case of any discrepancy between versions, the French version prevails.',
  },
  es: {
    back: 'Volver',
    title: 'Política de privacidad de Kidmapp',
    updated: 'Última actualización: abril de 2026',
    blocks: [
      {
        title: 'Datos recopilados',
        list: [
          'Dirección de correo electrónico (al crear una cuenta)',
          'Contenido generado (contribuciones, propuestas de lugares)',
        ],
      },
      {
        title: 'Uso de los datos',
        text: 'Tus datos se utilizan únicamente para que la aplicación funcione: autenticación y visualización de tus contribuciones y favoritos.',
      },
      {
        title: 'Compartir los datos',
        text: 'No se vende ni se comparte ningún dato con terceros con fines publicitarios. La aplicación utiliza Supabase (alojamiento en la UE) para el almacenamiento seguro de los datos.',
      },
      {
        title: 'Eliminación de la cuenta',
        text: 'Puedes solicitar la eliminación de tu cuenta y de tus datos escribiéndonos a:',
        email: true,
      },
      { title: 'Contacto', email: true },
    ],
    authoritative: 'En caso de discrepancia entre las versiones, prevalece la versión francesa.',
  },
};

const EMAIL_STYLE = {
  color: 'var(--primary)',
  fontWeight: 500,
  textDecoration: 'none',
} as const;

const scrollToLang = (lang: Lang) => {
  document.getElementById(`privacy-${lang}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const Section = ({ block, lang }: { block: Block; lang: Lang }) => (
  <section style={{ marginTop: '28px' }}>
    <h2 lang={lang} style={{
      fontFamily: 'Fraunces, serif',
      fontSize: '20px',
      fontWeight: 500,
      letterSpacing: '-0.02em',
      color: 'var(--text)',
      marginBottom: '8px',
    }}>
      {block.title}
    </h2>
    <div lang={lang} style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '15px',
      lineHeight: 1.65,
      color: 'var(--text)',
    }}>
      {block.list && (
        <ul style={{ paddingLeft: '20px', margin: 0, listStyleType: 'disc' }}>
          {block.list.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
      {block.text && <>{block.text}{block.email ? ' ' : null}</>}
      {block.email && (
        <a href="mailto:hello@kidmapp.app" style={EMAIL_STYLE}>hello@kidmapp.app</a>
      )}
      {block.text && block.email && '.'}
    </div>
  </section>
);

const PolicySection = ({ lang, showDivider }: { lang: Lang; showDivider: boolean }) => {
  const c = CONTENT[lang];

  return (
    <div id={`privacy-${lang}`} style={{ scrollMarginTop: '16px', paddingTop: showDivider ? '40px' : 0 }}>
      {showDivider && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ height: '1px', background: 'var(--border)', flex: 1 }} />
            <div style={{
              fontFamily: 'DM Sans',
              fontSize: '12px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              {LANG_NAMES[lang]}
            </div>
            <div style={{ height: '1px', background: 'var(--border)', flex: 1 }} />
          </div>

          <h2 lang={lang} style={{
            fontFamily: 'Fraunces, serif',
            fontSize: '24px',
            fontWeight: 500,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            lineHeight: 1.2,
          }}>
            {c.title}
          </h2>
          <div lang={lang} style={{
            fontFamily: 'Caveat, cursive',
            fontSize: '17px',
            color: 'var(--text-muted)',
            marginTop: '6px',
          }}>
            {c.updated}
          </div>
        </>
      )}

      {c.blocks.map((block, i) => <Section key={i} block={block} lang={lang} />)}
    </div>
  );
};

const PrivacyPage = () => {
  const { i18n } = useTranslation();

  const detected = (i18n.language || 'fr').split('-')[0] as Lang;
  const primary: Lang = LANGS.includes(detected) ? detected : 'fr';
  const ordered: Lang[] = [primary, ...LANGS.filter((l) => l !== primary)];
  const head = CONTENT[primary];

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
          <ArrowLeft className="w-4 h-4" /> {head.back}
        </Link>

        <h1 lang={primary} style={{
          fontFamily: 'Fraunces, serif',
          fontSize: '32px',
          fontWeight: 500,
          letterSpacing: '-0.03em',
          color: 'var(--text)',
          lineHeight: 1.15,
        }}>
          {head.title}
        </h1>
        <div lang={primary} style={{
          fontFamily: 'Caveat, cursive',
          fontSize: '17px',
          color: 'var(--text-muted)',
          marginTop: '6px',
        }}>
          {head.updated}
        </div>

        {/* Ancres de langue */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '18px' }}>
          {ordered.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => scrollToLang(lang)}
              style={{
                padding: '7px 15px',
                borderRadius: '100px',
                border: lang === primary ? 'none' : '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: 'DM Sans',
                fontSize: '13px',
                fontWeight: 500,
                background: lang === primary ? 'var(--primary)' : 'var(--surface)',
                color: lang === primary ? '#fff' : 'var(--text-muted)',
              }}
            >
              {LANG_NAMES[lang]}
            </button>
          ))}
        </div>

        {/* Les trois versions empilées, celle du navigateur en premier */}
        {ordered.map((lang, i) => (
          <PolicySection key={lang} lang={lang} showDivider={i > 0} />
        ))}

        <div lang={primary} style={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}>
          {head.authoritative}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
