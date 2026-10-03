function requireAuth(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    next();
}


function requireOrganizer(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    if (req.session.user.role !== "organizer") {
        return res.status(403).send("Access denied");
    }

    next();
}


module.exports = {
    requireAuth,
    requireOrganizer
};