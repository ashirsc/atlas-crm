import "dotenv/config"

import { BotAccount, PhoneCall, PrismaClient, SubAccount, User } from '@prisma/client'
import { CustomerLabels, fill, tag } from "../questionaire.js";
import { Page, chromium } from "playwright"
import { addUserNote, fetchUserByPhoneNumber, refreshToken, tagUser } from "../highlevel.js";
import { asyncFilter, deleteFiles, get2faCode, getYyyyMmDdDate, parseHighLevelDateTime, readFilesFromDirectory } from "./utils.js";
import { loadAudioFromFile, transcribe } from "../audio.js";

import fs from 'fs/promises';
import path from "path"

const prisma = new PrismaClient()

async function loadStorageState(accountId: string): Promise<any | undefined> {
  const filePath = path.join('.auth', `${accountId}.storagestate.json`);

  try {
    // Check if the file exists
    await fs.access(filePath);

    // Read the file
    const fileContent = await fs.readFile(filePath, 'utf8');

    // Parse the content
    const parsedContent = JSON.parse(fileContent);

    return parsedContent;
  } catch (error) {
    console.error(`An error occurred while loading the file: ${error}`);
    return;
  }
}

async function saveStorageState(accountId: string, state: object): Promise<void> {
  const filePath = path.join('.auth', `${accountId}.storagestate.json`);

  // Ensure the .auth directory exists
  await fs.mkdir('.auth', { recursive: true });

  // Stringify the state object
  const fileContent = JSON.stringify(state, null, 2);

  // Write the content to the file
  await fs.writeFile(filePath, fileContent, 'utf8');

  console.log(`Storage state saved to ${filePath}`);
}

async function fetchBotAccountAudioFiles(botAccount: BotAccount, saveDirectory: string): Promise<PhoneCall[]> {
  const browser = await chromium.launch({ headless: false, slowMo: 300, });

  // let storageState = await loadStorageState(botAccount.botEmail.split("@")[0])

  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  const page = await context.newPage();

  await page.goto('https://app.gohighlevel.com/');
  await page.getByPlaceholder('Your email address').click();
  await page.getByPlaceholder('Your email address').fill(botAccount.botEmail);
  await page.getByPlaceholder('The password you picked').fill(botAccount.botPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.getByRole('button', { name: 'Send Security Code' }).click();
  await page.waitForTimeout(5_000)

  let code: string
  try {
    code = await get2faCode()
  } catch (error) {
    await page.waitForTimeout(5_000)
    code = await get2faCode()
  }
  
  await page.locator('.m-2').first().fill(code[0]);
  await page.locator('div:nth-child(2) > .m-2').fill(code[1]);
  await page.locator('div:nth-child(3) > .m-2').fill(code[2]);
  await page.locator('div:nth-child(4) > .m-2').fill(code[3]);
  await page.locator('div:nth-child(5) > .m-2').fill(code[4]);
  await page.locator('div:nth-child(6) > .m-2').fill(code[5]);
  await page.getByRole('button', { name: 'Confirm Code', exact: true }).click();

  await page.waitForURL("**/dashboard")

  // saveStorageState(botAccount.botEmail.split("@")[0], await context.storageState())


  let phoneCalls: PhoneCall[] = []
  for (let subAccount of (botAccount as any).subAccounts as SubAccount[]) {

    let foundCalls = await downloadAudio(page, saveDirectory, subAccount.locationId)
    phoneCalls = phoneCalls.concat(foundCalls)
  }

  browser.close()
  return phoneCalls
}

async function downloadAudio(page: Page, saveDirectory, locationId): Promise<PhoneCall[]> {
  // await page.getByRole('link', { name: 'Reporting' }).click();
  // await page.getByRole('link', { name: 'Call Reporting' }).click();

  await page.goto(`https://app.gohighlevel.com/v2/location/${locationId}/reporting/call_stats`)


  await page.getByPlaceholder('Start Date').fill(getYyyyMmDdDate());
  // await page.getByPlaceholder('Start Date').fill("2023-08-05");
  // const responsePromise = page.waitForResponse("https://services.leadconnectorhq.com/reporting/calls/get-inbound-call-sources")
  await page.getByPlaceholder('End Date').fill(getYyyyMmDdDate());
  // await page.getByPlaceholder('End Date').fill("2023-08-05");
  // await responsePromise;
  await page.waitForTimeout(1_000)

  let phoneCalls: PhoneCall[] = []


  const callsTable = await page.$('.table-container')
  if (!callsTable) {
    console.log("Failed to get calls table")
    return phoneCalls
  }
  await callsTable.scrollIntoViewIfNeeded()


  const rowSelector = await callsTable.$$('.n-data-table-tr')
  const callRows = rowSelector.slice(1)


  const answeredCallRows = await asyncFilter(callRows, async (row) => {
    const callStatusElement = await row.$('[data-col-key="callStatus"] div')
    const status = await callStatusElement?.innerHTML()
    return status == "Answered"
  })

  if (answeredCallRows.length > 0) {
    await page.waitForSelector('#buttons')
  }

  for (let row of answeredCallRows) {

    let dateTimeElements = await row.$$('[data-col-key="dateTime"] div');
    let dateString = await dateTimeElements[1]?.innerHTML()
    let timeString = await dateTimeElements[2]?.innerHTML()

    const timestamp: Date = parseHighLevelDateTime(dateString, timeString)




    let contactNameElement = await row.$('[data-col-key="contactName"] div');
    let callerName = await contactNameElement?.textContent() ?? "";
    let contactNumberElement = await row.$('[data-col-key="contactName"] div + div');
    let callerNumber = await contactNumberElement?.textContent() ?? "";


    const downloadButton = await row.$('#buttons :first-child');
    if (downloadButton) {

      const [download] = await Promise.all([
        page.waitForEvent('download'), // wait for download to start
        downloadButton.click()
      ]);

      const filepath = path.join(saveDirectory, download.suggestedFilename())
      await download.saveAs(filepath)
      await download.delete()


      phoneCalls.push({
        callerName,
        callerNumber,
        callTime: new Date(timestamp),
        accountId: locationId,
        transcription: "",
        filepath,
        tagged: false,
        tags: []
      })

    }
  }





  return phoneCalls
}


async function fetchAudioFiles(accountId: string, saveDirectory: string, signInEmail: string, signInPassword: string): Promise<PhoneCall[]> {
  const browser = await chromium.launch({ headless: false, slowMo: 0, });

  // let storageState = await loadStorageState(accountId)

  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  const page = await context.newPage();

  await page.goto('https://app.gohighlevel.com/');
  await page.getByPlaceholder('Your email address').click();
  await page.getByPlaceholder('Your email address').fill(signInEmail);
  await page.getByPlaceholder('The password you picked').fill(signInPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.getByRole('button', { name: 'Send Security Code' }).click();
  await page.waitForTimeout(5_000)

  const code: string = await get2faCode()
  await page.locator('.m-2').first().fill(code[0]);
  await page.locator('div:nth-child(2) > .m-2').fill(code[1]);
  await page.locator('div:nth-child(3) > .m-2').fill(code[2]);
  await page.locator('div:nth-child(4) > .m-2').fill(code[3]);
  await page.locator('div:nth-child(5) > .m-2').fill(code[4]);
  await page.locator('div:nth-child(6) > .m-2').fill(code[5]);
  await page.getByRole('button', { name: 'Confirm Code', exact: true }).click();
  await page.waitForURL("**/dashboard")


  saveStorageState(accountId, await context.storageState())
  const phoneCalls = await downloadAudio(page, saveDirectory, accountId)





  await browser.close();
  return phoneCalls

}


async function handleTokenRefresh(subAccount: SubAccount) {
  const now = new Date();

  // need to refresh
  if (subAccount.accessTokenExpiresAt && now.getTime() < subAccount.accessTokenExpiresAt.getTime()) {
    return
  }

  const res = await refreshToken(subAccount.refreshToken as string)
  if (res) {
    let accessTokenExpiresAt = new Date();
    accessTokenExpiresAt.setSeconds(accessTokenExpiresAt.getSeconds() + res.expires_in);

    await prisma.subAccount.update({
      where: {
        locationId: subAccount.locationId
      },
      data: {
        refreshToken: res.refresh_token,
        accessTokenExpiresAt,
        accessToken: res.access_token
      }
    })
  }



}



async function main() {

  const directoryPath = 'downloads/';



  const botAccounts: BotAccount[] = await prisma.botAccount.findMany({
    include: { subAccounts: true }
  });



  for (let botAccount of botAccounts) {
    // const { subAccounts } = botAccount as any
    // await Promise.all(subAccounts.map(handleTokenRefresh))
    const phoneCalls = await fetchBotAccountAudioFiles(botAccount, directoryPath)
    await prisma.phoneCall.createMany({ data: phoneCalls, skipDuplicates: true })
  }


  let subAccounts: SubAccount[] = await prisma.subAccount.findMany();
  for (let subAccount of subAccounts) {

    await handleTokenRefresh(subAccount)


    // if (subAccount.botEmail) {

    //   const phoneCalls: PhoneCall[] = await fetchAudioFiles(subAccount.locationId, directoryPath, subAccount.botEmail, subAccount.botPassword)
    //   const res = await prisma.phoneCall.createMany({ data: phoneCalls, skipDuplicates: true });
    // }






    const untaggedCalls = await prisma.phoneCall.findMany({
      where: {
        accountId: subAccount.locationId,
        tagged: false
      }
    });


    const phoneNumbers = new Set<string>();
    untaggedCalls.forEach((call) => phoneNumbers.add(call.callerNumber))
    const phoneNumberArray = Array.from(phoneNumbers)

    const highlevelContactsPromises = phoneNumberArray.map(phoneNumber => fetchUserByPhoneNumber(
      subAccount.accessToken as string,
      subAccount.locationId,
      phoneNumber
    ));


    const transcriptionPromises = untaggedCalls.map(async (phoneCall) => {
      const audioFile = await loadAudioFromFile(phoneCall.filepath)
      if (!audioFile) return
      const transcriptionPromise = transcribe(audioFile);


      return transcriptionPromise



    });

    const highlevelContacts = await Promise.all(highlevelContactsPromises)
    const transcriptions = await Promise.all(transcriptionPromises);

    const transcribedCalls = untaggedCalls.map((call, i) => {
      call.transcription = transcriptions[i] as string
      return call
    })

    for (let i = 0; i < phoneNumbers.size; i++) {
      const number = phoneNumberArray[i]
      const calls = transcribedCalls.filter((call) => call.callerNumber == number)
      const contact = highlevelContacts[i]

      if (!contact) {
        console.warn(`There was no user found for the number ${number} at location ${subAccount.locationId}`)
        continue
      }

      const fullTranscription = calls.map(c => c.transcription).join("\n")

      let tags: CustomerLabels[] = []
      let notes
      try {

        tags = await tag(fullTranscription);
        notes = await fill(fullTranscription)
        notes = notes.reduce((acc, question) => {
          const [q, a] = Object.entries(question)[0]
          return acc + `q: ${q}\na: ${a}\n\n`;
        }, "");
      } catch (error) {
        console.error(`Failed to get tags for call from ${number} on ${calls[0].callTime.toISOString()}`, error)
        continue;
      }
      let tagRes
      try {

        tagRes = await tagUser(subAccount.accessToken as string, contact.id, tags);
        await addUserNote(subAccount.accessToken as string, contact.id, notes)
      } catch (error) {
        console.error(`Failed to tag user for call from ${number} on ${calls[0].callTime.toISOString()}`, error)
        continue
      }

      if (tagRes) {

        calls.forEach(async phoneCall => {


          await prisma.phoneCall.update({
            where: {
              callTime_callerNumber_accountId: {
                callTime: phoneCall.callTime,
                callerNumber: phoneCall.callerNumber,
                accountId: phoneCall.accountId,
              },
            },
            data: {
              transcription: fullTranscription,
              tagged: true,
              tags: tagRes?.tagsAdded
            },
          }).catch(err => console.error("Failed to update call transcription", err))
          await fs.unlink(phoneCall.filepath)
        })
      }

    }






  }

}

main()


