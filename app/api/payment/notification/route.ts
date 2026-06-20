import { NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("Midtrans Webhook Received:", payload);

    const { order_id, transaction_status } = payload;

    if (order_id && transaction_status === 'expire') {
      // Find all pre-orders that match the order_id in their snap_token
      // Because we store snap_token as "orderId:token", we can do a pattern match
      // or query by searching snap_token starts with order_id + ':'
      const { data: orders, error: fetchError } = await supabase
        .from('pre_orders')
        .select('id, snap_token')
        .filter('status', 'eq', 'Menunggu Pembayaran');

      if (fetchError) {
        console.error("Error fetching orders in webhook:", fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      const matchingOrders = orders?.filter(
        (o: any) => o.snap_token && (o.snap_token.startsWith(`${order_id}:`) || o.snap_token === order_id)
      ) || [];

      if (matchingOrders.length > 0) {
        const orderIdsToUpdate = matchingOrders.map((o: any) => o.id);
        const { error: updateError } = await supabase
          .from('pre_orders')
          .update({ status: 'Gagal' })
          .in('id', orderIdsToUpdate);

        if (updateError) {
          console.error("Error updating orders to Gagal in webhook:", updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        console.log(`Successfully updated orders ${orderIdsToUpdate.join(', ')} to Gagal via webhook.`);
      }
    }
    if (order_id && (transaction_status === 'settlement' || transaction_status === 'capture')) {
      const { data: orders, error: fetchError } = await supabase
        .from('pre_orders')
        .select('*')
        .filter('status', 'eq', 'Menunggu Pembayaran');

      if (fetchError) {
        console.error("Error fetching orders in webhook:", fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      const matchingOrders = orders?.filter(
        (o: any) => o.snap_token && (o.snap_token.startsWith(`${order_id}:`) || o.snap_token === order_id)
      ) || [];

      if (matchingOrders.length > 0) {
        const orderIdsToUpdate = matchingOrders.map((o: any) => o.id);
        const { error: updateError } = await supabase
          .from('pre_orders')
          .update({ status: 'Pesanan Diterima' })
          .in('id', orderIdsToUpdate);

        if (updateError) {
          console.error("Error updating orders to Pesanan Diterima in webhook:", updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Trigger production plans automation for each matched order
        const { data: channelData } = await supabase.from('channels').select('id').ilike('name', '%reseller%').single();
        const resellerChannelId = channelData?.id;

        if (resellerChannelId) {
          for (const po of matchingOrders) {
            try {
              const { data: existingPlan } = await supabase.from('production_plans')
                .select('*')
                .eq('target_date', po.pickup_date)
                .eq('product_id', po.product_id)
                .eq('channel_id', resellerChannelId)
                .single();

              if (existingPlan) {
                await supabase.from('production_plans')
                  .update({ target_production_qty: existingPlan.target_production_qty + po.quantity })
                  .eq('id', existingPlan.id);
              } else {
                await supabase.from('production_plans').insert([{
                  target_date: po.pickup_date,
                  product_id: po.product_id,
                  channel_id: resellerChannelId,
                  target_production_qty: po.quantity,
                  avg_past_week_qty: 0,
                  is_finalized: false
                }]);
              }
            } catch (err) {
              console.error("Gagal update production_plans via webhook:", err);
            }
          }
        }

        console.log(`Successfully updated orders ${orderIdsToUpdate.join(', ')} to Pesanan Diterima via webhook.`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook notification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
