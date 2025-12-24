import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DRIVER-DIRECT-LOGIN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();
    logStep("Processing login", { email: normalizedEmail });

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if driver exists and is active
    const { data: driver, error: driverError } = await supabaseAdmin
      .from("delivery_drivers")
      .select("id, email, driver_name, is_active, user_id, company_id")
      .eq("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (driverError) {
      logStep("Error fetching driver", { error: driverError.message });
      throw new Error("Erro ao verificar entregador");
    }

    if (!driver) {
      logStep("Driver not found or inactive");
      return new Response(JSON.stringify({ 
        error: "Email não cadastrado ou conta desativada" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Driver found", { driverId: driver.id, hasUserId: !!driver.user_id });

    let userId = driver.user_id;

    // If driver doesn't have a user_id, create auth user
    if (!userId) {
      logStep("Creating new auth user for driver");
      
      // Generate a random password (user won't need it)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: driver.driver_name || "Entregador",
        },
      });

      if (authError) {
        // User might already exist
        if (authError.message.includes("already been registered")) {
          logStep("User already exists, fetching user");
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === normalizedEmail);
          if (existingUser) {
            userId = existingUser.id;
          } else {
            throw authError;
          }
        } else {
          throw authError;
        }
      } else {
        userId = authData.user.id;
      }

      // Link user to driver record
      const { error: updateError } = await supabaseAdmin
        .from("delivery_drivers")
        .update({ user_id: userId })
        .eq("id", driver.id);

      if (updateError) {
        logStep("Error linking user to driver", { error: updateError.message });
      }

      // Add driver role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ 
          user_id: userId, 
          role: "delivery_driver" 
        }, { 
          onConflict: "user_id,role" 
        });

      if (roleError) {
        logStep("Error adding driver role", { error: roleError.message });
      }

      logStep("Created and linked new user", { userId });
    }

    // Generate session tokens for the user
    logStep("Generating session for user", { userId });

    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });

    if (sessionError) {
      logStep("Error generating link", { error: sessionError.message });
      throw sessionError;
    }

    // Extract the token from the action link and create a session
    const actionLink = sessionData.properties?.action_link;
    if (!actionLink) {
      throw new Error("Could not generate login link");
    }

    // Parse the token from the link
    const url = new URL(actionLink);
    const token = url.searchParams.get("token");
    const tokenType = url.searchParams.get("type");

    if (!token) {
      throw new Error("Could not extract token");
    }

    // Verify the OTP to get a session
    const { data: otpData, error: otpError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: tokenType as any || "magiclink",
    });

    if (otpError) {
      logStep("Error verifying token", { error: otpError.message });
      throw otpError;
    }

    if (!otpData.session) {
      throw new Error("Could not create session");
    }

    logStep("Session created successfully");

    return new Response(JSON.stringify({
      session: {
        access_token: otpData.session.access_token,
        refresh_token: otpData.session.refresh_token,
      },
      user: otpData.user,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
