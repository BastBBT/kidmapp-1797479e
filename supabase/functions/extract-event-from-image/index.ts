import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-3.7-flash';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BYTES = 12 * 1024 * 1024; // ~12 MB base64 payload cap

const CATEGORIES = ['Spectacle', 'Atelier', 'Festival', 'Fête', 'Marché', 'Exposition', 'Autre'];
const WEATHERS = ['En intérieur', 'En extérieur', 'Les deux'];

const BodySchema = z.object({
  imageBase64: z.string().min(10),
  mimeType: z.enum(ALLOWED_MIME),
});

const SYSTEM_PROMPT = `Tu es un assistant qui extrait les informations d'un événement family/kids à partir d'une image (capture d'écran de post, flyer, affiche). Analyse l'image et renvoie UNIQUEMENT un objet JSON valide, sans texte autour, sans markdown, correspondant exactement à ce schéma :

{
  "name": "string (obligatoire : titre/nom de l'événement)",
  "category": "Spectacle" | "Atelier" | "Festival" | "Fête" | "Marché" | "Exposition" | "Autre",
  "address": "string | null",
  "date_start": "YYYY-MM-DD | null",
  "date_end": "YYYY-MM-DD | null",
  "time": "HH:MM | null",
  "age_min": "number | null",
  "age_max": "number | null",
  "duration": "string | null",
  "weather": "En intérieur" | "En extérieur" | "Les deux" | null,
  "price": "string | null",
  "website": "string | null",
  "instagram": "string | null",
  "note": "string | null"
}

Règles strictes :
- "category" doit être STRICTEMENT une des 7 valeurs listées. Si aucune ne correspond, choisis "Autre".
- "weather" doit être STRICTEMENT une des 3 valeurs listées, ou null si non déductible.
- "date_start" : date la plus proche/pertinente si plusieurs dates. Format YYYY-MM-DD.
- Si l'événement a plusieurs créneaux distincts (dates récurrentes), liste-les en texte libre dans "note".
- Ne JAMAIS inventer une valeur. Si une info n'est pas présente ou pas fiable dans l'image, mets null (sauf name qui est obligatoire).
- "instagram" : handle sans @, ex "compte_insta".
- "website" : URL complète.
- "note" : informations supplémentaires non structurées (dates récurrentes multiples, précisions diverses).
- Si l'image ne contient visiblement pas d'événement lisible (photo floue, hors sujet, illisible), renvoie {"error": "raison courte"}.
- La réponse DOIT être du JSON valide (json), aucun texte autour.`;

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  // Accept YYYY-MM-DD directly
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // Accept DD/MM/YYYY
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m2) {
    const d = m2[1].padStart(2, '0');
    const mo = m2[2].padStart(2, '0');
    return `${m2[3]}-${mo}-${d}`;
  }
  return null;
}

function normalizeTime(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[:hH](\d{0,2})/);
  if (m) {
    const h = m[1].padStart(2, '0');
    const mi = (m[2] || '00').padStart(2, '0');
    return `${h}:${mi}`;
  }
  return null;
}

function normalizeInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (Number.isNaN(n) || n < 0 || n > 18) return null;
  return n;
}

function normalizeStr(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length > 0 ? s.slice(0, 2000) : null;
}

function normalizeCategory(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  // Tolerate accent variants
  const map: Record<string, string> = {
    'Marche': 'Marché', 'Fete': 'Fête',
  };
  const norm = map[v] ?? v;
  return CATEGORIES.includes(norm) ? norm : null;
}

function normalizeWeather(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  return WEATHERS.includes(v) ? v : null;
}

function normalizeExtracted(raw: any): Record<string, unknown> {
  // If model returned an explicit error field, propagate
  if (raw && typeof raw.error === 'string' && raw.error.trim()) {
    return { error: raw.error.trim().slice(0, 200) };
  }
  const name = normalizeStr(raw?.name);
  if (!name) {
    return { error: "Impossible d'identifier le nom de l'événement dans l'image." };
  }
  return {
    name,
    category: normalizeCategory(raw?.category) ?? 'Autre',
    address: normalizeStr(raw?.address),
    date_start: normalizeDate(raw?.date_start),
    date_end: normalizeDate(raw?.date_end),
    time: normalizeTime(raw?.time),
    age_min: normalizeInt(raw?.age_min),
    age_max: normalizeInt(raw?.age_max),
    duration: normalizeStr(raw?.duration),
    weather: normalizeWeather(raw?.weather),
    price: normalizeStr(raw?.price),
    website: normalizeStr(raw?.website),
    instagram: normalizeStr(raw?.instagram),
    note: normalizeStr(raw?.note),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // --- Auth: admin only ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonRes({ error: 'missing_auth' }, 401);
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return jsonRes({ error: 'invalid_auth' }, 401);
    }
    const { data: isAdmin, error: roleErr } = await admin.rpc('is_admin', { _user_id: userData.user.id });
    if (roleErr || !isAdmin) {
      return jsonRes({ error: 'forbidden' }, 403);
    }

    // --- Validate input ---
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonRes({ error: 'bad_request', details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { imageBase64, mimeType } = parsed.data;
    if (imageBase64.length > MAX_BYTES) {
      return jsonRes({ error: 'image_too_large', message: 'Image > 12MB.' }, 400);
    }

    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    // --- Call AI Gateway ---
    const gwRes = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': LOVABLE_API_KEY,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extrait les informations de cet événement et renvoie le JSON.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1200,
      }),
    });

    if (!gwRes.ok) {
      const errText = await gwRes.text().catch(() => '');
      // Relay rate-limit and credit errors with their message
      if (gwRes.status === 429 || gwRes.status === 402) {
        return jsonRes(
          { error: 'gateway_unavailable', message: errText.slice(0, 500) || 'AI Gateway temporarily unavailable.' },
          gwRes.status,
        );
      }
      console.error('AI Gateway error', gwRes.status, errText.slice(0, 800));
      return jsonRes({ error: 'gateway_error', message: errText.slice(0, 500) || 'AI Gateway error.' }, 502);
    }

    const gwData = await gwRes.json();
    const content: string = gwData?.choices?.[0]?.message?.content ?? '';

    let extracted: any = null;
    try {
      extracted = JSON.parse(content);
    } catch {
      // Model may have wrapped JSON in markdown fences despite instructions
      const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        try {
          extracted = JSON.parse(fenceMatch[1]);
        } catch {
          extracted = null;
        }
      }
    }
    if (!extracted || typeof extracted !== 'object') {
      return jsonRes({ error: 'parse_failed', message: 'Le modèle n’a pas renvoyé un JSON exploitable.' }, 502);
    }

    return jsonRes(normalizeExtracted(extracted));
  } catch (e) {
    console.error('extract-event-from-image error', e);
    return jsonRes({ error: String(e?.message ?? e) }, 500);
  }
});
