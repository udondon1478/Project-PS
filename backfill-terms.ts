
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Backfilling termsAgreedAt for existing users...');
    const result = await prisma.user.updateMany({
        where: {
            termsAgreedAt: null,
        },
        data: {
            termsAgreedAt: new Date(),
        },
    });
    console.log(`Updated ${result.count} users.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
