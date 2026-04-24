import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ = [
  {
    q: 'Comment proposer un nouveau lieu ?',
    a: 'Depuis la carte, appuyez sur le bouton + en bas à droite.',
  },
  {
    q: 'Comment signaler une information incorrecte ?',
    a: 'Sur la fiche du lieu, utilisez le bouton Contribuer.',
  },
  {
    q: 'Comment supprimer mon compte ?',
    a: 'Contactez-nous par email à hello@kidmapp.app.',
  },
  {
    q: "L'app est disponible sur Android ?",
    a: 'Pas encore, uniquement iOS pour le moment.',
  },
];

const SupportPage = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '120px' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(160deg, #FAF0EC 0%, #F0C4B4 100%)',
        padding: '20px 20px 36px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <svg style={{ position: 'absolute', top: '-20px', right: '-30px', width: '160px', height: '160px', opacity: 0.6 }} viewBox="0 0 160 160">
          <path d="M80,10 C115,8 148,35 155,70 C162,105 145,140 112,152 C79,164 42,150 22,120 C2,90 8,50 35,28 C52,14 62,11 80,10Z" fill="rgba(255,255,255,0.25)" />
        </svg>

        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text-muted)',
              textDecoration: 'none', marginBottom: '20px',
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
            Besoin d'aide&nbsp;?
          </h1>
          <div style={{
            fontFamily: 'Caveat, cursive',
            fontSize: '19px',
            color: 'var(--text-muted)',
            marginTop: '4px',
          }}>
            On est là pour vous aider ✦
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 20px 0' }}>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: '20px',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          marginBottom: '12px',
        }}>
          Questions fréquentes
        </h2>

        <div style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          padding: '4px 18px',
          boxShadow: 'var(--shadow)',
        }}>
          <Accordion type="single" collapsible>
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <AccordionTrigger style={{
                  fontFamily: 'DM Sans', fontSize: '15px', fontWeight: 500,
                  color: 'var(--text)', textAlign: 'left',
                }}>
                  {item.q}
                </AccordionTrigger>
                <AccordionContent style={{
                  fontFamily: 'DM Sans', fontSize: '14px',
                  color: 'var(--text-muted)', lineHeight: 1.6,
                }}>
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact */}
        <div style={{
          marginTop: '28px',
          padding: '24px',
          borderRadius: 'var(--radius)',
          background: 'var(--primary-light)',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'Fraunces, serif',
            fontSize: '18px',
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: '6px',
          }}>
            Une autre question&nbsp;?
          </div>
          <div style={{
            fontFamily: 'DM Sans',
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '16px',
          }}>
            Écrivez-nous, on répond rapidement.
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
