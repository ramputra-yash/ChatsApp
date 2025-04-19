module.exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated() || req.cookies.user_id || req.user) {
        return next();
    }
    res.redirect('/');
}