const express = require('express');
const passport = require('../config/authGoogle'); // Import Google Auth
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load environment variables

// Google Auth Route
router.get('/google', passport.authenticate('google',
     {
        scope: ['profile', 'email'], 
        prompt: 'select_account' // Force user to select an account
    }));

// Google Auth Callback Route
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        if (!req.user) return res.redirect('/');

        // JWT Token Generate
        const token = jwt.sign({ id: req.user._id, email: req.user.email }, process.env.JWT_SECRET, { expiresIn: '2h' });

        // HTTP-Only Cookie Set
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Secure only in production
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });
        res.cookie('user_id', req.user._id, {
            maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie expiration (7 days)
        });

        res.redirect('/chat'); // Redirect to chat page after login
    }
);

// Logout
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.cookie('user_id', "")
        res.redirect('/');
    });
});

module.exports = router;