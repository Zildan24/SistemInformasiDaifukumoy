const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseUrl = 'https://xsknwngfijacpzjdfohb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza253bmdmaWphY3B6amRmb2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTU0MzIsImV4cCI6MjA5NTQ3MTQzMn0.Zt9wDYpEkLq6eeMxY3Ne4edksi1G3QW_Lf9yG-mPbVA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  fs.writeFileSync('dummy.txt', 'hello world');
  const fileBuffer = fs.readFileSync('dummy.txt');
  
  const { data, error } = await supabase.storage.from('products').upload('test.txt', fileBuffer, {
     contentType: 'text/plain',
     upsert: true
  });
  console.log("Upload Data:", data);
  console.log("Upload Error:", error);
}

test();
