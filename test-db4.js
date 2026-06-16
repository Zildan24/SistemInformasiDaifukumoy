const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xsknwngfijacpzjdfohb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza253bmdmaWphY3B6amRmb2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTU0MzIsImV4cCI6MjA5NTQ3MTQzMn0.Zt9wDYpEkLq6eeMxY3Ne4edksi1G3QW_Lf9yG-mPbVA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const response = await fetch(`${supabaseUrl}/rest/v1/product_channel_prices?select=product_id,channel_id,price`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  console.log("Status:", response.status);
  console.log("Body:", await response.text());
}

test();
