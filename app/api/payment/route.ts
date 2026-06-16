import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

export async function POST(req: Request) {
  try {
    const { order_id, gross_amount, first_name, email, item_details } = await req.json();

    // Initialize Snap API
    let snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY || '',
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
    });

    let parameter = {
      transaction_details: {
        order_id: order_id,
        gross_amount: gross_amount
      },
      customer_details: {
        first_name: first_name,
        email: email || 'reseller@daifukumoy.com'
      },
      item_details: item_details
    };

    const transaction = await snap.createTransaction(parameter);
    
    return NextResponse.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });
  } catch (error: any) {
    console.error("Midtrans Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
