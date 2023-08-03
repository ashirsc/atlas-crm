import { GetObjectCommand, ListObjectsV2Command, S3Client, _Object } from "@aws-sdk/client-s3";

import fs from 'fs';
import path from "node:path";

export function getYyyyMmDdDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;
    return formattedDate;


}


export function readFilesFromDirectory(directoryPath: string): string[] {
    const files: string[] = [];

    // Read the contents of the directory
    const directoryContents = fs.readdirSync(directoryPath);

    // Iterate over each file in the directory
    for (const fileName of directoryContents) {
        const filePath = `${directoryPath}/${fileName}`;

        // Check if the path is a file
        if (fs.statSync(filePath).isFile()) {
            files.push(fileName);
        }
    }

    return files;
}

export async function deleteFiles(directory: string) {
    // Read the contents of the directory
    const files = await fs.promises.readdir(directory);
  
    // Create an array of promises, each one being a file deletion
    const deletePromises = files.map((file) => {
      // Generate the full file path
      const filePath = path.join(directory, file);
  
      // Delete the file and return the Promise
      return fs.promises.unlink(filePath);
    });
  
    // Wait for all files to be deleted
    await Promise.all(deletePromises);
  }


export async function get2faCode() {
    const REGION = "us-west-2"; //replace with your Region
    const BUCKET_NAME = "atlasj"; //replace with your bucket name
    const PREFIX = "emails/"; //replace with your prefix



    const s3Client = new S3Client({ region: REGION });

    const listObjectsCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: PREFIX
    });

    let { Contents: objects } = await s3Client.send(listObjectsCommand);

    if (!objects) {
        throw new Error("get obejects failed");
    }
    // Sort the objects by last modified time in descending order
    objects.sort((a: _Object, b: _Object) => b.LastModified as unknown as number - (a.LastModified as any));

    // Get the key of the most recent object
    const mostRecentObjectKey = objects[0].Key;

    console.log('Most Recent Object Key: ', mostRecentObjectKey);
    const oneMinuteAgo = new Date(Date.now() - 60000);

    // Fetch the object
    const getObjectCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: mostRecentObjectKey,
        IfModifiedSince: oneMinuteAgo
    });

    const { Body: objectStream } = await s3Client.send(getObjectCommand);
    const objectData = await objectStream?.transformToString()

    const securityCodeRegex = /Your login security code: (\d+)/;
    const securityCodeMatch = objectData?.match(securityCodeRegex);
    const securityCode = securityCodeMatch && securityCodeMatch[1];

    if (!securityCode) {
        throw new Error("unable to parse code");

    }

    return securityCode
}

export function parseHighLevelDateTime(dateString, timeString):Date {
    // Remove the 'PM' from time and split it into hours and minutes
    let timeParts = timeString.slice(0, -3).split(':');
    let hours = parseInt(timeParts[0]);
    let minutes = parseInt(timeParts[1]);

    // Add 12 hours if the time is PM
    if (timeString.endsWith('PM') && hours !== 12) {
        hours += 12;
    }

    // Convert the date string into a date object
    let dateParts = dateString.split(' ');
    let year = parseInt(dateParts[2]);
    let day = parseInt(dateParts[1]);
    let month = new Date(dateParts[0] + ' 1, ' + dateParts[2]).getMonth();

    return new Date(year, month, day, hours, minutes);
}


export async function asyncFilter<T>(array: T[], predicate: (value: T) => Promise<boolean>): Promise<T[]> {
    const results: boolean[] = await Promise.all(array.map(predicate));
    return array.filter((_, index) => results[index]);
}
