import "dotenv/config"

import { PhoneCall, PrismaClient, SubAccount, } from '@prisma/client'
import { asyncFilter, deleteFiles, get2faCode, getYyyyMmDdDate, parseHighLevelDateTime, readFilesFromDirectory } from "./utils.js";
import { fetchUserByPhoneNumber, refreshToken, tagUser } from "../highlevel.js";
import { fill, tag } from "../questionaire.js";
import { loadAudioFromFile, transcribe } from "../audio.js";

import { chromium } from "playwright"
import path from "path"

const prisma = new PrismaClient()




async function fetchAudioFiles(accountId: string, saveDirectory: string, signInEmail: string, signInPassword: string): Promise<PhoneCall[]> {
  const browser = await chromium.launch({ headless: false, slowMo: 0, });
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


//  await context.storageState

  await page.getByRole('link', { name: 'Reporting' }).click();
  await page.getByRole('link', { name: 'Call Reporting' }).click();

  await page.getByPlaceholder('Start Date').fill(getYyyyMmDdDate());
  // await page.getByPlaceholder('Start Date').fill("2023-07-25");
  // const responsePromise = page.waitForResponse("https://services.leadconnectorhq.com/reporting/calls/get-inbound-call-sources")
  await page.getByPlaceholder('End Date').fill(getYyyyMmDdDate());
  // await page.getByPlaceholder('End Date').fill("2023-07-25");
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
        accountId,
        transcription: "",
        filepath,
        tagged: false,
        tags: []
      })

    }
  }





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

  let subAccounts: SubAccount[] = await prisma.subAccount.findMany();
  subAccounts = subAccounts.filter((sa) => sa.locationId !== "7YwRjDg4VlGdEFeb4fOL")


  for (let subAccount of subAccounts) {

    await handleTokenRefresh(subAccount)

    const directoryPath = 'downloads/';

    const phoneCalls: PhoneCall[] = await fetchAudioFiles(subAccount.locationId, directoryPath, subAccount.botEmail, subAccount.botPassword)


    const res = await prisma.phoneCall.createMany({ data: phoneCalls, skipDuplicates: true });

    const untaggedCalls = await prisma.phoneCall.findMany({
      where: {
        accountId: subAccount.locationId,
        tagged: false
      }
    });


    const taggingPromises = untaggedCalls.map(async (phoneCall) => {
      const transcriptionPromise = transcribe(loadAudioFromFile(phoneCall.filepath));


      // prisma.phoneCall()
      const highlevelUserPromise = fetchUserByPhoneNumber(
        subAccount.accessToken as string,
        subAccount.locationId,
        phoneCall.callerNumber
      );

      const [transcription, highlevelUser] = await Promise.all([transcriptionPromise, highlevelUserPromise]);



      if (highlevelUser) {
        const tags = await tag(transcription);
        const tagRes = await tagUser(subAccount.accessToken as string, highlevelUser.id, tags);

        if (tagRes) {


          prisma.phoneCall.update({
            where: {
              callTime_callerNumber_accountId: {
                callTime: phoneCall.callTime,
                callerNumber: phoneCall.callerNumber,
                accountId: phoneCall.accountId,
              },
            },
            data: {
              transcription,
              tagged: true,
              tags: tagRes?.tagsAdded
            },
          }).catch(err => console.error("Failed to update call transcription", err))
        }
      }
    });

    await Promise.all(taggingPromises);

    await deleteFiles(directoryPath).catch(console.error)



  }

}

main()


