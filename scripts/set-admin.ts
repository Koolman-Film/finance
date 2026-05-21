// Bootstrap (or promote) a Supabase user as ADMIN in our User table.
//
// Usage:
//   npm run set-admin -- <email> "<Display Name>" [password]
//
// If the user doesn't exist in Supabase Auth yet, this creates them with the
// given password (defaulting to "admin12345"). If they already exist, the
// password arg is ignored and we just promote them to ADMIN.
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const displayName = process.argv[3] ?? email?.split("@")[0] ?? "Admin";
  const password = process.argv[4] ?? "admin12345";
  if (!email) {
    console.error('Usage: npm run set-admin -- <email> "<Display Name>" [password]');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. Look up — Supabase listUsers paginates, but for local/small deployments
  //    one page (1000) is plenty.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;
  let found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  // 2. Create if missing
  if (!found) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip the email-verification flow
    });
    if (createErr) throw createErr;
    found = created.user!;
    console.log(`Created Supabase auth user ${email} (password: "${password}")`);
  }

  // 3. Upsert into our app's User table as ADMIN
  await prisma.user.upsert({
    where: { id: found.id },
    update: { role: "ADMIN", displayName, email, active: true, branchId: null },
    create: {
      id: found.id,
      email,
      displayName,
      role: "ADMIN",
      active: true,
    },
  });

  console.log(`Promoted ${email} (${displayName}) to ADMIN. You can log in now.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
