// OCR bill image using Lovable AI (Gemini Flash vision)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const callerClient = createClient(supabaseUrl, anonKey);
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image } = await req.json();
    if (!image || typeof image !== "string") {
      return new Response(JSON.stringify({ error: "image (base64 data URL) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `คุณคือ OCR ใบเสร็จ/ใบกำกับภาษีของร้านอาหารไทย ดึงข้อมูลจากรูปและตอบกลับเป็น JSON เท่านั้น
รูปแบบ JSON:
{
  "doc_date": "YYYY-MM-DD หรือเว้นว่าง",
  "customer_name": "ชื่อลูกค้า (ถ้ามี)",
  "customer_address": "ที่อยู่ลูกค้า (ถ้ามี)",
  "customer_tax_id": "เลขผู้เสียภาษีลูกค้า 13 หลัก (ถ้ามี)",
  "items": [
    { "code": "รหัสสินค้า (ถ้าไม่มีให้เว้นว่าง)", "description": "ชื่อรายการ", "qty": 1, "unit": "รายการ", "price": 100 }
  ],
  "grand_total": 0
}
- grand_total คือยอดสุทธิที่ลูกค้าจ่าย (รวม VAT/Service)
- ห้ามใส่ markdown ห้ามใส่ \`\`\`json - ตอบกลับเป็น JSON ดิบเท่านั้น`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "ดึงข้อมูลจากบิลนี้" },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: "AI gateway error", details: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    let content = data?.choices?.[0]?.message?.content ?? "{}";
    content = content.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
    let parsed: unknown = {};
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    return new Response(JSON.stringify({ data: parsed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
