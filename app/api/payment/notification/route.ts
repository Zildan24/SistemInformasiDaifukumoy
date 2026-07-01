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

        // Rule 1: Log each successful pre-order payment immediately in financial_records
        for (const po of matchingOrders) {
          try {
            await supabase.from('financial_records').insert([{
              type: 'Pemasukan',
              category: 'Pre-Order Sales (Uang Muka/Kas)',
              amount: po.total_amount,
              recorded_at: po.created_at || new Date().toISOString(),
              notes: `Pemasukan Pre-Order Sales (Uang Muka/Kas) - PO #${po.id}`
            }]);
          } catch (finErr) {
            console.error("Gagal mencatat transaksi keuangan di webhook:", finErr);
          }
        }

        // Rule 2: Run JIT Production planning sync
        await syncJITProductionPlanning(supabase);

        console.log(`Successfully updated orders ${orderIdsToUpdate.join(', ')} to Pesanan Diterima via webhook.`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook notification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function syncJITProductionPlanning(supabase: any) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: channelData } = await supabase.from('channels').select('id').ilike('name', '%reseller%').single();
    if (!channelData) return;
    const resellerChannelId = channelData.id;

    // Get all products to initialize aggregates
    const { data: productsData } = await supabase.from('products').select('id');
    if (!productsData) return;

    // Query pre-orders for tomorrow
    const { data: pos } = await supabase.from('pre_orders')
      .select('product_id, quantity, status')
      .eq('pickup_date', tomorrowStr);

    const aggregates: Record<number, number> = {};
    productsData.forEach((p: any) => {
      aggregates[p.id] = 0;
    });

    if (pos) {
      pos.forEach((po: any) => {
        const statusLower = po.status.toLowerCase();
        if (statusLower === 'pesanan diterima') {
          const pid = Number(po.product_id);
          aggregates[pid] = (aggregates[pid] || 0) + (po.quantity || 0);
        }
      });
    }

    // Delete existing reseller plans for tomorrow
    await supabase.from('production_plans').delete()
      .eq('target_date', tomorrowStr)
      .eq('channel_id', resellerChannelId)
      .is('location_id', null);

    // Insert new plans
    const plansToInsert = Object.keys(aggregates).map(pidStr => {
      const pid = Number(pidStr);
      return {
        target_date: tomorrowStr,
        product_id: pid,
        channel_id: resellerChannelId,
        location_id: null,
        avg_past_week_qty: 0,
        target_production_qty: aggregates[pid],
        is_finalized: false
      };
    });

    if (plansToInsert.length > 0) {
      await supabase.from('production_plans').insert(plansToInsert);
    }
  } catch (err) {
    console.error("Gagal sync JIT production plans:", err);
  }
}
