import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, origin } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Validate driver exists + active (server-side, bypassing RLS)
    const { data: driver, error: driverError } = await supabaseAdmin
      .from("delivery_drivers")
      .select("driver_name, is_active, company_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (driverError) throw driverError;

    if (!driver) {
      return new Response(JSON.stringify({ error: "Email não cadastrado como entregador" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!driver.is_active) {
      return new Response(JSON.stringify({ error: "Conta de entregador desativada" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", driver.company_id)
      .maybeSingle();

    const companyName = company?.name || "Cardpon";
    const driverName = driver.driver_name || "Entregador";

    // Generate an email OTP (6-digit) WITHOUT sending any default auth email
    const redirectTo = origin ? `${String(origin).replace(/\/$/, "")}/driver` : undefined;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (linkError) throw linkError;

    const otp = linkData?.properties?.email_otp;

    if (!otp) {
      throw new Error("Não foi possível gerar o código OTP");
    }

    // Send custom email with the OTP code
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Cardpon <noreply@cardpon.com.br>",
      to: [normalizedEmail],
      subject: `Seu código de acesso (Entregador) - ${companyName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 22px;text-align:center;background:linear-gradient(135deg,#10B981 0%,#059669 100%);">
              <div style="font-size:44px;line-height:1;margin-bottom:10px;">🛵</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">Área do Entregador</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">${companyName}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 28px 10px;">
              <p style="margin:0 0 10px;color:#111827;font-size:16px;line-height:1.6;">Olá, <strong>${driverName}</strong>!</p>
              <p style="margin:0 0 18px;color:#6b7280;font-size:14px;line-height:1.6;">Use o código abaixo para entrar no app. Ele expira em alguns minutos.</p>

              <div style="text-align:center;margin:18px 0 18px;">
                <div style="display:inline-block;padding:16px 22px;border-radius:14px;background:#0b1220;letter-spacing:8px;font-weight:800;font-size:22px;color:#ffffff;">
                  ${otp}
                </div>
              </div>

              <p style="margin:0 0 16px;color:#6b7280;font-size:13px;line-height:1.6;">Abra o app e digite esse código na tela <strong>/driver/login</strong>.</p>

              <div style="border:1px solid #e5e7eb;background:#f9fafb;border-radius:12px;padding:14px 14px;margin:0 0 18px;">
                <p style="margin:0;color:#374151;font-size:12.5px;line-height:1.55;">
                  Segurança: este código é exclusivo para a <strong>Área do Entregador</strong> e não dá acesso ao painel do lojista.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 22px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">Se você não solicitou este código, ignore este email.</p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Cardpon</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    });

    if (emailError) throw emailError;

    return new Response(
      JSON.stringify({ success: true, message: "Código OTP enviado", emailId: emailData?.id ?? null }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("send-driver-otp error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
