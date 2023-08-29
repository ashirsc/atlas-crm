import { PhoneCall, PrismaClient, SubAccount, } from '@prisma/client'
import { QuestionCollection, createPromptModule } from 'inquirer';

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
            type: 'input',
            name: 'botAccountId',
            message: "What's the botAccountId",
        },
    ];

    const prompt = createPromptModule()
    prompt(questions).then(async (answers: SubAccount) => {
        
        await prisma.subAccount.create({
            data: {
                locationId: answers.locationId,
                ownerId: parseInt(answers.ownerId as unknown as string),
                accessToken: answers.accessToken,
                refreshToken: answers.refreshToken,
                botEmail:"",
                botPassword:"",
                botAccountId: parseInt(answers.botAccountId as unknown as string)

            }
        });

        console.log('Account information has been saved.');
    })

}

main()