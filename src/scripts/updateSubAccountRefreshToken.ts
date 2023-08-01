import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSubAccount(locationId: string, refreshToken: string) {
  try {
    await prisma.subAccount.update({
      where: {
        locationId: locationId,
      },
      data: {
        refreshToken: refreshToken,
        accessTokenExpiresAt: new Date(),
        accessToken: '',
      },
    });
    console.log('SubAccount successfully updated');
  } catch (error) {
    console.error('Error updating SubAccount:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Please provide the required parameters:');
  console.log('1. Location ID (string)');
  console.log('2. Refresh Token (string)');
  console.log('Example: ts-node script.ts <LocationID> <RefreshToken>');
} else {
  updateSubAccount(args[0], args[1]);
}
