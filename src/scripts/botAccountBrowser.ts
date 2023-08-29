import { BotAccount, PrismaClient } from '@prisma/client'

import { chromium } from "playwright";
import { login } from "../pw.js"

const prisma = new PrismaClient()

const browser = await chromium.launch({ headless: false, });


const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
const page = await context.newPage();

const botAccount = await prisma.botAccount.findUnique({
    where: {
        id: 1
    }
})

await login(page, botAccount)