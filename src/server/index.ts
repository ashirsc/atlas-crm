import "dotenv/config"

import { Strategy as OAuth2Strategy, VerifyCallback } from 'passport-oauth2';
import { PrismaClient, User } from '@prisma/client'
import { QuestionCollection, createPromptModule } from 'inquirer';
import express, { Request, Response } from 'express';

import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { authRouter } from "./routes/auth.js";
import bodyParser from "body-parser";
import { getEnvironmentVariable } from "./utils.js";
import passport from 'passport';
import session from 'express-session';

const server = express();

const prisma = new PrismaClient()


// Body parser middleware
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());

// Set up express application
server.use(
    session({
        secret: 'your-session-secret', // use a proper secret in production
        resave: false,
        saveUninitialized: true,
    })
);

// Passport setup
server.use(passport.initialize());
server.use(passport.session());

passport.serializeUser((user: any, done: (err: any, id?: number) => void) => {
    if (user.id) {

        done(null, user.id);
    } else {
        done(null, -1)
    }
});

passport.deserializeUser((id: number, done: (err: any, user?: User | null) => void) => {
    prisma.user.findUnique({ where: { id } })
        .then((user) => done(null, user))
        .catch((err) => done(err));
});



const HIGHLEVEL_CLIENT_ID = getEnvironmentVariable('HIGHLEVEL_CLIENT_ID');
const HIGHLEVEL_CLIENT_SECRET = getEnvironmentVariable('HIGHLEVEL_CLIENT_SECRET');
const HIGHLEVEL_AUTHORIZATION_URL = getEnvironmentVariable('HIGHLEVEL_AUTHORIZATION_URL');
const HIGHLEVEL_TOKEN_URL = getEnvironmentVariable('HIGHLEVEL_TOKEN_URL');
passport.use(
    new OAuth2Strategy(
        {
            authorizationURL: HIGHLEVEL_AUTHORIZATION_URL,
            tokenURL: HIGHLEVEL_TOKEN_URL,
            clientID: HIGHLEVEL_CLIENT_ID,
            clientSecret: HIGHLEVEL_CLIENT_SECRET,
            callbackURL: 'http://localhost:3000/auth/highlevel/callback',
            scope: ['contacts.write', 'contacts.readonly', 'conversations/message.write']
        },
        async (accessToken: string, refreshToken: string, profile: any, cb: VerifyCallback) => {
            //this is where I need to create a new sub account
            // the sub account will have an id, access and refresh
            //then add the sub account id to the user
            console.log('profile', profile)
            console.log('accessToken', accessToken)
            console.log('refreshToken', refreshToken)
            // console.log('first', )

            type SubAccountOnBoard = { botAccountId: number, ownerId: number, locationId: string, name:string }

            const questions: QuestionCollection<SubAccountOnBoard> = [
                {
                    type: 'input',
                    name: 'name',
                    message: "What is the name of this location?"
                },
                {
                    type: 'input',
                    name: 'locationId',
                    message: "What's your location ID?",
                },
                {
                    type: 'number',
                    name: 'ownerId',
                    message: "What's your owner ID?",
                },

                {
                    type: 'number',
                    name: 'botAccountId',
                    message: "What's the botAccountId",
                },
            ];

            const prompt = createPromptModule()
            const answers:SubAccountOnBoard  = await prompt(questions)

            try {

                await prisma.subAccount.create({
                    data: {
                        name:answers.name,
                        locationId: answers.locationId,
                        ownerId: answers.ownerId ,
                        accessToken: accessToken,
                        refreshToken: refreshToken,
                        botEmail: "",
                        botPassword: "",
                        botAccountId: answers.botAccountId

                    }
                });

                console.log('Account information has been saved.');
                cb(null, {});
            }
            catch (err) {
                cb(err as unknown as Error)
            }
        }

    )
);


const GOOGLE_CLIENT_ID = getEnvironmentVariable('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = getEnvironmentVariable('GOOGLE_CLIENT_SECRET');
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
    async function (accessToken, refreshToken, profile, cb) {
        console.log('google user profile', profile)
        try {
            const user = await prisma.user.upsert({
                where: { email: profile.emails[0].value },
                update: { accessToken, refreshToken, profile },
                create: {
                    email: profile.emails[0].value,
                    displayName: profile.displayName,
                    accessToken,
                    refreshToken,
                    profile
                }
            });
            return cb(null, user)

        } catch (error) {
            return cb(error)
        }

    }
));





server.use('/auth', authRouter)
// console.log(path.join(__dirname))
// server.use(express.static('W:\\atlas-crm\\public'));




server.listen(3000, () => console.log('App listening on port 3000!'));


