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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, driverId, companyId } = await req.json();

    if (!orderId || !driverId || !companyId) {
      return new Response(
        JSON.stringify({ error: 'orderId, driverId, and companyId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Assigning order ${orderId} to driver ${driverId}`);

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
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            userId: driver.user_id,
            userType: 'driver',
            payload: {
              title: 'Nova entrega disponível!',
              body: `Aceite a entrega para iniciar.`,
              tag: `order-${orderId}`,
              data: { type: 'new_delivery', orderId, companyId }
            }
          }),
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
