import "dotenv/config"

import { Strategy as OAuth2Strategy, VerifyCallback } from 'passport-oauth2';
import express, { Request, Response } from 'express';

import passport from 'passport';
import session from 'express-session';

const app = express();

// Set up express application
app.use(
    session({
        secret: 'your-session-secret', // use a proper secret in production
        resave: false,
        saveUninitialized: true,
    })
);

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser<any, any>((user: any, done: any) => {
    done(null, user);
});

passport.deserializeUser<any, any>((user: any, done: any) => {
    done(null, user);
});

function getEnvironmentVariable(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
}

// Usage:
const CLIENT_ID = getEnvironmentVariable('HIGHLEVEL_CLIENT_ID');
const CLIENT_SECRET = getEnvironmentVariable('HIGHLEVEL_CLIENT_SECRET');
const AUTHORIZATION_URL = getEnvironmentVariable('HIGHLEVEL_AUTHORIZATION_URL');
const TOKEN_URL = getEnvironmentVariable('HIGHLEVEL_TOKEN_URL');



// OAuth2Strategy setup
passport.use(
    new OAuth2Strategy(
        {
            authorizationURL: AUTHORIZATION_URL,
            tokenURL: TOKEN_URL,
            clientID: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            callbackURL: 'http://localhost:3000/auth/callback',
            scope: ['contacts.write', 'contacts.readonly', 'conversations/message.write']
        },
        (accessToken: string, refreshToken: string, profile: any, cb: VerifyCallback) => {
            console.log('accessToken', accessToken)
            console.log('refreshToken', refreshToken)
            // User.findOrCreate({ exampleId: profile.id }, function (err, user) {
            //     return cb(err, user);
            // });
            return cb(null, profile); // Depending on your use case and the information you want to store, modify this.
        }
    )
);

// Routes
app.get('/', (_req: Request, res: Response) => res.send('Hello World!'));

app.get('/auth', passport.authenticate('oauth2'));

app.get(
    '/auth/callback',
    passport.authenticate('oauth2', { failureRedirect: '/login' }),
    (_req: Request, res: Response) => {
        // Successful authentication, redirect home.
        res.redirect('/');
    }
);

// Server setup
app.listen(3000, () => console.log('App listening on port 3000!'));
