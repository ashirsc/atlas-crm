import { PhoneCall, PrismaClient, SubAccount, } from '@prisma/client'
import { QuestionCollection, createPromptModule } from 'inquirer';

import generator from "generate-password"

const prisma = new PrismaClient()




async function main() {




    const questions: QuestionCollection<SubAccount> = [
        {
            type: 'input',
            name: 'locationId',
            message: "What's your location ID?",
        },
        {
            type: 'input',
            name: 'ownerId',
            message: "What's your owner ID?",
        },
        {
            type: 'password',
            name: 'accessToken',
            message: "What's your access token?",
            mask: '*',
        },
        {
            type: 'password',
            name: 'refreshToken',
            message: "What's your refresh token?",
            mask: '*',
        },
    ];

    const prompt = createPromptModule()
    prompt(questions).then(async (answers: SubAccount) => {
        const botPassword = generator.generate({
            length: 10,
            numbers: true,
            symbols: true
        })
        const botEmail = `${answers.locationId}@ses.dnjsolutions.dev`
        await prisma.subAccount.create({
            data: {
                locationId: answers.locationId,
                ownerId: parseInt(answers.ownerId as unknown as string),
                // ownerId: answers.ownerId,
                accessToken: answers.accessToken,
                refreshToken: answers.refreshToken,
                botEmail,
                botPassword

            }
        });

        console.log('Account information has been saved.');
        console.log(`Please set up the following user in the account ${answers.locationId}`,{botEmail, botPassword})
    })

}

main()