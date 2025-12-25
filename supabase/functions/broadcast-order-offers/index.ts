import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, companyId } = await req.json();

    if (!orderId || !companyId) {
      return new Response(
        JSON.stringify({ error: 'orderId and companyId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Broadcasting order ${orderId} to all available drivers for company ${companyId}`);

    // Get all available drivers for this company
    const { data: availableDrivers, error: driversError } = await supabase
      .from('delivery_drivers')
      .select('id, user_id, driver_name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('is_available', true)
      .eq('driver_status', 'available');

    if (driversError) {
      console.error('Error fetching drivers:', driversError);
      throw driversError;
    }

    if (!availableDrivers || availableDrivers.length === 0) {
      console.log('No available drivers found');
      return new Response(
        JSON.stringify({ success: false, message: 'No available drivers', offersCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${availableDrivers.length} available drivers`);

    // Cancel any existing pending offers for this order
    await supabase
      .from('order_offers')
      .update({ status: 'cancelled' })
      .eq('order_id', orderId)
      .eq('status', 'pending');

    // Create offers for all available drivers
    const offers = availableDrivers.map(driver => ({
      order_id: orderId,
      driver_id: driver.id,
      company_id: companyId,
      status: 'pending'
    }));

    const { data: createdOffers, error: offersError } = await supabase
      .from('order_offers')
      .insert(offers)
      .select();

    if (offersError) {
      console.error('Error creating offers:', offersError);
      throw offersError;
    }

    // Update order status to awaiting_driver
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'awaiting_driver' })
      .eq('id', orderId);

    if (orderError) {
      console.error('Error updating order status:', orderError);
      throw orderError;
    }

    // Send notifications to all drivers
    for (const driver of availableDrivers) {
      if (driver.user_id) {
        // Create in-app notification
        await supabase
          .from('notifications')
          .insert({
            user_id: driver.user_id,
            title: 'Nova entrega disponível!',
            message: `Há uma nova entrega disponível. Aceite rápido antes que outro entregador pegue!`,
            type: 'info',
            data: { type: 'order_offer', order_id: orderId, company_id: companyId }
          });

        // Try to send push notification
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: driver.user_id,
              userType: 'driver',
              payload: {
                title: 'Nova entrega disponível!',
                body: 'Aceite rápido! Quem pegar primeiro, leva.',
                tag: `order-offer-${orderId}`,
                data: { type: 'order_offer', orderId, companyId }
              }
            }
          });
        } catch (pushError) {
          console.error('Error sending push to driver:', driver.id, pushError);
        }
      }
    }

    console.log(`Created ${createdOffers?.length || 0} offers for order ${orderId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Order broadcasted to ${availableDrivers.length} drivers`,
        offersCreated: createdOffers?.length || 0,
        driverNames: availableDrivers.map(d => d.driver_name)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in broadcast-order-offers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
