import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS = {
  basic: {
    priceId: "price_1ShaIeCjIGOfNgffXczeafPR",
    productId: "prod_Teu6Hq16M0mYW1",
    name: "Plano Básico",
    orderLimit: 2000,
  },
  pro: {
    priceId: "price_1ShaJDCjIGOfNgffUq4LolV2",
    productId: "prod_Teu7JJnhWCv9MX",
    name: "Plano Pro",
    orderLimit: 5000,
  },
  enterprise: {
    priceId: "price_1ShaKMCjIGOfNgffSkn5Tlqi",
    productId: "prod_Teu8s4ks6y3g3T",
    name: "Plano Enterprise",
    orderLimit: -1, // unlimited
  },
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { planKey } = await req.json();
    const plan = PLANS[planKey as keyof typeof PLANS];
    
    if (!plan) {
      throw new Error(`Invalid plan: ${planKey}`);
    }

    logStep("Plan selected", { planKey, priceId: plan.priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = newCustomer.id;
      logStep("New customer created", { customerId });
    }

    // Update company with stripe customer id
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await adminClient
      .from("companies")
      .update({ stripe_customer_id: customerId })
      .eq("owner_id", user.id);

    const origin = req.headers.get("origin") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: "subscription",
      payment_method_types: ["card"],
      success_url: `${origin}/dashboard/plans?subscription=success`,
      cancel_url: `${origin}/dashboard/plans?subscription=cancelled`,
      metadata: {
        userId: user.id,
        planKey,
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
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
