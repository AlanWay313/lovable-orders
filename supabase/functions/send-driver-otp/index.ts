import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get driver info
    const { data: driver, error: driverError } = await supabaseAdmin
      .from("delivery_drivers")
      .select("id, driver_name, is_active, company_id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (driverError) throw driverError;

    if (!driver) {
      return new Response(
        JSON.stringify({ error: "Email não cadastrado como entregador" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!driver.is_active) {
      return new Response(
        JSON.stringify({ error: "Conta de entregador desativada" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get company name
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", driver.company_id)
      .single();

    // Generate OTP using Supabase Auth
    const { data: otpData, error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    if (otpError) throw otpError;

    // Send custom email via Resend
    const driverName = driver.driver_name || "Entregador";
    const companyName = company?.name || "a empresa";

    const emailResponse = await resend.emails.send({
      from: "Cardpon <noreply@cardpon.com.br>",
      to: [email.toLowerCase().trim()],
      subject: `🛵 Seu código de acesso - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
                      <div style="font-size: 48px; margin-bottom: 8px;">🛵</div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Área do Entregador</h1>
                      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${companyName}</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.5;">
                        Olá, <strong>${driverName}</strong>! 👋
                      </p>
                      <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                        Você solicitou acesso à área do entregador. Use o código abaixo para fazer login:
                      </p>
                      
                      <!-- Info Box -->
                      <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                          📧 <strong>Importante:</strong> Copie o código de 6 dígitos que você recebeu no email padrão do sistema e digite na tela de login.
                        </p>
                      </div>
                      
                      <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        Dicas rápidas:
                      </p>
                      <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                        <li>Mantenha seu status de disponibilidade atualizado</li>
                        <li>Compartilhe sua localização para entregas</li>
                        <li>Atualize o status dos pedidos em tempo real</li>
                      </ul>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 32px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px; text-align: center;">
                        Se você não solicitou este email, pode ignorá-lo com segurança.
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Cardpon - Todos os direitos reservados
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Custom driver OTP email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso" }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending driver OTP:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
