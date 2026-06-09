import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: 'Invalid protocol' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SSRF protection: block private/link-local/loopback hosts (literal IPs
    // and resolved DNS names). Refuses cloud metadata endpoints.
    const isBlockedIPv4 = (ip: string): boolean => {
      const parts = ip.split('.').map(Number);
      if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
        return true;
      }
      const [a, b] = parts;
      if (a === 10) return true;
      if (a === 127) return true;
      if (a === 0) return true;
      if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a >= 224) return true; // multicast / reserved
      return false;
    };
    const isBlockedIPv6 = (ip: string): boolean => {
      const lower = ip.toLowerCase();
      if (lower === '::1' || lower === '::') return true;
      if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
      if (lower.startsWith('::ffff:')) return isBlockedIPv4(lower.slice(7));
      return false;
    };
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
    const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
    const isIPv6 = hostname.includes(':');
    if (isIPv4 && isBlockedIPv4(hostname)) {
      return new Response(JSON.stringify({ error: 'Blocked host' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (isIPv6 && isBlockedIPv6(hostname)) {
      return new Response(JSON.stringify({ error: 'Blocked host' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!isIPv4 && !isIPv6) {
      const lowerHost = hostname.toLowerCase();
      if (lowerHost === 'localhost' || lowerHost.endsWith('.localhost') || lowerHost.endsWith('.local') || lowerHost.endsWith('.internal')) {
        return new Response(JSON.stringify({ error: 'Blocked host' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      try {
        const records = await Deno.resolveDns(hostname, 'A').catch(() => [] as string[]);
        const records6 = await Deno.resolveDns(hostname, 'AAAA').catch(() => [] as string[]);
        for (const ip of records) {
          if (isBlockedIPv4(ip)) {
            return new Response(JSON.stringify({ error: 'Blocked host' }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        for (const ip of records6) {
          if (isBlockedIPv6(ip)) {
            return new Response(JSON.stringify({ error: 'Blocked host' }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      } catch {
        return new Response(JSON.stringify({ error: 'DNS resolution failed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch image
    const imgRes = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'KidmappBot/1.0' },
      redirect: 'error',
    });
    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: 'Fetch failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const contentType = imgRes.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Not an image' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    if (bytes.byteLength > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Image too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine extension
    const pathname = parsed.pathname;
    const dotIdx = pathname.lastIndexOf('.');
    let ext = 'jpg';
    if (dotIdx >= 0) {
      const candidate = pathname.slice(dotIdx + 1).toLowerCase();
      if (/^[a-z0-9]{2,5}$/.test(candidate)) ext = candidate;
    }
    if (ext === 'jpeg') ext = 'jpg';

    // Scope upload path to the requesting user's folder so storage policies apply.
    const filename = `proposals/${userData.user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;


    const admin = createClient(supabaseUrl, serviceKey);
    const { error: uploadErr } = await admin.storage
      .from('location-photos')
      .upload(filename, bytes, { contentType, upsert: false });
    if (uploadErr) {
      return new Response(JSON.stringify({ error: uploadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: pub } = admin.storage.from('location-photos').getPublicUrl(filename);

    return new Response(JSON.stringify({ url: pub.publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
