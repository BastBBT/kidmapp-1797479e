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
    updated: 'Dernière mise à jour : septembre 2026',
    blocks: [
      {
        title: 'Données collectées',
        list: [
          'Adresse email et prénom (lors de la création de compte)',
          'Mois et année de naissance de vos enfants, et leur prénom si vous le renseignez',
          'La zone que vous déclarez (commune, quartier, rayon) — l’application ne vous géolocalise jamais',
          'Vos préférences : favoris, avis « pour nous » / « pas pour nous », réglages et réactions à la sélection hebdomadaire, langue',
          'Contenu généré (contributions, propositions de lieux et d’événements, photos, commentaires après une sortie)',
          'Usage de l’application : pages consultées et provenance, clics sur les liens vers les sites des lieux et événements, progression dans la prise en main',
          'Réponse à la question « comment avez-vous connu Kidmapp ? », si vous y répondez',
          'Points et récompenses liés à vos contributions',
          'Journal des emails qui vous sont envoyés (destinataire, succès ou échec de remise)',
        ],
      },
      {
        title: 'Les données de vos enfants',
        text: 'Nous demandons le mois et l’année de naissance, jamais la date exacte, et nous ne stockons aucune tranche d’âge : elle est recalculée à l’affichage, pour ne pas se périmer à l’anniversaire. Le prénom est facultatif. Ces données servent à adapter les lieux et les sorties qui vous sont proposés. Si vous activez les emails, le prénom que vous avez renseigné apparaît dans le message et transite donc par notre prestataire d’envoi — ne le renseignez pas si vous préférez l’éviter. Vous pouvez supprimer un enfant à tout moment depuis « Mon compte » : sa fiche est alors effacée.',
      },
      {
        title: 'Utilisation des données',
        text: 'Vos données servent à faire fonctionner l’application : authentification, affichage de vos contributions et favoris, adaptation des suggestions à l’âge de vos enfants et à la zone que vous avez déclarée, et envoi de la sélection hebdomadaire si vous l’avez demandée. Les clics sur les liens sortants nous servent à mesurer le trafic que nous apportons aux lieux et événements référencés.',
      },
      {
        title: 'Ce qui est public',
        text: 'Vos contributions sur une fiche de lieu sont visibles de tous, y compris des visiteurs non connectés, accompagnées de votre prénom (ou de la mention « Une famille » si vous n’en avez pas renseigné). Les photos que vous joignez le sont également. Le reste — vos enfants, votre zone, vos favoris, vos avis — n’est jamais affiché à d’autres utilisateurs.',
      },
      {
        title: 'Partage des données',
        text: 'Aucune donnée n’est vendue ni partagée avec des tiers à des fins publicitaires, et l’application ne contient aucun traceur publicitaire. Le stockage est assuré par Supabase (hébergement dans l’Union européenne). Les emails que nous vous envoyons — confirmation d’inscription, réinitialisation de mot de passe, et sélection hebdomadaire si vous l’avez activée — partent via le service d’envoi intégré à notre hébergeur applicatif, Lovable. Le site public charge par ailleurs ses polices de caractères chez Google Fonts et ses fonds de carte chez CARTO, qui reçoivent à cette occasion votre adresse IP.',
      },
      {
        title: 'Durées de conservation',
        list: [
          'Statistiques de consultation : 12 mois',
          'Historique des sélections hebdomadaires envoyées : 13 mois',
          'Trace d’une suppression de compte : l’adresse email est conservée 12 mois, puis anonymisée',
          'Le reste est conservé tant que votre compte existe',
        ],
      },
      {
        title: 'Suppression de compte',
        text: 'Vous pouvez supprimer votre compte vous-même, depuis « Mon compte », sur les trois applications. Vos données personnelles sont alors effacées : profil, enfants, zone, favoris, avis, réglages d’envoi. Deux choses subsistent volontairement : vos contributions déjà publiées et les photos qui les accompagnent, qui restent en ligne mais ne sont plus rattachées à vous ni à votre prénom ; et une trace de la suppression elle-même, contenant votre adresse email, conservée 12 mois puis anonymisée, pour pouvoir répondre à une réclamation. Pour toute question, écrivez-nous à :',
        email: true,
      },
      { title: 'Contact', email: true },
    ],
    authoritative: 'En cas de divergence entre les versions, la version française fait foi.',
  },
  en: {
    back: 'Back',
    title: 'Kidmapp privacy policy',
    updated: 'Last updated: September 2026',
    blocks: [
      {
        title: 'Data we collect',
        list: [
          'Email address and first name (when you create an account)',
          'Your children’s month and year of birth, and their first name if you choose to give it',
          'The area you declare (town, neighbourhood, radius) — the app never asks for your position',
          'Your preferences: favorites, “a good fit” / “not for us” feedback, weekly picks settings and reactions, language',
          'User-generated content (contributions, suggested places and events, photos, post-outing comments)',
          'App usage: pages viewed and where you came from, clicks on links to the websites of places and events, how far you got in the guided tour',
          'Your answer to “how did you hear about Kidmapp?”, if you answer it',
          'Points and rewards tied to your contributions',
          'A log of the emails we send you (recipient, whether delivery succeeded)',
        ],
      },
      {
        title: 'Your children’s data',
        text: 'We ask for the month and year of birth, never the exact date, and we store no age group: it is recalculated on display, so it cannot go stale on a birthday. The first name is optional. This data is used to tailor the places and outings we suggest. If you turn emails on, the first name you gave appears in the message and therefore passes through our email provider — leave it blank if you would rather avoid that. You can delete a child at any time from “My account”: their record is erased.',
      },
      {
        title: 'How we use your data',
        text: 'Your data is used to run the app: authentication, displaying your contributions and favorites, tailoring suggestions to your children’s ages and to the area you declared, and sending the weekly picks if you asked for them. Clicks on outbound links let us measure the traffic we bring to the places and events we list.',
      },
      {
        title: 'What is public',
        text: 'Your contributions on a place page are visible to everyone, including signed-out visitors, along with your first name (or “A family” if you did not give one). Any photos you attach are public too. Everything else — your children, your area, your favorites, your feedback — is never shown to other users.',
      },
      {
        title: 'Data sharing',
        text: 'No data is sold or shared with third parties for advertising purposes, and the app contains no advertising trackers. Storage is provided by Supabase (hosted in the European Union). The emails we send you — sign-up confirmation, password reset, and the weekly picks if you turned them on — go out through the email service built into our application host, Lovable. The public website also loads its fonts from Google Fonts and its map tiles from CARTO, which receive your IP address in the process.',
      },
      {
        title: 'How long we keep your data',
        list: [
          'Page-view statistics: 12 months',
          'History of weekly picks sent: 13 months',
          'Record of an account deletion: the email address is kept for 12 months, then anonymised',
          'Everything else is kept for as long as your account exists',
        ],
      },
      {
        title: 'Account deletion',
        text: 'You can delete your account yourself, from “My account”, on all three apps. Your personal data is then erased: profile, children, area, favorites, feedback, email settings. Two things deliberately remain: contributions you have already published and their photos, which stay online but are no longer tied to you or to your first name; and a record of the deletion itself, containing your email address, kept for 12 months and then anonymised, so we can answer a complaint. For any question, write to us at:',
        email: true,
      },
      { title: 'Contact', email: true },
    ],
    authoritative: 'In case of any discrepancy between versions, the French version prevails.',
  },
  es: {
    back: 'Volver',
    title: 'Política de privacidad de Kidmapp',
    updated: 'Última actualización: septiembre de 2026',
    blocks: [
      {
        title: 'Datos recopilados',
        list: [
          'Dirección de correo electrónico y nombre (al crear una cuenta)',
          'Mes y año de nacimiento de tus hijos, y su nombre si decides indicarlo',
          'La zona que declaras (municipio, barrio, radio) — la aplicación nunca te geolocaliza',
          'Tus preferencias: favoritos, valoraciones «nos encaja» / «no es para nosotros», ajustes y reacciones a la selección semanal, idioma',
          'Contenido generado (contribuciones, propuestas de lugares y eventos, fotos, comentarios después de una salida)',
          'Uso de la aplicación: páginas consultadas y procedencia, clics en los enlaces a los sitios de lugares y eventos, avance en la visita guiada',
          'Tu respuesta a «¿cómo conociste Kidmapp?», si la respondes',
          'Puntos y recompensas vinculados a tus contribuciones',
          'Registro de los correos que te enviamos (destinatario, éxito o fallo del envío)',
        ],
      },
      {
        title: 'Los datos de tus hijos',
        text: 'Pedimos el mes y el año de nacimiento, nunca la fecha exacta, y no almacenamos ninguna franja de edad: se recalcula al mostrarla, para que no quede desfasada en cada cumpleaños. El nombre es opcional. Estos datos sirven para adaptar los lugares y las salidas que te proponemos. Si activas los correos, el nombre que hayas indicado aparece en el mensaje y pasa por tanto por nuestro proveedor de envío — no lo indiques si prefieres evitarlo. Puedes eliminar a un hijo en cualquier momento desde «Mi cuenta»: su ficha se borra entonces.',
      },
      {
        title: 'Uso de los datos',
        text: 'Tus datos sirven para que la aplicación funcione: autenticación, visualización de tus contribuciones y favoritos, adaptación de las sugerencias a la edad de tus hijos y a la zona que has declarado, y envío de la selección semanal si lo has solicitado. Los clics en los enlaces salientes nos sirven para medir el tráfico que aportamos a los lugares y eventos incluidos.',
      },
      {
        title: 'Qué es público',
        text: 'Tus contribuciones en la ficha de un lugar son visibles para todos, incluidos los visitantes sin cuenta, junto a tu nombre (o la mención «Una familia» si no has indicado ninguno). Las fotos que adjuntes también son públicas. El resto — tus hijos, tu zona, tus favoritos, tus valoraciones — nunca se muestra a otros usuarios.',
      },
      {
        title: 'Compartir los datos',
        text: 'No se vende ni se comparte ningún dato con terceros con fines publicitarios, y la aplicación no contiene ningún rastreador publicitario. El almacenamiento corre a cargo de Supabase (alojamiento en la Unión Europea). Los correos que te enviamos — confirmación de registro, restablecimiento de contraseña y selección semanal si la has activado — salen a través del servicio de envío integrado en nuestro proveedor de alojamiento, Lovable. Además, el sitio público carga sus tipografías desde Google Fonts y sus mapas desde CARTO, que reciben así tu dirección IP.',
      },
      {
        title: 'Plazos de conservación',
        list: [
          'Estadísticas de consulta: 12 meses',
          'Historial de las selecciones semanales enviadas: 13 meses',
          'Registro de una eliminación de cuenta: la dirección de correo se conserva 12 meses y después se anonimiza',
          'El resto se conserva mientras exista tu cuenta',
        ],
      },
      {
        title: 'Eliminación de la cuenta',
        text: 'Puedes eliminar tu cuenta tú mismo, desde «Mi cuenta», en las tres aplicaciones. Tus datos personales se borran entonces: perfil, hijos, zona, favoritos, valoraciones, ajustes de envío. Dos cosas permanecen de forma deliberada: las contribuciones que ya hayas publicado y sus fotos, que siguen en línea pero dejan de estar vinculadas a ti ni a tu nombre; y un registro de la propia eliminación, con tu dirección de correo, conservado 12 meses y después anonimizado, para poder responder a una reclamación. Para cualquier duda, escríbenos a:',
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
