import { NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const authHeader = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;
    
    const isProd = !serverKey.startsWith('SB-Mid-server');
    const midtransUrl = isProd 
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    const midtransRes = await fetch(midtransUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!midtransRes.ok) {
      const errText = await midtransRes.text();
      console.error("Midtrans status API error:", errText);
      return NextResponse.json({ error: 'Failed to fetch status from Midtrans' }, { status: 500 });
    }

    const midtransData = await midtransRes.json();
    const transactionStatus = midtransData.transaction_status;

    // Handle settlement or capture (success)
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      const { data: orders, error: fetchError } = await supabase
        .from('pre_orders')
        .select('*')
        .filter('status', 'eq', 'Menunggu Pembayaran');

      if (fetchError) {
        console.error("Error fetching orders in status API:", fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      const matchingOrders = orders?.filter(
        (o: any) => o.snap_token && (o.snap_token.startsWith(`${orderId}:`) || o.snap_token === orderId)
      ) || [];

      if (matchingOrders.length > 0) {
        const orderIdsToUpdate = matchingOrders.map((o: any) => o.id);
        const { error: updateError } = await supabase
          .from('pre_orders')
          .update({ status: 'Pesanan Diterima' })
          .in('id', orderIdsToUpdate);

        if (updateError) {
          console.error("Error updating orders to Pesanan Diterima in status API:", updateError);
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
              console.error("Gagal update production_plans via status API:", err);
            }
          }
        }
      }
      return NextResponse.json({ status: 'Pesanan Diterima', transactionStatus });
    } else if (transactionStatus === 'expire') {
      const { data: orders, error: fetchError } = await supabase
        .from('pre_orders')
        .select('*')
        .filter('status', 'eq', 'Menunggu Pembayaran');

      if (fetchError) {
        console.error("Error fetching orders in status API:", fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      const matchingOrders = orders?.filter(
        (o: any) => o.snap_token && (o.snap_token.startsWith(`${orderId}:`) || o.snap_token === orderId)
      ) || [];

      if (matchingOrders.length > 0) {
        const orderIdsToUpdate = matchingOrders.map((o: any) => o.id);
        const { error: updateError } = await supabase
          .from('pre_orders')
          .update({ status: 'Gagal' })
          .in('id', orderIdsToUpdate);

        if (updateError) {
          console.error("Error updating orders to Gagal in status API:", updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
      }
      return NextResponse.json({ status: 'Gagal', transactionStatus });
    }

    return NextResponse.json({ status: 'Menunggu Pembayaran', transactionStatus });
  } catch (error: any) {
    console.error("Status API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
