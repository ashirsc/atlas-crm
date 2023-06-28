import axios from 'axios';

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjdZd1JqRGc0VmxHZEVGZWI0Zk9MIiwiY29tcGFueV9pZCI6IlQ5QU1raTVmM08yWml0cjFjMjlnIiwidmVyc2lvbiI6MSwiaWF0IjoxNjg3NTQwMTg4NjY4LCJzdWIiOiJ1c2VyX2lkIn0.ZuDC_2jxcYfWrwfOCjWo4z9_XKnB8Jfs82rI6Lzmdl4'

const apiV2 = axios.create({
    baseURL: "https://services.leadconnectorhq.com",
    headers: {
        Version: "2021-07-28",
        'Content-Type': 'application/json',

    }
})



const apiV1 = axios.create({
    baseURL:"https://rest.gohighlevel.com/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
})




const sendUserSMS = (userId: string) => {


}

export async function tagUser(userId: string, tags: string[]) {
    apiV2.post("/contacts/MHbttFcspTY1hJ6wWULw/tags", {
        tags: [
            "qualified lead"
        ]
    })
        .then(res => console.log)
        .catch(e => console.log)
}


export async function fetchContacts() {

  
  const res = await apiV1.get("/contacts/")
  return res.data
}