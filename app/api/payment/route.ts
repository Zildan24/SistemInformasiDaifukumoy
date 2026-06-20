import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(req: Request) {
  try {
    const { order_id, gross_amount, first_name, email, item_details } = await req.json();

    // Initialize Snap API
    let snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY || '',
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let parameter = {
      transaction_details: {
        order_id: order_id,
        gross_amount: gross_amount
      },
      customer_details: {
        first_name: first_name,
        email: email || 'reseller@daifukumoy.com'
      },
      item_details: item_details,
      callbacks: {
        finish: `${baseUrl}/reseller/riwayat-po`,
        error: `${baseUrl}/reseller/riwayat-po`,
        unfinish: `${baseUrl}/reseller/riwayat-po`
      }
    };

    const transaction = await snap.createTransaction(parameter);

    // Hitung total kuantitas moci dari item_details jika ada
    const totalQty = item_details && Array.isArray(item_details)
      ? item_details.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0)
      : 0;

    // Kirim notifikasi otomatis ke Telegram Admin
    // Menggunakan trigger non-blocking agar tidak menghambat response utama ke client
    sendTelegramNotification(first_name, gross_amount, totalQty)
      .then((success) => {
        if (success) console.log("Notifikasi Telegram berhasil dikirim.");
        else console.log("Gagal mengirim notifikasi Telegram, silakan periksa konfigurasi .env.");
      })
      .catch((err) => console.error("Error Telegram helper:", err));

    return NextResponse.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });
  } catch (error: any) {
    console.error("Midtrans Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
