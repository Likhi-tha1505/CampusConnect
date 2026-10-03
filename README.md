# CampusConnect

CampusConnect is a web-based college event and activity management platform designed to help students discover, register for, and manage campus events.

The platform also provides organizers with tools to create and manage events, while students receive notifications about their registrations and event activities.

## Features

### Student Features

- Student signup and login
- Browse upcoming college events
- Search events
- Filter events by category
- View detailed event information
- Register for events
- Join a waitlist when an event reaches capacity
- Cancel event registration
- View registered events in My Events
- Receive event notifications
- Secure logout and session handling

### Organizer Features

- Organizer signup and login
- Create new events
- Edit existing events
- Delete events
- Manage event capacity
- Set registration deadlines
- View event registration information
- Receive organizer-related event information

## Technology Stack

### Frontend

- HTML
- CSS
- JavaScript
- EJS

### Backend

- Node.js
- Express.js

### Database

- SQLite
- Better-SQLite3

### Authentication

- Express Session
- bcryptjs

## Project Structure

```text
CampusConnect/
│
├── db/
│   └── database.js
│
├── public/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
│
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   │
│   ├── 404.ejs
│   ├── create-event.ejs
│   ├── dashboard.ejs
│   ├── edit-event.ejs
│   ├── event-details.ejs
│   ├── events.ejs
│   ├── index.ejs
│   ├── login.ejs
│   ├── my-events.ejs
│   ├── notifications.ejs
│   └── signup.ejs
│
├── middleware.js
├── server.js
├── package.json

```

Installation
1. Clone the repository
git clone https://github.com/Likhi-tha1505/CampusConnect.git
2. Open the project folder
cd CampusConnect
3. Install dependencies
npm install
4. Start the application
node server.js

The application will start on:

http://localhost:3000

Open the URL in your browser to use CampusConnect.

User Roles
Student

Students can:

Explore events
Register for events
Cancel registrations
View their registered events
Receive notifications
Organizer

Organizers can:

Create events
Edit events
Delete events
Manage event capacity
View event-related information
Event Registration

CampusConnect supports event capacity management.

When an event has available seats, a student can register normally.

If the event reaches its maximum capacity, additional students can be placed on a waitlist.

Notifications

The system generates notifications for important event activities such as:

Event registration
Waitlist registration
Registration cancellation
Other event-related updates
Database

CampusConnect uses SQLite with Better-SQLite3 for data storage.

The database manages information related to:

Users
Events
Registrations
Notifications

The local SQLite database file is excluded from Git using .gitignore.

Security

The application includes:

Password hashing using bcryptjs
Session-based authentication
Student and organizer role protection
Protected routes
Logout and session destruction
Cache prevention for authenticated pages
Future Enhancements

Possible future improvements include:

Email notifications
Event reminders
Event image uploads
Calendar integration
QR-code based event attendance
Organizer analytics
Admin dashboard
Online event support
Project Purpose

CampusConnect was developed as a college project to demonstrate the design and development of a full-stack web application for managing college events and activities.

Author

Likhi-tha1505

GitHub: https://github.com/Likhi-tha1505/CampusConnect

