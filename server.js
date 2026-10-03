const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");

const db = require("./db/database");

const app = express();

const PORT = 3000;


/* =========================================================
   BASIC CONFIGURATION
========================================================= */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
    console.log(
        "REQUEST:",
        req.method,
        req.originalUrl
    );

    next();
});

/* =========================================================
   SESSION
========================================================= */

app.use(
    session({
        secret: "campusconnect-secret-2026",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

// Prevent browser from showing protected pages after logout
app.use((req, res, next) => {
    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
    );

    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    next();
});

/* =========================================================
   LOGOUT
========================================================= */

app.post("/logout", (req, res) => {

    console.log("================================");
    console.log("LOGOUT ROUTE CALLED");
    console.log("Method:", req.method);
    console.log("URL:", req.originalUrl);

    req.session.destroy((err) => {

        if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Unable to logout");
        }

        // Remove the session cookie from the browser
        res.clearCookie("connect.sid");

        console.log("USER LOGGED OUT");
        console.log("================================");

        res.redirect("/login");
    });
});



/* =========================================================
   MAKE LOGGED-IN USER AVAILABLE TO EJS
========================================================= */

app.use((req, res, next) => {

    res.locals.user = req.session.user || null;

    next();

});


/* =========================================================
   AUTHENTICATION MIDDLEWARE
========================================================= */

function requireLogin(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    next();
}


/* =========================================================
   ORGANIZER MIDDLEWARE
========================================================= */

function requireOrganizer(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    console.log("=================================");
    console.log("ORGANIZER ACCESS CHECK");
    console.log("User ID:", req.session.user.id);
    console.log("User Name:", req.session.user.name);
    console.log("User Email:", req.session.user.email);
    console.log("User Role:", req.session.user.role);
    console.log("=================================");

    if (req.session.user.role !== "organizer") {

        return res.status(403).send(
            "Access denied. Logged-in role is: " +
            req.session.user.role +
            ". Required role: organizer."
        );
    }

    next();
}
/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {

    try {

        const upcomingEvents = db.prepare(`
            SELECT *
            FROM events
            WHERE event_date >= date('now')
            ORDER BY event_date ASC, event_time ASC
            LIMIT 6
        `).all();

        res.render("index", {
            upcomingEvents
        });

    } catch (error) {

        console.error("Home error:", error);

        res.render("index", {
            upcomingEvents: []
        });

    }

});


/* =========================================================
   SIGNUP PAGE
========================================================= */

app.get("/signup", (req, res) => {

    res.render("signup", {
        error: null
    });

});


/* =========================================================
   SIGNUP
========================================================= */

app.post("/signup", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            role
        } = req.body;


        if (!name || !email || !password) {

            return res.render("signup", {
                error: "Please fill in all fields."
            });

        }


        const cleanName = name.trim();

        const cleanEmail =
            email.trim().toLowerCase();


        if (password.length < 6) {

            return res.render("signup", {
                error:
                    "Password must be at least 6 characters."
            });

        }


        const existingUser = db.prepare(`
            SELECT id
            FROM users
            WHERE LOWER(email) = ?
        `).get(cleanEmail);


        if (existingUser) {

            return res.render("signup", {
                error: "Email address already exists."
            });

        }


        const hashedPassword =
            await bcrypt.hash(password, 12);


        const selectedRole =
            role === "organizer"
                ? "organizer"
                : "student";


        const result = db.prepare(`
            INSERT INTO users
            (
                name,
                email,
                password,
                role
            )
            VALUES (?, ?, ?, ?)
        `).run(
            cleanName,
            cleanEmail,
            hashedPassword,
            selectedRole
        );


        req.session.user = {

            id: result.lastInsertRowid,

            name: cleanName,

            email: cleanEmail,

            role: selectedRole

        };


        res.redirect("/dashboard");


    } catch (error) {

        console.error("Signup error:", error);

        res.render("signup", {
            error:
                "Unable to create account. " +
                error.message
        });

    }

});


/* =========================================================
   LOGIN PAGE
========================================================= */

app.get("/login", (req, res) => {

    res.render("login", {
        error: null
    });

});


/* =========================================================
   LOGIN
========================================================= */

app.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.render("login", {
                error:
                    "Please enter your email and password."
            });

        }


        const cleanEmail =
            email.trim().toLowerCase();


        const user = db.prepare(`
            SELECT *
            FROM users
            WHERE LOWER(email) = ?
        `).get(cleanEmail);


        if (!user) {

            return res.render("login", {
                error: "Invalid email or password."
            });

        }


        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.render("login", {
                error: "Invalid email or password."
            });

        }


        req.session.user = {

            id: user.id,

            name: user.name,

            email: user.email,

            role: user.role

        };


        res.redirect("/dashboard");


    } catch (error) {

        console.error("Login error:", error);

        res.render("login", {
            error:
                "Unable to login. Please try again."
        });

    }

});




/* =========================================================
   DASHBOARD
========================================================= */

app.get("/dashboard", requireLogin, (req, res) => {

    try {

        const userId = req.session.user.id;


        /* -------------------------------------------------
           UPCOMING EVENTS
        ------------------------------------------------- */

        const upcomingEvents = db.prepare(`
            SELECT *
            FROM events
            WHERE event_date >= date('now')
            ORDER BY event_date ASC, event_time ASC
            LIMIT 6
        `).all();


        /* -------------------------------------------------
           EVENTS REGISTERED BY USER
        ------------------------------------------------- */

        const registeredEvents = db.prepare(`
            SELECT
                events.*,
                registrations.status AS registration_status

            FROM registrations

            INNER JOIN events
                ON events.id = registrations.event_id

            WHERE registrations.user_id = ?

            ORDER BY events.event_date ASC
        `).all(userId);


        /* -------------------------------------------------
           TOTAL EVENTS
        ------------------------------------------------- */

        const totalEvents = db.prepare(`
            SELECT COUNT(*) AS count
            FROM events
        `).get().count;


        /* -------------------------------------------------
           TOTAL REGISTRATIONS BY USER
        ------------------------------------------------- */

        const totalRegistrations = db.prepare(`
            SELECT COUNT(*) AS count
            FROM registrations
            WHERE user_id = ?
        `).get(userId).count;


        /* -------------------------------------------------
           NOTIFICATIONS
        ------------------------------------------------- */

        const notifications = db.prepare(`
            SELECT *
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 5
        `).all(userId);


        /* -------------------------------------------------
           UNREAD NOTIFICATIONS
        ------------------------------------------------- */

        const unreadNotifications = db.prepare(`
            SELECT COUNT(*) AS count
            FROM notifications
            WHERE user_id = ?
            AND is_read = 0
        `).get(userId).count;


        /* -------------------------------------------------
           EVENTS CREATED BY ORGANIZER
        ------------------------------------------------- */

        const organizerEvents = db.prepare(`
            SELECT *
            FROM events
            WHERE organizer_id = ?
            ORDER BY event_date ASC, event_time ASC
        `).all(userId);


        /* -------------------------------------------------
           REGISTRATIONS FOR ORGANIZER EVENTS
        ------------------------------------------------- */

        const organizerRegistrations = db.prepare(`
            SELECT COUNT(*) AS count

            FROM registrations

            INNER JOIN events
                ON events.id = registrations.event_id

            WHERE events.organizer_id = ?
        `).get(userId).count;


        /* -------------------------------------------------
           SEND DATA TO DASHBOARD
        ------------------------------------------------- */

        res.render("dashboard", {

            upcomingEvents,

            registeredEvents,

            totalEvents,

            totalRegistrations,

            notifications,

            unreadNotifications,

            organizerEvents,

            organizerRegistrations

        });


    } catch (error) {

        console.error("Dashboard error:", error);

        res.status(500).send(
            "Dashboard error: " + error.message
        );

    }

});


/* =========================================================
   EVENTS LIST
========================================================= */

app.get("/events", requireLogin, (req, res) => {

    try {

        // Get search and category from URL
        const search = req.query.search || "";
        const category = req.query.category || "";

        let query = `
            SELECT
                events.*,
                users.name AS organizer_name
            FROM events
            LEFT JOIN users
                ON users.id = events.organizer_id
            WHERE 1 = 1
        `;

        const params = [];

        // Search by title, description, category or venue
        if (search.trim() !== "") {

            query += `
                AND (
                    events.title LIKE ?
                    OR events.description LIKE ?
                    OR events.category LIKE ?
                    OR events.venue LIKE ?
                )
            `;

            const searchValue = `%${search.trim()}%`;

            params.push(
                searchValue,
                searchValue,
                searchValue,
                searchValue
            );
        }

        // Filter by category
        if (category.trim() !== "") {

            query += `
                AND events.category = ?
            `;

            params.push(category);
        }

        query += `
            ORDER BY
                events.event_date ASC,
                events.event_time ASC
        `;

        const events = db.prepare(query).all(...params);

        // Get categories for the dropdown
        const categories = db.prepare(`
            SELECT DISTINCT category
            FROM events
            WHERE category IS NOT NULL
              AND category != ''
            ORDER BY category ASC
        `).all();

        res.render("events", {

            events: events,

            search: search,

            category: category,

            categories: categories

        });

    } catch (error) {

        console.error("Events error:", error);

        res.status(500).send(
            "Events error: " + error.message
        );

    }

});

/* =========================================================
   CREATE EVENT PAGE
========================================================= */

app.get("/events/create", requireOrganizer, (req, res) => {

    console.log("=================================");
    console.log("CREATE EVENT PAGE REQUESTED");
    console.log("User:", req.session.user);
    console.log("=================================");

    res.render("create-event", {
        error: null
    });

});

/* =========================================================
   CREATE EVENT - SAVE EVENT
========================================================= */

app.post("/events/create", requireOrganizer, (req, res) => {
    try {

        const {
            title,
            description,
            category,
            event_date,
            event_time,
            venue,
            capacity,
            registration_deadline
        } = req.body;

        // Validate required fields
        if (
            !title ||
            !description ||
            !category ||
            !event_date ||
            !event_time ||
            !venue ||
            !capacity
        ) {
            return res.status(400).render("create-event", {
                error: "Please fill in all required fields."
            });
        }

        const cleanTitle = title.trim();
        const cleanDescription = description.trim();
        const cleanVenue = venue.trim();
        const eventCapacity = Number(capacity);

        if (eventCapacity <= 0 || !Number.isInteger(eventCapacity)) {
            return res.status(400).render("create-event", {
                error: "Capacity must be a positive whole number."
            });
        }

        // Insert event
        const result = db.prepare(`
            INSERT INTO events
            (
                title,
                description,
                category,
                event_date,
                event_time,
                venue,
                capacity,
                registration_deadline,
                organizer_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            cleanTitle,
            cleanDescription,
            category,
            event_date,
            event_time,
            cleanVenue,
            eventCapacity,
            registration_deadline || null,
            req.session.user.id
        );

        console.log("=================================");
        console.log("EVENT CREATED");
        console.log("Event ID:", result.lastInsertRowid);
        console.log("Organizer ID:", req.session.user.id);
        console.log("Title:", cleanTitle);
        console.log("=================================");

        // Redirect to the newly created event
        res.redirect(`/events/${result.lastInsertRowid}`);

    } catch (error) {

        console.error("Create event error:", error);

        res.status(500).render("create-event", {
            error: "Unable to create event: " + error.message
        });
    }
});

/* =========================================================
   EVENT DETAILS
   IMPORTANT: THIS COMES AFTER /events/create
========================================================= */


app.get(
    "/events/:id",
    requireLogin,
    (req, res) => {

        try {

            const eventId = Number(req.params.id);


            if (!Number.isInteger(eventId)) {

                return res.status(404).render("404", {
                    message: "Event not found."
                });

            }


            /* -----------------------------------------
               GET EVENT
            ----------------------------------------- */

            const event = db.prepare(`
                SELECT
                    events.*,
                    users.name AS organizer_name

                FROM events

                LEFT JOIN users
                    ON users.id = events.organizer_id

                WHERE events.id = ?
            `).get(eventId);


            if (!event) {

                return res.status(404).render("404", {
                    message: "Event not found."
                });

            }


            /* -----------------------------------------
               NUMBER OF REGISTERED STUDENTS
            ----------------------------------------- */

            const registeredCount = db.prepare(`
                SELECT COUNT(*) AS count

                FROM registrations

                WHERE event_id = ?

                AND status = 'registered'
            `).get(eventId).count;


            /* -----------------------------------------
               CURRENT USER REGISTRATION
            ----------------------------------------- */

            const registration = db.prepare(`
                SELECT *

                FROM registrations

                WHERE event_id = ?

                AND user_id = ?
            `).get(
                eventId,
                req.session.user.id
            );


            /* -----------------------------------------
               SEND DATA TO EVENT DETAILS PAGE
            ----------------------------------------- */

            res.render(
                "event-details",
                {

                    event,

                    registration:
                        registration || null,

                    registeredCount

                }
            );


        } catch (error) {

            console.error(
                "Event details error:",
                error
            );

            res.status(500).send(
                "Event details error: " +
                error.message
            );

        }

    }
);

/* =========================================================
   REGISTER FOR EVENT
========================================================= */

app.post(
    "/events/:id/register",
    requireLogin,
    (req, res) => {

        try {

            const eventId =
                Number(req.params.id);

            const userId =
                req.session.user.id;


            const event = db.prepare(`
                SELECT *
                FROM events
                WHERE id = ?
            `).get(eventId);


            if (!event) {

                return res.status(404).render("404", {
                    message: "Event not found."
                });

            }


            const existing = db.prepare(`
                SELECT *
                FROM registrations

                WHERE event_id = ?
                AND user_id = ?
            `).get(
                eventId,
                userId
            );


            if (existing) {

                return res.redirect(
                    `/events/${eventId}`
                );

            }


            const registeredCount = db.prepare(`
                SELECT COUNT(*) AS count

                FROM registrations

                WHERE event_id = ?

                AND status = 'registered'
            `).get(eventId).count;


            let status = "registered";


            if (
                Number(event.capacity) > 0 &&
                registeredCount >= Number(event.capacity)
            ) {

                status = "waitlisted";

            }


            db.prepare(`
                INSERT INTO registrations
                (
                    event_id,
                    user_id,
                    status
                )

                VALUES (?, ?, ?)
            `).run(
                eventId,
                userId,
                status
            );


            const message =
                status === "registered"
                    ? `You registered for ${event.title}.`
                    : `You have been added to the waitlist for ${event.title}.`;


            db.prepare(`
                INSERT INTO notifications
                (
                    user_id,
                    event_id,
                    message
                )

                VALUES (?, ?, ?)
            `).run(
                userId,
                eventId,
                message
            );


            res.redirect(
                `/events/${eventId}`
            );


        } catch (error) {

            console.error(
                "Register error:",
                error
            );

            res.redirect("/events");

        }

    }
);


/* =========================================================
   CANCEL REGISTRATION
========================================================= */

app.post(
    "/events/:id/cancel",
    requireLogin,
    (req, res) => {

        try {

            const eventId =
                Number(req.params.id);

            const userId =
                req.session.user.id;


            const event = db.prepare(`
                SELECT *
                FROM events
                WHERE id = ?
            `).get(eventId);


            db.prepare(`
                DELETE FROM registrations

                WHERE event_id = ?
                AND user_id = ?
            `).run(
                eventId,
                userId
            );


            if (event) {

                db.prepare(`
                    INSERT INTO notifications
                    (
                        user_id,
                        event_id,
                        message
                    )

                    VALUES (?, ?, ?)
                `).run(

                    userId,

                    eventId,

                    `Your registration for ${event.title} has been cancelled.`

                );

            }


            res.redirect(
                `/events/${eventId}`
            );


        } catch (error) {

            console.error(
                "Cancel registration error:",
                error
            );

            res.redirect("/events");

        }

    }
);


/* =========================================================
   MY EVENTS
========================================================= */

app.get(
    "/my-events",
    requireLogin,
    (req, res) => {

        try {

            const events = db.prepare(`
                SELECT
                    events.*,
                    registrations.status AS registration_status

                FROM registrations

                INNER JOIN events
                    ON events.id = registrations.event_id

                WHERE registrations.user_id = ?

                ORDER BY events.event_date ASC
            `).all(
                req.session.user.id
            );


            res.render("my-events", {
                events
            });


        } catch (error) {

            console.error(
                "My Events error:",
                error
            );

            res.status(500).send(
                "My Events error: " +
                error.message
            );

        }

    }
);


/* =========================================================
   NOTIFICATIONS
========================================================= */

app.get(
    "/notifications",
    requireLogin,
    (req, res) => {

        try {

            const notifications = db.prepare(`
                SELECT
                    notifications.*,
                    events.title AS event_title

                FROM notifications

                LEFT JOIN events
                    ON events.id = notifications.event_id

                WHERE notifications.user_id = ?

                ORDER BY notifications.created_at DESC
            `).all(
                req.session.user.id
            );


            res.render("notifications", {
                notifications
            });


        } catch (error) {

            console.error(
                "Notifications error:",
                error
            );

            res.status(500).send(
                "Notifications error: " +
                error.message
            );

        }

    }
);


/* =========================================================
   MARK NOTIFICATIONS AS READ
========================================================= */

app.post(
    "/notifications/read",
    requireLogin,
    (req, res) => {

        try {

            db.prepare(`
                UPDATE notifications

                SET is_read = 1

                WHERE user_id = ?
            `).run(
                req.session.user.id
            );

        } catch (error) {

            console.error(
                "Notification update error:",
                error
            );

        }


        res.redirect("/notifications");

    }
);


/* =========================================================
   ORGANIZER EVENTS
========================================================= */

app.get(
    "/organizer/events",
    requireOrganizer,
    (req, res) => {

        try {

            const events = db.prepare(`
                SELECT *
                FROM events

                WHERE organizer_id = ?

                ORDER BY event_date ASC
            `).all(
                req.session.user.id
            );


            res.render("organizer-events", {
                events
            });


        } catch (error) {

            console.error(
                "Organizer events error:",
                error
            );

            res.status(500).send(
                "Organizer events error: " +
                error.message
            );

        }

    }
);


/* =========================================================
   EDIT EVENT PAGE
========================================================= */

app.get(
    "/events/:id/edit",
    requireOrganizer,
    (req, res) => {

        try {

            const eventId =
                Number(req.params.id);


            const event = db.prepare(`
                SELECT *
                FROM events

                WHERE id = ?

                AND organizer_id = ?
            `).get(
                eventId,
                req.session.user.id
            );


            if (!event) {

                return res.status(404).render("404", {
                    message: "Event not found."
                });

            }


            res.render("edit-event", {

                event,

                error: null

            });


        } catch (error) {

            console.error(
                "Edit event page error:",
                error
            );

            res.status(500).send(
                "Edit event error: " +
                error.message
            );

        }

    }
);


/* =========================================================
   UPDATE EVENT
========================================================= */

app.post(
    "/events/:id/edit",
    requireOrganizer,
    (req, res) => {

        try {

            const eventId =
                Number(req.params.id);


            const {
                title,
                description,
                category,
                event_date,
                event_time,
                venue,
                capacity,
                registration_deadline
            } = req.body;


            db.prepare(`
                UPDATE events

                SET
                    title = ?,
                    description = ?,
                    category = ?,
                    event_date = ?,
                    event_time = ?,
                    venue = ?,
                    capacity = ?,
                    registration_deadline = ?

                WHERE id = ?

                AND organizer_id = ?
            `).run(

                title.trim(),

                description.trim(),

                category,

                event_date,

                event_time,

                venue.trim(),

                Number(capacity),

                registration_deadline,

                eventId,

                req.session.user.id

            );


            res.redirect(
                `/events/${eventId}`
            );


        } catch (error) {

            console.error(
                "Update event error:",
                error
            );

            res.redirect("/events");

        }

    }
);


/* =========================================================
   DELETE EVENT
========================================================= */

app.post(
    "/events/:id/delete",
    requireOrganizer,
    (req, res) => {

        try {

            const eventId =
                Number(req.params.id);


            db.prepare(`
                DELETE FROM registrations
                WHERE event_id = ?
            `).run(eventId);


            db.prepare(`
                DELETE FROM notifications
                WHERE event_id = ?
            `).run(eventId);


            db.prepare(`
                DELETE FROM events

                WHERE id = ?

                AND organizer_id = ?
            `).run(
                eventId,
                req.session.user.id
            );


            res.redirect("/events");


        } catch (error) {

            console.error(
                "Delete event error:",
                error
            );

            res.redirect("/events");

        }

    }
);


/* =========================================================
   VIEW EVENT REGISTRATIONS
========================================================= */

app.get(
    "/events/:id/registrations",
    requireOrganizer,
    (req, res) => {

        try {

            const eventId = Number(req.params.id);

            const event = db.prepare(`
                SELECT *
                FROM events
                WHERE id = ?
                AND organizer_id = ?
            `).get(
                eventId,
                req.session.user.id
            );

            if (!event) {

                return res.status(404).render("404", {
                    message: "Event not found."
                });

            }

            const registrations = db.prepare(`
                SELECT
                    registrations.*,
                    users.name,
                    users.email
                FROM registrations
                INNER JOIN users
                    ON users.id = registrations.user_id
                WHERE registrations.event_id = ?
                ORDER BY registrations.registered_at ASC
            `).all(eventId);

            res.render(
                "event-registrations",
                {
                    event,
                    registrations
                }
            );

        } catch (error) {

            console.error(
                "Registrations error:",
                error
            );

            res.status(500).send(
                "Registrations error: " +
                error.message
            );

        }

    }
);


/* =========================================================
   404 PAGE
   THIS MUST BE THE LAST ROUTE
========================================================= */

app.use((req, res) => {

    res.status(404).render("404", {
        message:
            "The page you're looking for doesn't exist."
    });

});


/* =========================================================
   GENERAL ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {

    console.error("SERVER ERROR:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).send(
        "Something went wrong: " +
        error.message
    );

});


/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log("       CAMPUSCONNECT SERVER");
    console.log("======================================");
    console.log("");

    console.log(
        `CampusConnect running at http://localhost:${PORT}`
    );

    console.log("");
    console.log("======================================");

});