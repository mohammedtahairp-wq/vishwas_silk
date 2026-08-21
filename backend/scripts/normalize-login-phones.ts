/**
 * One-time repair: normalizes every User.loginPhone to the bare 10-digit
 * format used by the OTP login flow (strips non-digits / country code).
 * Rows whose normalized value would collide with another user are skipped
 * and reported instead of failing the whole run.
 *
 * Run with: npx tsx scripts/normalize-login-phones.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalize(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { loginPhone: { not: null } },
    select: { id: true, loginPhone: true, role: true, linkedId: true },
  });

  let updated = 0;
  const skipped: string[] = [];

  for (const user of users) {
    const current = user.loginPhone as string;
    const target = normalize(current);
    if (target === current) continue;

    const clash = await prisma.user.findUnique({ where: { loginPhone: target } });
    if (clash && clash.id !== user.id) {
      skipped.push(`${current} -> ${target} (already used by user ${clash.id})`);
      continue;
    }

    await prisma.user.update({ where: { id: user.id }, data: { loginPhone: target } });
    updated++;
    console.log(`updated ${user.role} ${user.id}: ${current} -> ${target}`);
  }

  console.log(`done: ${updated} updated, ${skipped.length} skipped`);
  for (const s of skipped) console.log(`SKIPPED: ${s}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
