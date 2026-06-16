const supabaseUrl = 'https://xsknwngfijacpzjdfohb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza253bmdmaWphY3B6amRmb2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTU0MzIsImV4cCI6MjA5NTQ3MTQzMn0.Zt9wDYpEkLq6eeMxY3Ne4edksi1G3QW_Lf9yG-mPbVA';

async function test() {
  const response = await fetch(`${supabaseUrl}/rest/v1/pre_orders?select=*&limit=1`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await response.json();
  console.log("Data:", JSON.stringify(data, null, 2));
}

test();
