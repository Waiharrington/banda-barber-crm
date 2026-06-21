const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables in .env file.");
  process.exit(1);
}

// Create a supabase client with service role key to bypass RLS and manage users
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  try {
    const adminEmail = 'administrador@pandabarber.com';
    console.log(`Checking auth users for email: ${adminEmail}...`);

    // 1. List users from auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let authUser = users.find(u => u.email?.toLowerCase() === adminEmail.toLowerCase());
    
    if (authUser) {
      console.log(`Found existing auth user: ${authUser.email} with UUID: ${authUser.id}`);
    } else {
      console.log(`Auth user for ${adminEmail} not found. Creating a new one...`);
      // Create a default administrator account
      const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: 'administrador123', // Default password
        email_confirm: true
      });
      if (createError) throw createError;
      authUser = user;
      console.log(`Created new auth user with UUID: ${authUser.id}. Default Password: administrador123`);
    }

    // 2. Check public.staff table
    console.log(`Checking staff table for email: ${adminEmail}...`);
    const { data: staffMember, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .ilike('email', adminEmail)
      .maybeSingle();

    if (staffError) throw staffError;

    if (staffMember) {
      console.log(`Found staff record: ${staffMember.name} (Role: ${staffMember.role})`);
      
      // Update auth_user_id
      const { data: updatedStaff, error: updateError } = await supabase
        .from('staff')
        .update({ auth_user_id: authUser.id })
        .eq('id', staffMember.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      console.log(`Successfully synced staff auth_user_id to: ${updatedStaff.auth_user_id}`);
    } else {
      console.log(`No staff record found for ${adminEmail}. Creating one...`);
      const { data: newStaff, error: insertError } = await supabase
        .from('staff')
        .insert([{
          auth_user_id: authUser.id,
          email: adminEmail,
          name: 'Administrador Panda',
          role: 'Admin|my-profile,dashboard,scheduling,reception,checkout,barber,clients,personnel,services,inventory,finance,history',
          active: true
        }])
        .select()
        .single();
        
      if (insertError) throw insertError;
      console.log(`Created new admin staff record with ID: ${newStaff.id}`);
    }

    console.log("\nSync completed successfully! You can now log in with:");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: (the password you created in Supabase Auth, or 'administrador123' if a new user was created)`);

  } catch (err) {
    console.error("Error running script:", err);
  }
}

main();
