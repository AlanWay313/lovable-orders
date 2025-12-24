import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting (resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // max requests
const RATE_WINDOW = 60 * 1000; // per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    if (!checkRateLimit(clientIP)) {
      console.log(`[LOOKUP-CUSTOMER] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde um minuto e tente novamente.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, phone, companyId } = await req.json();
    
    if (!email && !phone) {
      return new Response(
        JSON.stringify({ error: 'Email ou telefone é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Formato de email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: 'Formato de telefone inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query - return data needed for checkout
    let query = supabase
      .from('customers')
      .select('id, name, email, phone')
      .limit(1);

    if (email) {
      query = query.eq('email', email.toLowerCase().trim());
    } else if (phone) {
      // Clean phone number for comparison
      const cleanPhone = phone.replace(/\D/g, '');
      query = query.ilike('phone', `%${cleanPhone}%`);
    }

    const { data: customer, error } = await query.maybeSingle();

    if (error) {
      console.error('[LOOKUP-CUSTOMER] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar cliente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer) {
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return customer data needed for checkout
    console.log(`[LOOKUP-CUSTOMER] Customer found for ${email ? 'email' : 'phone'} lookup`);
    
    return new Response(
      JSON.stringify({ 
        found: true, 
        customerId: customer.id,
        firstName: customer.name?.split(' ')[0] || 'Cliente',
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[LOOKUP-CUSTOMER] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
