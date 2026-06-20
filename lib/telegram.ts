export async function sendTelegramNotification(resellerName: string, totalAmount: number, totalQty: number) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.error("Telegram token atau Chat ID belum dikonfigurasi di .env!");
        return false;
    }

    // Format pesan menggunakan Markdown agar terlihat rapi di Telegram
    const message = `
🔔 *PESANAN PRE-ORDER BARU MASUK!* 🔔

Mitra Reseller baru saja melakukan pembayaran sukses.
  
• *Nama Reseller:* ${resellerName}
• *Total Item:* ${totalQty} pcs moci
• *Total Bayar:* Rp ${totalAmount.toLocaleString("id-ID")}
  
Status pesanan otomatis berubah menjadi *'Diproses'*. Silakan cek halaman Kelola Pesanan PO di Dashboard Admin.
  
🔗 _https://sidamoy.vercel.app/admin/orders_
  `;

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "Markdown", // Mengaktifkan format bold/italic
            }),
        });

        const data = await response.json();
        return data.ok; // Bernilai true jika pesan sukses terkirim
    } catch (error) {
        console.error("Gagal mengirim notifikasi ke Telegram:", error);
        return false;
    }
}