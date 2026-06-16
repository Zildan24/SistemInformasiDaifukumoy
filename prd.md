1. Project Overview
1.1 Project Name
Daifukumoy Management System (DMS)
1.2 Description
Sistem informasi berbasis web yang dirancang khusus untuk mengelola operasional bisnis makanan "Daifukumoy". Sistem ini mengintegrasikan manajemen stok produk jadi (finished goods) , pencatatan keuangan internal keluarga (pemasukan/pengeluaran) , kalkulasi kewajiban zakat otomatis , hingga pengelolaan siklus Pre-Order (PO) untuk reseller.
1.3 Core Objectives
•	Zero-Error Inventory: Menghilangkan selisih stok harian melalui pencatatan real-time per stand dan per event bazaar.
•	Financial Transparency: Memisahkan arus kas usaha dari pengeluaran pribadi/keluarga serta memastikan kewajiban zakat terhitung secara akurat berdasarkan pendapatan.
•	Seamless Reseller Experience: Menggantikan pemesanan manual (chat) dengan sistem PO yang terorganisir, mulai dari pengajuan hingga jadwal pengambilan barang.
•	Data-Driven Decision: Menyediakan dashboard visual untuk owner guna memantau performa penjualan reseller dan efektivitas tiap stand setiap bulannya.
1.4 Business Rules & Constraints 
1.	Product Focus: Sistem hanya mencatat Produk Jadi (contoh: Daifuku varian Strawberry, Cokelat, dll). Tidak mencatat bahan baku mentah (tepung, buah, dll).
2.	Stock Flow: Stok masuk berasal dari input admin , stok keluar berasal dari penjualan stand atau pesanan reseller yang telah disetujui (Approved).
3.	Zakat Logic: Sistem harus memiliki fungsi kalkulasi otomatis sebesar $2.5\%$ dari total pendapatan/pemasukan bersih (sesuai konfigurasi owner).
4.	Reseller Type: Fokus pada "Reseller Dadakan" yang menggunakan sistem Open PO dengan jadwal pengambilan yang sudah ditentukan.
1.5 System Roles (Access Control)
•	Owner (Superadmin): Akses penuh ke dashboard finansial, laporan zakat, dan performa stand/reseller.
•	Admin (Operational): Mengelola CRUD produk, update stok harian, validasi data reseller, dan approval pesanan PO.
•	Reseller (User): Melihat katalog produk, melakukan request PO, menentukan jumlah pesanan, dan memantau status persetujuan admin
2. Core Features (Functional Requirements)
2.1 Modul Keuangan (Financial Management)
Modul ini menangani seluruh arus kas masuk dan keluar untuk menjaga transparansi keuangan usaha.
•	Pencatatan Transaksi:
o	Input Pemasukan: Mencatat dana masuk dari penjualan retail, bazaar, dan setoran reseller.
o	Input Pengeluaran: Mencatat biaya operasional seperti gaji karyawan, biaya listrik, dan pengeluaran kebutuhan keluarga owner.
•	Kalkulasi Zakat Otomatis:
o	Sistem secara otomatis menghitung potongan zakat sebesar $2.5\%$ dari total pendapatan atau laba bersih sesuai parameter yang ditentukan owner.
o	Menampilkan saldo dana zakat yang terkumpul dalam periode tertentu.
•	Financial Reporting:
o	Laporan laba rugi bulanan yang mengonsolidasi data dari semua kanal penjualan (stand, reseller, bazaar).
2.2 Manajemen Stok & Penjualan (Inventory & Sales)
Modul ini berfokus pada pelacakan produk siap jual (finished goods) untuk menghindari kehilangan barang.
•	Daily Stock Opname:
o	Input jumlah stok produk jadi yang tersedia di awal hari.
o	Pembaruan stok secara otomatis setiap kali terjadi transaksi penjualan.
•	Monitoring Multi-Channel:
o	Pelacakan jumlah penjualan dan sisa stok secara spesifik untuk tiap stand dan lokasi bazaar.
o	Rekapitulasi penjualan harian dan bulanan per lokasi untuk evaluasi performa.
•	Data Master Produk:
o	Fungsi CRUD (Create, Read, Update, Delete) untuk mengelola daftar produk dan informasi harga terupdate.
2.3 Sistem Pre-Order (PO) Reseller
Modul ini mendigitalisasi hubungan kerja sama dengan reseller untuk memudahkan koordinasi logistik.
•	Manajemen Data Reseller:
o	Fungsi CRUD untuk mendata profil reseller yang bekerja sama dengan Daifukumoy.
•	Portal Pemesanan (Reseller Side):
o	Katalog Produk: Reseller dapat melihat daftar produk yang tersedia untuk di-order.
o	Request PO: Form input untuk menentukan jumlah produk yang dipesan dan memilih jadwal pengambilan barang sesuai ketersediaan.
o	Status Monitoring: Reseller dapat memantau apakah pesanan mereka sudah disetujui (Approved) atau masih menunggu (Pending) oleh pihak admin.
•	Approval Workflow (Admin Side):
o	Admin menerima notifikasi request PO masuk dan memiliki otoritas untuk menyetujui atau menolak pesanan berdasarkan ketersediaan stok produk jadi.
3. Technical Stack & Rules (Frontend Focus)
3.1 Tech Stack
•	Framework: Next.js (App Router).
•	Styling: Tailwind CSS (untuk UI yang responsif dan bersih).
•	Icons: Lucide React (untuk ikon dashboard yang profesional).
•	Components: Shadcn/UI
•	State Management: React Hooks (useState, useEffect) untuk simulasi alur data.
3.2 Naming & Language Convention
•	Code Language: Gunakan Bahasa Inggris untuk semua variabel, fungsi, dan nama file (misal: calculateZakat(), stock_quantity, useAuth.js).
•	Interface (UI) Language: Gunakan Bahasa Indonesia untuk semua teks yang dilihat pengguna (misal: "Input Pemasukan", "Jadwal Pengambilan", "Stok Tersedia").
•	Case Style: camelCase untuk variabel/fungsi, dan PascalCase untuk komponen React.
3.3 Database Schema (Conceptual for Mock Data)
•	Users: id, name, role (owner/admin/reseller), phone_number.
•	Products: id, name, price, description, image_url.
•	Stocks: id, product_id, location (stand/bazaar/gudang), quantity_actual, last_updated.
•	Transactions: id, type (income/expense), amount, category (gaji/keluarga/penjualan), date, description.
•	PreOrders: id, reseller_id, product_id, quantity, pickup_date, status (pending/approved/completed).
4. Business Logic & Constraints
4.1 Logika Kalkulasi Zakat
Sistem harus memastikan perhitungan zakat dilakukan secara tepat waktu dan akurat berdasarkan arus kas masuk:
•	Formula:
$$\text{Zakat} = \text{Pemasukan Bersih} \times 0.025$$
.
•	Definisi Pemasukan Bersih: Total pendapatan dari seluruh kanal penjualan (Stand, Bazaar, Reseller) dikurangi biaya operasional (Gaji, dll).
•	Trigger: Kalkulasi dilakukan secara otomatis setiap bulan atau saat owner mengakses dashboard keuangan.
4.2 Logika Manajemen Stok (Finished Goods)
Sistem harus menjaga sinkronisasi antara produk yang tersedia dan produk yang terjual:
•	Pengurangan Stok Otomatis:
o	Setiap input penjualan harian dari tiap stand/bazaar akan memotong jumlah stok global.
o	Pesanan Reseller (Pre-Order) akan memotong stok hanya ketika status pesanan diubah oleh admin menjadi "Completed" (Barang sudah diambil).
•	Constraint (Batasan): Transaksi tidak dapat diproses jika jumlah penjualan melebihi stok produk jadi yang tersedia pada hari tersebut.
4.3 Aturan Pre-Order & Pengambilan (Reseller)
Untuk mencegah kesalahan jadwal dan penumpukan pesanan:
•	Validasi Tanggal: Reseller dilarang memilih tanggal pengambilan produk yang sudah terlewat (masa lalu) dari tanggal hari ini (current date).
•	Persetujuan Admin: Setiap request PO masuk ke status "Pending" dan tidak dianggap sebagai kewajiban stok sebelum admin menekan tombol "Approve".
•	Kapasitas PO: Admin dapat menentukan batas maksimal total produk yang bisa di-PO oleh seluruh reseller pada tanggal tertentu (kuota pengambilan).
5. User Interface (UI) Guidelines
5.1 Design Aesthetic & Vibe
Untuk menghindari kesan "web kaku hasil AI", sistem harus mengikuti prinsip desain modern:
•	Vibe: Clean, Minimalist, & Sophisticated. Fokus pada ruang putih (whitespace) yang lega dan sudut komponen yang membulat (rounded corners). 
•	Dashboard-Centric: Halaman utama harus memberikan ringkasan informasi instan tanpa perlu banyak melakukan klik. 
•	Interactivity: Gunakan efek hover yang halus pada tombol dan kartu, serta transisi antar halaman yang mulus.
5.2 Color Palette
Gunakan skema warna berikut untuk mencerminkan identitas produk Daifuku yang manis namun dikelola secara profesional:
•	Primary: #FF65C5 (Hot Pink) - Digunakan untuk tombol utama, active states, dan aksen penting.
•	Secondary: #FC98CA (Soft Pink) - Digunakan untuk elemen pendukung dan ikon.
•	Accent: #FBD7EC (Pale Pink) - Digunakan untuk background section atau card highlight.
•	Background: #FFFFFF (White) - Warna dasar untuk menjaga kebersihan tampilan dan keterbacaan teks.
5.3 Key Components
•	Data Presentation:
o	Tabel Modern: Gunakan tabel dengan fitur sorting dan filtering untuk mengelola data reseller dan transaksi keuangan. 
o	Interactive Cards: Katalog produk ditampilkan dalam bentuk kartu yang memiliki bayangan lembut (soft shadow), menampilkan foto produk, harga, dan sisa stok. 
o	Visual Analytics: Gunakan grafik (Area Chart atau Bar Chart) untuk memvisualisasikan tren penjualan bulanan dan hasil per bazaar. 
•	Navigation:
o	Sidebar yang dapat dikelola (collapsible) untuk akses cepat ke modul Keuangan, Stok, dan Reseller.
o	Top bar yang menampilkan profil pengguna dan notifikasi PO masuk. 
5.4 Layout Map (Saran Halaman)
1.	Dashboard (Owner): Ringkasan laba, status stok kritis, dan grafik penjualan. 
2.	Keuangan (Admin/Owner): Form input pemasukan/pengeluaran dan tabel rekap zakat. 
3.	Inventory (Admin): Manajemen produk (CRUD) dan input stok harian per stand. 
4.	Reseller Portal (Reseller): Halaman katalog untuk request PO dan riwayat pesanan. 
5.	Approval Center (Admin): Daftar tunggu PO yang memerlukan persetujuan. 
