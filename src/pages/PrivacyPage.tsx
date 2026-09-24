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
          'Usage de l’application : pages consultées et provenance, clics sur les liens vers les sites des lieux et événements, progression dans la prise en main, type de support (site, iPhone, Android) et version de l’application, identifiant anonyme de mesure d’audience',
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
        text: 'Aucune donnée n’est vendue ni partagée avec des tiers à des fins publicitaires, et l’application ne contient aucun traceur publicitaire. Le stockage est assuré par Supabase (hébergement dans l’Union européenne). Les emails que nous vous envoyons — confirmation d’inscription, réinitialisation de mot de passe, et sélection hebdomadaire si vous l’avez activée — partent via le service d’envoi intégré à notre hébergeur applicatif, Lovable. Si vous activez les notifications, un identifiant technique de votre appareil (pas votre identité) est transmis à Firebase Cloud Messaging (Google), qui achemine la notification jusqu’à votre téléphone — son contenu ne comporte jamais le prénom ni l’âge d’un enfant. Le site public charge par ailleurs ses polices de caractères chez Google Fonts et ses fonds de carte chez CARTO, qui reçoivent à cette occasion votre adresse IP.',
      },
      {
        title: 'Mesure d’audience',
        text: 'Pour compter nos visiteurs sans cookie publicitaire, le site enregistre dans votre navigateur (stockage local) un identifiant tiré au hasard, et l’application en génère un à son installation. Il ne contient aucune information sur vous et sert uniquement à produire nos propres statistiques de fréquentation : nombre de visites et de visiteurs, répartition entre le site, iPhone et Android, versions de l’application utilisées. Il n’est jamais partagé, ni recoupé avec d’autres sites ou applications. Si vous êtes connecté, ces statistiques sont rattachées à votre compte, comme les pages consultées. Elles sont supprimées au bout de 12 mois. Vous pouvez effacer l’identifiant à tout moment en supprimant les données du site dans votre navigateur, ou en désinstallant l’application.',
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
      {
        title: 'Responsable du traitement',
        text: 'Kidmapp est responsable du traitement de vos données. Vous pouvez nous contacter à :',
        email: true,
      },
      {
        title: 'Base légale des traitements',
        list: [
          'Compte, contributions, favoris, zone déclarée : exécution du contrat qui vous lie à Kidmapp (vous fournir le service que vous avez demandé)',
          'Données de vos enfants (mois et année de naissance, prénom) : consentement du titulaire de l’autorité parentale, donné en les renseignant — retirable à tout moment en supprimant l’enfant',
          'Sélection hebdomadaire par email et alertes nouveaux lieux : consentement, recueilli par la case à cocher dans « Mon compte », retirable à tout moment',
          'Mesure du trafic apporté aux lieux et événements référencés (clics sortants, pages consultées) et mesure de fréquentation du service (visites, répartition entre le site et les applications) : intérêt légitime de Kidmapp à évaluer et améliorer le service rendu aux établissements',
        ],
      },
      {
        title: 'Vos droits',
        text: 'Conformément au Règlement général sur la protection des données (RGPD), vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité sur vos données. La plupart s’exercent directement dans l’application, depuis « Mon compte » (modification, suppression). Pour toute autre demande, écrivez-nous à :',
        email: true,
      },
      {
        title: 'Réclamation',
        text: 'Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission nationale de l’informatique et des libertés (CNIL), l’autorité française de protection des données : www.cnil.fr.',
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
          'App usage: pages viewed and where you came from, clicks on links to the websites of places and events, how far you got in the guided tour, the kind of device (website, iPhone, Android) and app version, an anonymous audience-measurement identifier',
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
        text: 'No data is sold or shared with third parties for advertising purposes, and the app contains no advertising trackers. Storage is provided by Supabase (hosted in the European Union). The emails we send you — sign-up confirmation, password reset, and the weekly picks if you turned them on — go out through the email service built into our application host, Lovable. If you turn on push notifications, a technical identifier for your device (not your identity) is sent to Firebase Cloud Messaging (Google), which delivers the notification to your phone — its content never includes a child’s first name or age. The public website also loads its fonts from Google Fonts and its map tiles from CARTO, which receive your IP address in the process.',
      },
      {
        title: 'Audience measurement',
        text: 'To count our visitors without any advertising cookie, the website stores a randomly generated identifier in your browser (local storage), and the app creates one when it is installed. It contains no information about you and is used only to produce our own usage statistics: number of visits and visitors, split between the website, iPhone and Android, and which app versions are in use. It is never shared, nor matched with other websites or apps. If you are signed in, these statistics are linked to your account, like the pages you view. They are deleted after 12 months. You can erase the identifier at any time by clearing the site data in your browser, or by uninstalling the app.',
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
      {
        title: 'Data controller',
        text: 'Kidmapp is the data controller for your data. You can contact us at:',
        email: true,
      },
      {
        title: 'Legal basis for processing',
        list: [
          'Account, contributions, favorites, declared area: performance of the contract between you and Kidmapp (providing the service you asked for)',
          'Your children’s data (month and year of birth, first name): consent of the holder of parental authority, given when you enter it — withdrawable at any time by deleting the child',
          'Weekly picks email and new-places alerts: consent, collected via the checkbox in “My account”, withdrawable at any time',
          'Measuring the traffic we bring to the places and events we list (outbound clicks, pages viewed) and measuring how the service is used (visits, split between the website and the apps): Kidmapp’s legitimate interest in assessing and improving the service we provide to listed venues',
        ],
      },
      {
        title: 'Your rights',
        text: 'Under the General Data Protection Regulation (GDPR), you have the right to access, rectify, erase, restrict, object to, and port your data. Most of these can be exercised directly in the app, from “My account” (edit, delete). For any other request, write to us at:',
        email: true,
      },
      {
        title: 'Complaints',
        text: 'If you believe your rights are not being respected, you can lodge a complaint with the CNIL (Commission nationale de l’informatique et des libertés), the French data protection authority: www.cnil.fr.',
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
          'Uso de la aplicación: páginas consultadas y procedencia, clics en los enlaces a los sitios de lugares y eventos, avance en la visita guiada, tipo de soporte (web, iPhone, Android) y versión de la aplicación, identificador anónimo de medición de audiencia',
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
        text: 'No se vende ni se comparte ningún dato con terceros con fines publicitarios, y la aplicación no contiene ningún rastreador publicitario. El almacenamiento corre a cargo de Supabase (alojamiento en la Unión Europea). Los correos que te enviamos — confirmación de registro, restablecimiento de contraseña y selección semanal si la has activado — salen a través del servicio de envío integrado en nuestro proveedor de alojamiento, Lovable. Si activas las notificaciones push, se envía un identificador técnico de tu dispositivo (no tu identidad) a Firebase Cloud Messaging (Google), que entrega la notificación a tu teléfono — su contenido nunca incluye el nombre ni la edad de un hijo. Además, el sitio público carga sus tipografías desde Google Fonts y sus mapas desde CARTO, que reciben así tu dirección IP.',
      },
      {
        title: 'Medición de audiencia',
        text: 'Para contar a nuestros visitantes sin ninguna cookie publicitaria, la web guarda en tu navegador (almacenamiento local) un identificador generado al azar, y la aplicación crea uno al instalarse. No contiene ninguna información sobre ti y solo sirve para elaborar nuestras propias estadísticas de uso: número de visitas y de visitantes, reparto entre la web, iPhone y Android, y versiones de la aplicación en uso. Nunca se comparte ni se cruza con otros sitios o aplicaciones. Si has iniciado sesión, estas estadísticas quedan vinculadas a tu cuenta, igual que las páginas consultadas. Se eliminan a los 12 meses. Puedes borrar el identificador en cualquier momento eliminando los datos del sitio en tu navegador o desinstalando la aplicación.',
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
      {
        title: 'Responsable del tratamiento',
        text: 'Kidmapp es responsable del tratamiento de tus datos. Puedes contactarnos en:',
        email: true,
      },
      {
        title: 'Base legal de los tratamientos',
        list: [
          'Cuenta, contribuciones, favoritos, zona declarada: ejecución del contrato que te vincula con Kidmapp (prestarte el servicio que has solicitado)',
          'Datos de tus hijos (mes y año de nacimiento, nombre): consentimiento del titular de la patria potestad, otorgado al indicarlos — retirable en cualquier momento eliminando al hijo',
          'Selección semanal por correo y alertas de nuevos lugares: consentimiento, recogido mediante la casilla en «Mi cuenta», retirable en cualquier momento',
          'Medición del tráfico que aportamos a los lugares y eventos incluidos (clics salientes, páginas consultadas) y medición de la frecuentación del servicio (visitas, reparto entre la web y las aplicaciones): interés legítimo de Kidmapp en evaluar y mejorar el servicio prestado a los establecimientos',
        ],
      },
      {
        title: 'Tus derechos',
        text: 'De conformidad con el Reglamento General de Protección de Datos (RGPD), dispones de un derecho de acceso, rectificación, supresión, limitación, oposición y portabilidad sobre tus datos. La mayoría se ejercen directamente en la aplicación, desde «Mi cuenta» (modificar, eliminar). Para cualquier otra solicitud, escríbenos a:',
        email: true,
      },
      {
        title: 'Reclamaciones',
        text: 'Si consideras que no se respetan tus derechos, puedes presentar una reclamación ante la CNIL (Commission nationale de l’informatique et des libertés), la autoridad francesa de protección de datos: www.cnil.fr.',
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
