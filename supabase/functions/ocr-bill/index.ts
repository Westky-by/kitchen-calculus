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

    const systemPrompt = `คุณคือ OCR ใบเสร็จ/ใบกำกับภาษีของร้านอาหารไทย หน้าที่หลักคือดึง "ข้อมูลลูกค้า" และ "ยอดเงินรวมตามใบเสร็จ" ตอบกลับเป็น JSON เท่านั้น (ห้าม markdown ห้าม \`\`\`json)

รูปแบบ JSON:
{
  "doc_date": "YYYY-MM-DD หรือเว้นว่าง",
  "customer_name": "ชื่อ/บริษัทลูกค้า (สำคัญมาก ถ้าหาเจอใส่ให้ครบ)",
  "customer_address": "ที่อยู่ลูกค้าเต็ม (สำคัญมาก)",
  "customer_tax_id": "เลขประจำตัวผู้เสียภาษีลูกค้า 13 หลัก (สำคัญมาก ถ้าเจอ)",
  "items": [
    { "code": "", "description": "ชื่อรายการตามบิล", "qty": 2, "unit": "รายการ", "line_total": 840.00 }
  ],
  "grand_total": 7348.00
}

กฎสำคัญ:
- "line_total" คือ "จำนวนเงินรวมของรายการนั้นตามบิล" (คอลัมน์ขวาสุดของแต่ละบรรทัด) — ห้ามคำนวณเอง ให้ใช้ตัวเลขที่ปรากฏในบิลตรงๆ
- "qty" คือจำนวนหน่วยที่อยู่หน้ารายการ (ตัวเลขด้านซ้ายของชื่อรายการ)
- "grand_total" คือยอดสุทธิสุดท้ายที่ลูกค้าจ่ายตามบิล (เช่น Total / รวมทั้งสิ้น) — ใช้ตัวเลขในบิลตรงๆ ห้ามคำนวณ VAT/Service ใหม่
- ถ้าข้อมูลลูกค้าไม่มีในบิล ให้เว้นว่าง ห้ามเดา`;

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
