import { BotAccount, PrismaClient, } from '@prisma/client'
import { fetchBotAccountAudioFiles, taggingPipeline } from "./pw.js";

const prisma = new PrismaClient()

async function main() {

    // const directoryPath = 'downloads/';

    // const today = new Date();
    // today.setHours(0, 0, 0, 0);

    // const botAccounts: BotAccount[] = await prisma.botAccount.findMany({
    //     include: { subAccounts: true }
    // });



    // for (let botAccount of botAccounts) {
    //     // const { subAccounts } = botAccount as any
    //     // await Promise.all(subAccounts.map(handleTokenRefresh))
    //     const existingCalls = await prisma.phoneCall.findMany({
    //         where: {
    //             callTime: {
    //                 gte: today
    //             }
    //         }
    //     })
    //     const phoneCalls = await fetchBotAccountAudioFiles(botAccount, directoryPath, existingCalls)
    //     await prisma.phoneCall.createMany({ data: phoneCalls, skipDuplicates: true })
    // }

    await taggingPipeline()


}

main()



