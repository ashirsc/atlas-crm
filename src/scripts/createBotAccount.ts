import { PhoneCall, PrismaClient, SubAccount, } from '@prisma/client'
import { QuestionCollection, createPromptModule } from 'inquirer';

import generator from "generate-password"

const prisma = new PrismaClient()




async function main() {




    const questions: QuestionCollection<SubAccount> = [
        {
            type: 'input',
            name: 'companyName',
            message: "What's the company's name?",
        },
        
       
    ];

    const prompt = createPromptModule()
    prompt(questions).then(async (answers: any) => {
        const botPassword = generator.generate({
            length: 24,
            numbers: true,
            symbols: true,
            strict:true
        })
        const botEmail = `${answers.companyName}_bot@ses.dnjsolutions.dev`
        await prisma.botAccount.create({
            data: {
                botEmail,
                botPassword,
                ownerId: parseInt(answers.ownerId as unknown as string),
            }
        });

        console.log('Account information has been saved.');
    })

}

main()