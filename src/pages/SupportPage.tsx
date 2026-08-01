import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type Lang = 'fr' | 'en' | 'es';

const LANGS: Lang[] = ['fr', 'en', 'es'];

const LANG_NAMES: Record<Lang, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
};

/**
 * Page support = URL de support App Store, consultée par des visiteurs de toutes
 * langues. On n'utilise donc pas t() : les trois versions sont affichées en même
 * temps, celle du navigateur en premier.
 */
const CONTENT: Record<Lang, {
  back: string;
  heroTitle: string;
  heroSub: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
  contactTitle: string;
  contactSub: string;
}> = {
  fr: {
    back: 'Retour',
    heroTitle: 'Besoin d’aide ?',
    heroSub: 'On est là pour vous aider ✦',
    faqTitle: 'Questions fréquentes',
    faq: [
      {
        q: 'Comment proposer un nouveau lieu ?',
        a: 'Depuis la carte, appuyez sur le bouton + en bas à droite.',
      },
      {
        q: 'Comment signaler une information incorrecte ?',
        a: 'Sur la fiche du lieu, utilisez le bouton Contribuer.',
      },
      {
        q: 'Comment supprimer mon compte ?',
        a: 'Contactez-nous par email à hello@kidmapp.app.',
      },
      {
        q: 'L’app est disponible sur Android ?',
        a: 'Une version Android est en préparation. Pour l’instant, Kidmapp est disponible sur iOS et sur le web.',
      },
    ],
    contactTitle: 'Une autre question ?',
    contactSub: 'Écrivez-nous, on répond rapidement.',
  },
  en: {
    back: 'Back',
    heroTitle: 'Need help?',
    heroSub: 'We’re here to help ✦',
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'How do I suggest a new place?',
        a: 'From the map, tap the + button in the bottom right.',
      },
      {
        q: 'How do I report incorrect information?',
        a: 'On the place page, use the Contribute button.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Email us at hello@kidmapp.app.',
      },
      {
        q: 'Is the app available on Android?',
        a: 'An Android version is in the works. For now, Kidmapp is available on iOS and on the web.',
      },
    ],
    contactTitle: 'Another question?',
    contactSub: 'Write to us — we reply quickly.',
  },
  es: {
    back: 'Volver',
    heroTitle: '¿Necesitas ayuda?',
    heroSub: 'Estamos aquí para ayudarte ✦',
    faqTitle: 'Preguntas frecuentes',
    faq: [
      {
        q: '¿Cómo proponer un nuevo lugar?',
        a: 'Desde el mapa, pulsa el botón + abajo a la derecha.',
      },
      {
        q: '¿Cómo informar de una información incorrecta?',
        a: 'En la ficha del lugar, usa el botón Contribuir.',
      },
      {
        q: '¿Cómo eliminar mi cuenta?',
        a: 'Escríbenos a hello@kidmapp.app.',
      },
      {
        q: '¿La app está disponible en Android?',
        a: 'Estamos preparando una versión Android. Por ahora, Kidmapp está disponible en iOS y en la web.',
      },
    ],
    contactTitle: '¿Otra pregunta?',
    contactSub: 'Escríbenos, respondemos rápido.',
  },
};

const scrollToLang = (lang: Lang) => {
  document.getElementById(`faq-${lang}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const FaqSection = ({ lang, showDivider }: { lang: Lang; showDivider: boolean }) => {
  const c = CONTENT[lang];

  return (
    <div id={`faq-${lang}`} style={{ scrollMarginTop: '16px', paddingTop: showDivider ? '28px' : 0 }}>
      {showDivider && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
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
      )}

      <h2 lang={lang} style={{
        fontFamily: 'Fraunces, serif',
        fontSize: '20px',
        fontWeight: 500,
        letterSpacing: '-0.02em',
        marginBottom: '12px',
      }}>
        {c.faqTitle}
      </h2>

      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '4px 18px',
        boxShadow: 'var(--shadow)',
      }}>
        <Accordion type="single" collapsible>
          {c.faq.map((item, i) => (
            <AccordionItem
              key={i}
              value={`${lang}-${i}`}
              className="border-b last:border-b-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <AccordionTrigger lang={lang} style={{
                fontFamily: 'DM Sans', fontSize: '15px', fontWeight: 500,
                color: 'var(--text)', textAlign: 'left',
              }}>
                {item.q}
              </AccordionTrigger>
              <AccordionContent lang={lang} style={{
                fontFamily: 'DM Sans', fontSize: '14px',
                color: 'var(--text-muted)', lineHeight: 1.6,
              }}>
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

const SupportPage = () => {
  const { i18n } = useTranslation();

  const detected = (i18n.language || 'fr').split('-')[0] as Lang;
  const primary: Lang = LANGS.includes(detected) ? detected : 'fr';
  const ordered: Lang[] = [primary, ...LANGS.filter((l) => l !== primary)];
  const hero = CONTENT[primary];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '120px' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(160deg, #FAF0EC 0%, #F0C4B4 100%)',
        padding: '20px 20px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <svg style={{ position: 'absolute', top: '-20px', right: '-30px', width: '160px', height: '160px', opacity: 0.6 }} viewBox="0 0 160 160">
          <path d="M80,10 C115,8 148,35 155,70 C162,105 145,140 112,152 C79,164 42,150 22,120 C2,90 8,50 35,28 C52,14 62,11 80,10Z" fill="rgba(255,255,255,0.25)" />
        </svg>

        <div style={{ maxWidth: '640px', margin: '0 auto', position: 'relative' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text-muted)',
              textDecoration: 'none', marginBottom: '20px',
            }}
          >
            <ArrowLeft className="w-4 h-4" /> {hero.back}
          </Link>

          <h1 lang={primary} style={{
            fontFamily: 'Fraunces, serif',
            fontSize: '32px',
            fontWeight: 500,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            lineHeight: 1.15,
          }}>
            {hero.heroTitle}
          </h1>
          <div lang={primary} style={{
            fontFamily: 'Caveat, cursive',
            fontSize: '19px',
            color: 'var(--text-muted)',
            marginTop: '4px',
          }}>
            {hero.heroSub}
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
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: lang === primary ? 'var(--primary)' : 'rgba(255,255,255,0.65)',
                  color: lang === primary ? '#fff' : '#78716C',
                }}
              >
                {LANG_NAMES[lang]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ — les trois langues empilées, celle du navigateur en premier */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 20px 0' }}>
        {ordered.map((lang, i) => (
          <FaqSection key={lang} lang={lang} showDivider={i > 0} />
        ))}

        {/* Contact */}
        <div style={{
          marginTop: '32px',
          padding: '24px',
          borderRadius: 'var(--radius)',
          background: 'var(--primary-light)',
          textAlign: 'center',
        }}>
          <div lang={primary} style={{
            fontFamily: 'Fraunces, serif',
            fontSize: '18px',
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: '6px',
          }}>
            {hero.contactTitle}
          </div>
          <div style={{
            fontFamily: 'DM Sans',
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '16px',
            lineHeight: 1.6,
          }}>
            {ordered.map((lang) => (
              <div key={lang} lang={lang}>{CONTENT[lang].contactSub}</div>
            ))}
          </div>
          <a
            href="mailto:hello@kidmapp.app"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: '100px',
              background: 'var(--primary)',
              color: '#fff',
              fontFamily: 'DM Sans',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            hello@kidmapp.app
          </a>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
