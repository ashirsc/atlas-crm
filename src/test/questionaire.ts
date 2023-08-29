import { BotAccount, PhoneCall, PrismaClient, } from '@prisma/client'
import { fill, questionaireToString } from '../questionaire.js';

const prisma = new PrismaClient()

const recentCalls = await prisma.phoneCall.findMany({
    orderBy: {
      callTime: 'desc',
    },
    take: 5,
  });

  let promises = recentCalls.filter(c => c.transcription != null).map((c:PhoneCall) => fill(c.transcription as string))

  let ans = await Promise.all(promises)

  let notes = ans.map(questionaireToString)

  notes.forEach(console.log)