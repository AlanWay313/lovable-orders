import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Admin client (bypasses RLS) for writes
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticated client (uses caller JWT) for identity
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuthed = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseAuthed.auth.getUser();
    if (userError || !userData?.user) {
      console.error('Auth getUser error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    const { orderId, driverId, companyId } = await req.json();

    if (!orderId || !driverId || !companyId) {
      return new Response(
        JSON.stringify({ error: 'orderId, driverId, and companyId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization: only the company owner (or super admin) can assign/reassign drivers
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', companyId)
      .maybeSingle();

    if (companyError) {
      console.error('Error loading company:', companyError);
      throw companyError;
    }
    if (!company) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let isAllowed = company.owner_id === userId;
    if (!isAllowed) {
      const { data: adminRole, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (roleError) {
        console.error('Error checking role:', roleError);
        throw roleError;
      }

      isAllowed = !!adminRole;
    }

    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate driver belongs to company
    const { data: driverCheck, error: driverCheckError } = await supabase
      .from('delivery_drivers')
      .select('id')
      .eq('id', driverId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();

    if (driverCheckError) {
      console.error('Error validating driver:', driverCheckError);
      throw driverCheckError;
    }

    if (!driverCheck) {
      return new Response(
        JSON.stringify({ error: 'Driver not found for this company' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Assigning order ${orderId} to driver ${driverId} (company ${companyId}) by user ${userId}`);

    // Update order with driver assignment - status becomes awaiting_driver
    // Driver needs to accept before starting delivery
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        delivery_driver_id: driverId,
        status: 'awaiting_driver'
      })
      .eq('id', orderId)
      .eq('company_id', companyId);

    if (orderError) {
      console.error('Error updating order:', orderError);
      throw orderError;
    }

    // Update driver status - mark as pending (waiting for driver to accept)
    const { error: driverError } = await supabase
      .from('delivery_drivers')
      .update({
        driver_status: 'pending_acceptance',
        is_available: false
      })
      .eq('id', driverId);

    if (driverError) {
      console.error('Error updating driver:', driverError);
      throw driverError;
    }

    // Get driver user_id for notification
    const { data: driver } = await supabase
      .from('delivery_drivers')
      .select('user_id, driver_name')
      .eq('id', driverId)
      .single();

    if (driver?.user_id) {
      // Create notification for driver
      await supabase
        .from('notifications')
        .insert({
          user_id: driver.user_id,
          title: 'Nova entrega disponível!',
          message: `Você tem uma nova entrega aguardando aceite. Pedido #${orderId.slice(0, 8)}`,
          type: 'info',
          data: { type: 'new_delivery', order_id: orderId, company_id: companyId }
        });

      // Try to send push notification
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: driver.user_id,
            userType: 'driver',
            payload: {
              title: 'Nova entrega disponível!',
              body: `Aceite a entrega para iniciar.`,
              tag: `order-${orderId}`,
              data: { type: 'new_delivery', orderId, companyId }
            }
          }
        });
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
        // Don't throw, push is optional
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Driver assigned successfully',
        driverName: driver?.driver_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in assign-driver:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
