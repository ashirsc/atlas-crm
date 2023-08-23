import { Axios } from 'axios';
import { getEnvironmentVariable } from './server/utils.js';
import qs from 'querystring';

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjdZd1JqRGc0VmxHZEVGZWI0Zk9MIiwiY29tcGFueV9pZCI6IlQ5QU1raTVmM08yWml0cjFjMjlnIiwidmVyc2lvbiI6MSwiaWF0IjoxNjg3NTQwMTg4NjY4LCJzdWIiOiJ1c2VyX2lkIn0.ZuDC_2jxcYfWrwfOCjWo4z9_XKnB8Jfs82rI6Lzmdl4'

const apiV1 = new Axios({
    baseURL: "https://rest.gohighlevel.com/v1",
    headers: {
        Authorization: `Bearer ${apiKey}`
    }
})


const apiV2 = new Axios({
    baseURL: "https://services.leadconnectorhq.com",
    headers: {
        Version: "2021-07-28",
        'Content-Type': 'application/json',
        Accept: 'application/json'
    },

})







const sendUserSMS = (userId: string) => {


}

export type POSTTagsResponse = {
    tags: string[];
    tagsAdded: string[];
    traceId: string;
};
export async function tagUser(accessToken: string, userId: string, tags: string[]): Promise<POSTTagsResponse | undefined> {
    try {

        const res = await apiV2.post<string>(`/contacts/${userId}/tags`, JSON.stringify({ tags }), {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
        return JSON.parse(res.data) as POSTTagsResponse

    } catch (error) {
        console.log(`Failed to add tags [${tags.join()}] to ${userId}`)
        return
    }
}
export async function addUserNote(accessToken: string, userId: string, note: string): Promise<POSTTagsResponse | undefined> {
    try {

        const res = await apiV2.post<string>(`/contacts/${userId}/notes`, JSON.stringify({body:note}), {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
        return JSON.parse(res.data)

    } catch (error) {
        console.log(`Failed to add note to ${userId}`)
        return
    }
}


export async function fetchContacts() {


    const res = await apiV1.get("/contacts/")
    return res.data
}



export const fetchUserByPhoneNumber = async (accessToken: string, locationId: string, phoneNumber): Promise<any | null> => {
    try {
        const response = await apiV2.get('/contacts/', {
            headers: {
                'Authorization': `Bearer ${accessToken}`, // Replace with your access token
            },
            params: {
                limit: 100, // or any other limit you'd like to set up to 100
                query: phoneNumber, // phone number goes here
                locationId // replace with your locationId
                // you can also add startAfter, startAfterId if needed
            },
        });

        return JSON.parse(response.data).contacts[0];
    } catch (error) {
        console.error(`Error: ${error}`);
    }
};


interface RefreshResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    userType: string;
    companyId: string;
    locationId: string;
}


export const refreshToken = async (refreshToken: string): Promise<RefreshResponse | undefined> => {

    const config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };


    const HIGHLEVEL_CLIENT_SECRET = getEnvironmentVariable('HIGHLEVEL_CLIENT_SECRET');
    const HIGHLEVEL_CLIENT_ID = getEnvironmentVariable('HIGHLEVEL_CLIENT_ID');
    const body = qs.stringify({
        grant_type: 'refresh_token',
        client_id: HIGHLEVEL_CLIENT_ID, // replace this with your client ID
        client_secret: HIGHLEVEL_CLIENT_SECRET, // replace this with your client secret
        refresh_token: refreshToken
    });

    try {
        const response = await apiV2.post("/oauth/token", body, config);
        return JSON.parse(response.data);
    } catch (error) {
        console.error('Failed to refresh token', error);
    }
}

