const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xsknwngfijacpzjdfohb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza253bmdmaWphY3B6amRmb2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTU0MzIsImV4cCI6MjA5NTQ3MTQzMn0.Zt9wDYpEkLq6eeMxY3Ne4edksi1G3QW_Lf9yG-mPbVA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('pre_orders').select('*, users(name, phone_number)').limit(1);
  if (error) console.error("Error:", error);
  else console.log("Data:", data);
}

test();
