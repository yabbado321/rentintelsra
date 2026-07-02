import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  kind: 'triage' | 'reply';
  // triage
  description?: string;
  // reply
  tenantMessage?: string;
  tenantName?: string;
  unit?: string;
  rent?: number;
  leaseNotes?: string;
}

const TRIAGE_SYSTEM = `You are a property maintenance triage AI. Given a tenant's maintenance description, return STRICT JSON:
{
  "priority": "P1" | "P2" | "P3",
  "category": string,                 // e.g. "Plumbing", "HVAC", "Electrical", "Appliance", "Cosmetic"
  "severity": "Emergency" | "Urgent" | "Standard" | "Low",
  "estimatedCostRange": string,       // e.g. "$120-$250"
  "vendorType": string,               // e.g. "Licensed plumber"
  "slaHours": number,                 // hours to resolve
  "tenantSelfFixSteps": string[],     // 0-4 short safe steps; [] if not safe
  "summary": string                   // 1-2 sentence summary for the work order
}
P1 = safety/major damage (water leak, no heat in winter, gas, electrical hazard).
P2 = significant inconvenience (HVAC in summer, fridge out, no hot water).
P3 = minor (cosmetic, single bulb, slow drain). Return JSON only.`;

const REPLY_SYSTEM = `You are an empathetic, professional property manager assistant. Draft a concise (under 90 words) reply to a tenant.

STRICT LEASE-REFERENCE RULES (MANDATORY):
- NEVER reference specific lease clause numbers, section numbers, paragraph numbers, article numbers, exhibit letters, addendum names, or schedule identifiers (e.g. "Section 7b", "Paragraph 12", "Exhibit A", "Addendum 2") unless the exact clause text was explicitly supplied in the leaseNotes input.
- When referencing lease obligations, ALWAYS use general descriptive language such as: "Per your lease agreement, minor repairs are the tenant's responsibility" — NEVER "Per Section 7b of your lease...".
- If a specific section number is needed to resolve the issue, instead instruct the property manager to supply the exact citation before sending.
- Do not fabricate clause identifiers to appear authoritative.

Be specific, offer concrete next steps. Return STRICT JSON:
{
  "reply": string,
  "sentiment": "Positive" | "Neutral" | "Frustrated" | "Angry",
  "churnRisk": "Low" | "Medium" | "High",
  "suggestedAction": string
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json() as Body;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    let system = '';
    let user = '';
    if (body.kind === 'triage') {
      if (!body.description) throw new Error('description required');
      system = TRIAGE_SYSTEM;
      user = `Tenant maintenance request: """${body.description}"""`;
    } else if (body.kind === 'reply') {
      if (!body.tenantMessage) throw new Error('tenantMessage required');
      system = REPLY_SYSTEM;
      user = `Tenant: ${body.tenantName ?? 'Tenant'} (Unit ${body.unit ?? 'N/A'})
Monthly rent: ${body.rent ? `$${body.rent}` : 'unknown'}
Lease notes: ${body.leaseNotes ?? 'none'}
Message: """${body.tenantMessage}"""`;
    } else {
      throw new Error('unknown kind');
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: 'Rate limit, try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI gateway ${aiRes.status}: ${txt}`);
    }

    const ai = await aiRes.json();
    const content = ai.choices?.[0]?.message?.content ?? '{}';
    let data;
    try { data = JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); data = m ? JSON.parse(m[0]) : {}; }

    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('ai-assist error', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
