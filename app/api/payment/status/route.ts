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
            console.error("Gagal mencatat transaksi keuangan di status API:", finErr);
          }
        }

        // Rule 2: Run JIT Production planning sync
        await syncJITProductionPlanning(supabase);
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
