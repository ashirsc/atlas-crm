import express, { Request, Response } from 'express';

import passport from 'passport';

export const authRouter = express.Router();




authRouter.get('/highlevel', passport.authenticate('oauth2'));

authRouter.get(
    '/highlevel/callback',
    passport.authenticate('oauth2', { failureRedirect: '/login', }),
    (_req: Request, res: Response) => {
        // Successful authentication, redirect home.
        console.log(_req.user)
        // res.redirect('/');
        res.send('done')
    }
);

authRouter.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

authRouter.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        console.log('google user callback', req.user)
        // Successful authentication, redirect home.
        res.redirect('/dashboard.html');
    });