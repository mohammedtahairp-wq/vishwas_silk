const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();
async function main() {
  const admin = await p.user.findFirst({ where: { role: 'admin' }, select: { id: true, username: true, passwordHash: true } });
  console.log('Admin:', admin?.username);
  
  const matches = await bcrypt.compare('Admin@123', admin.passwordHash);
  console.log('Admin@123 matches:', matches);
  
  const matches2 = await bcrypt.compare('vishwasadminsilk', admin.passwordHash);
  console.log('vishwasadminsilk matches:', matches2);
  
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
