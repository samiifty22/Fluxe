import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const t = await prisma.tenant.upsert({
    where: { name: 'fluxe-demo' },
    update: {},
    create: {
      name: 'fluxe-demo',
      plan: 'free',
      status: 'active',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@fluxe.local' },
    update: {},
    create: {
      email: 'admin@fluxe.local',
      name: 'Admin',
      password: null,
      role: 'owner',
      tenantId: t.id,
    },
  });

  console.log('Seed completed');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
