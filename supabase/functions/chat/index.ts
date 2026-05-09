import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const callerClient = createClient(supabaseUrl, anonKey);
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      console.error("Auth failed:", claimsErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    // Verify user is active (use service role to bypass RLS)
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_active")
      .eq("id", userId)
      .single();
    if (!profile?.is_active) {
      return new Response(JSON.stringify({ error: "Account disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch app data for context (service role for read-only context)
    const supabase = adminClient;

    const [ingredientsRes, recipesRes, categoriesRes] = await Promise.all([
      supabase.from("ingredients").select("name, category, cost_per_unit, usage_unit, purchase_price, purchase_unit").limit(200),
      supabase.from("recipes").select("name, category, cost_per_portion, selling_price, grand_total, real_fc_percent, profit_percent, portion_size, raw_material_cost, total_product_cost").limit(200),
      supabase.from("recipe_categories").select("label, value, icon").order("sort_order"),
    ]);

    const ingredientsSummary = (ingredientsRes.data || [])
      .map((i: any) => `${i.name} (${i.category}) - ต้นทุน ${i.cost_per_unit}/${i.usage_unit}, ซื้อ ${i.purchase_price}/${i.purchase_unit}`)
      .join("\n");

    const recipesSummary = (recipesRes.data || [])
      .map((r: any) => `${r.name} (${r.category}) - ต้นทุน/จาน ${r.cost_per_portion}, ราคาขาย ${r.selling_price}, Grand Total ${r.grand_total}, FC% ${r.real_fc_percent}, กำไร ${r.profit_percent}%`)
      .join("\n");

    const categoriesList = (categoriesRes.data || [])
      .map((c: any) => `${c.icon} ${c.label}`)
      .join(", ");

    const systemPrompt = `คุณเป็นผู้ช่วย AI ของระบบ Kitchen Calculus - ระบบคำนวณต้นทุนอาหารสำหรับร้านอาหาร

ข้อมูลในระบบปัจจุบัน:

📦 วัตถุดิบทั้งหมด ${ingredientsRes.data?.length || 0} รายการ:
${ingredientsSummary || "ยังไม่มีวัตถุดิบ"}

🍽️ สูตรอาหารทั้งหมด ${recipesRes.data?.length || 0} รายการ:
${recipesSummary || "ยังไม่มีสูตรอาหาร"}

📂 หมวดหมู่: ${categoriesList || "ยังไม่มีหมวดหมู่"}

คุณสามารถ:
- ตอบคำถามเกี่ยวกับต้นทุนอาหาร ราคาขาย กำไร FC% ของแต่ละเมนู
- เปรียบเทียบเมนู แนะนำเมนูที่กำไรดี หรือเมนูที่ต้นทุนสูง
- ให้คำแนะนำในการปรับราคา ลดต้นทุน
- วิเคราะห์ภาพรวมของร้าน
- ตอบเป็นภาษาไทยเป็นหลัก ใช้ภาษาที่เข้าใจง่าย
- ใช้ตัวเลขและข้อมูลจริงจากระบบในการตอบ

สูตรคำนวณที่ใช้:
- Q-Factor = 15% ของ Raw Material Cost
- Total Product Cost = Raw Material + Q-Factor + Overhead
- Suggested Price = Cost per Portion / (Target FC% / 100)
- Service Charge = 10%, VAT = 7%
- Grand Total = Selling Price + SC + VAT
- Real FC% = Cost per Portion / Selling Price * 100
- Profit% = (Selling Price - Cost per Portion) / Selling Price * 100`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "เครดิต AI หมด กรุณาเติมเครดิต" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
