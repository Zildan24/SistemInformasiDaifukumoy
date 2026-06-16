const supabaseUrl = 'https://xsknwngfijacpzjdfohb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza253bmdmaWphY3B6amRmb2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTU0MzIsImV4cCI6MjA5NTQ3MTQzMn0.Zt9wDYpEkLq6eeMxY3Ne4edksi1G3QW_Lf9yG-mPbVA';
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('pre_orders').insert([{
    reseller_id: "8fbbfe83-e6e7-4d2b-aac4-fa4aecdb4956",
    product_id: 4,
    quantity: 1,
    pickup_date: "2026-05-30",
    total_amount: 1000,
    status: 'Pesanan Diterima',
    created_at: "2026-05-30T10:00:00Z"
  }]).select().single();
  console.log("Error:", error);
  console.log("Data:", data);
  if (data) {
     await supabase.from('pre_orders').delete().eq('id', data.id);
  }
}

test();
