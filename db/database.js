const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");


// ========================================
// DATABASE CONNECTION
// ========================================

const dbPath = path.join(__dirname, "campusconnect.db");

const db = new Database(dbPath);

console.log("Connected to CampusConnect database.");


// ========================================
// ENABLE FOREIGN KEYS
// ========================================

db.pragma("foreign_keys = ON");


// ========================================
// USERS TABLE
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();


// ========================================
// EVENTS TABLE
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        organizer_id INTEGER NOT NULL,

        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,

        event_date TEXT NOT NULL,
        event_time TEXT NOT NULL,

        venue TEXT NOT NULL,

        capacity INTEGER NOT NULL DEFAULT 100,

        registration_deadline TEXT NOT NULL,

        image TEXT DEFAULT '',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (organizer_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    )
`).run();


// ========================================
// REGISTRATIONS TABLE
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS registrations (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        event_id INTEGER NOT NULL,

        user_id INTEGER NOT NULL,

        status TEXT NOT NULL DEFAULT 'registered',

        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (event_id)
            REFERENCES events(id)
            ON DELETE CASCADE,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        UNIQUE(event_id, user_id)
    )
`).run();


// ========================================
// WAITLIST TABLE
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS waitlist (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        event_id INTEGER NOT NULL,

        user_id INTEGER NOT NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (event_id)
            REFERENCES events(id)
            ON DELETE CASCADE,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        UNIQUE(event_id, user_id)
    )
`).run();


// ========================================
// NOTIFICATIONS TABLE
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        event_id INTEGER,

        message TEXT NOT NULL,

        is_read INTEGER NOT NULL DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        FOREIGN KEY (event_id)
            REFERENCES events(id)
            ON DELETE CASCADE
    )
`).run();


console.log("All database tables are ready.");


// ========================================
// CREATE DEMO ORGANIZER
// ========================================

const organizerEmail = "organizer@campusconnect.com";

let organizer = db
    .prepare(`
        SELECT id
        FROM users
        WHERE email = ?
    `)
    .get(organizerEmail);


if (!organizer) {

    const hashedPassword = bcrypt.hashSync(
        "Organizer@123",
        12
    );

    const result = db
        .prepare(`
            INSERT INTO users
            (name, email, password, role)
            VALUES (?, ?, ?, ?)
        `)
        .run(
            "CampusConnect Organizer",
            organizerEmail,
            hashedPassword,
            "organizer"
        );

    organizer = {
        id: result.lastInsertRowid
    };

    console.log("Demo organizer created.");

}


// ========================================
// SAMPLE EVENTS
// ========================================

const sampleEvents = [

    {
        title: "CodeSprint 2026",
        description:
            "A competitive coding event where students solve programming challenges and compete with other participants.",
        category: "Technical",
        event_date: "2026-10-05",
        event_time: "10:00",
        venue: "Computer Lab",
        capacity: 100,
        registration_deadline: "2026-10-04",
        image: ""
    },

    {
        title: "AI & ML Workshop",
        description:
            "An interactive workshop introducing students to Artificial Intelligence, Machine Learning and real-world applications.",
        category: "Workshop",
        event_date: "2026-10-08",
        event_time: "11:00",
        venue: "Seminar Hall",
        capacity: 80,
        registration_deadline: "2026-10-07",
        image: ""
    },

    {
        title: "Campus Photography Contest",
        description:
            "Showcase your photography skills by capturing creative moments around the campus.",
        category: "Cultural",
        event_date: "2026-10-12",
        event_time: "14:00",
        venue: "Arts Block",
        capacity: 50,
        registration_deadline: "2026-10-11",
        image: ""
    },

    {
        title: "Startup Pitch Challenge",
        description:
            "Present your startup idea to a panel and demonstrate your entrepreneurial skills.",
        category: "Business",
        event_date: "2026-10-15",
        event_time: "10:30",
        venue: "Innovation Hub",
        capacity: 60,
        registration_deadline: "2026-10-14",
        image: ""
    },

    {
        title: "Web Development Bootcamp",
        description:
            "A hands-on bootcamp covering HTML, CSS, JavaScript, Node.js and modern web development.",
        category: "Technical",
        event_date: "2026-10-18",
        event_time: "09:30",
        venue: "CSE Lab",
        capacity: 100,
        registration_deadline: "2026-10-17",
        image: ""
    },

    {
        title: "Campus Cultural Fest",
        description:
            "A celebration of music, dance, art and cultural performances by students across the campus.",
        category: "Cultural",
        event_date: "2026-10-25",
        event_time: "16:00",
        venue: "College Ground",
        capacity: 500,
        registration_deadline: "2026-10-24",
        image: ""
    },

    {
        title: "Inter-College Cricket Tournament",
        description:
            "An exciting cricket tournament featuring teams from different colleges.",
        category: "Sports",
        event_date: "2026-11-02",
        event_time: "09:00",
        venue: "University Ground",
        capacity: 200,
        registration_deadline: "2026-11-01",
        image: ""
    },

    {
        title: "Tech Innovation Summit",
        description:
            "A technology-focused event featuring talks, project demonstrations and innovative student ideas.",
        category: "Technical",
        event_date: "2026-11-10",
        event_time: "10:00",
        venue: "Main Auditorium",
        capacity: 300,
        registration_deadline: "2026-11-09",
        image: ""
    }

];


// ========================================
// INSERT SAMPLE EVENTS
// ========================================

const insertEvent = db.prepare(`
    INSERT INTO events
    (
        organizer_id,
        title,
        description,
        category,
        event_date,
        event_time,
        venue,
        capacity,
        registration_deadline,
        image
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);


const checkEvent = db.prepare(`
    SELECT id
    FROM events
    WHERE title = ?
`);


for (const event of sampleEvents) {

    const existingEvent = checkEvent.get(event.title);

    if (!existingEvent) {

        insertEvent.run(
            organizer.id,
            event.title,
            event.description,
            event.category,
            event.event_date,
            event.event_time,
            event.venue,
            event.capacity,
            event.registration_deadline,
            event.image
        );

    }

}


console.log("Sample events are ready.");


// ========================================
// EXPORT DATABASE
// ========================================

module.exports = db;