import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getCallsFromToday() {
  const now = new Date();
  
  // Start of day
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // End of day
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  const callsFromToday = await prisma.phoneCall.findMany({
    where: {
      callTime: {
        gte: start,
        lte: end
      }
    }
  });

  return callsFromToday;
}

getCallsFromToday()
  .then(calls => console.log(calls))
  .catch(error => console.error(error))
  .finally(() => prisma.$disconnect());
