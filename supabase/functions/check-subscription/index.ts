import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS = {
  "prod_Teu6Hq16M0mYW1": { name: "basic", orderLimit: 2000, displayName: "Plano Básico" },
  "prod_Teu7JJnhWCv9MX": { name: "pro", orderLimit: 5000, displayName: "Plano Pro" },
  "prod_Teu8s4ks6y3g3T": { name: "enterprise", orderLimit: -1, displayName: "Plano Enterprise" },
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    // If the token is invalid/revoked ("session not found" etc), do NOT crash the app.
    // Return free plan as a safe fallback.
    if (userError || !userData.user?.email) {
      logStep("User not authenticated - returning free plan", { userError: userError?.message });
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        orderLimit: 1000,
        displayName: "Plano Gratuito",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found - using free plan");
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        orderLimit: 1000,
        displayName: "Plano Gratuito",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    // Check subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription - free plan");
      
      // Update company subscription status
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await adminClient
        .from("companies")
        .update({ 
          subscription_status: "free",
          subscription_plan: null,
          subscription_end_date: null,
        })
        .eq("owner_id", user.id);

      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        orderLimit: 1000,
        displayName: "Plano Gratuito",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const productId = subscription.items.data[0].price.product as string;
    const planInfo = PLANS[productId as keyof typeof PLANS];
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

    logStep("Active subscription found", { productId, planInfo, subscriptionEnd });

    // Update company
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await adminClient
      .from("companies")
      .update({ 
        subscription_status: "active",
        subscription_plan: planInfo?.name || "unknown",
        subscription_end_date: subscriptionEnd,
        stripe_customer_id: customerId,
      })
      .eq("owner_id", user.id);

    return new Response(JSON.stringify({
      subscribed: true,
      plan: planInfo?.name || "unknown",
      orderLimit: planInfo?.orderLimit || 2000,
      displayName: planInfo?.displayName || "Plano Desconhecido",
      subscriptionEnd,
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
