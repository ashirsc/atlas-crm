import "dotenv/config"

import { PhoneCall, PrismaClient, SubAccount, } from '@prisma/client'

const prisma = new PrismaClient()

// console.log(await transcribe(loadAudioFromFile("downloads\\REe932b0855e5b8244d137893efaa301ba.wav")))


await prisma.subAccount.update({
    where: {
        locationId: "LjVnKCbMGn48Mvnzi7dG"
    },
    data: {
        refreshToken: "refresh_token",
        accessTokenExpiresAt: 1000,
        accessToken: 'access_token'
    }
})