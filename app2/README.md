# T-Holdem Tournament Management Platform

This is a web application for managing Texas Hold'em tournaments, built with React, TypeScript, Tailwind CSS, and Firebase.

## Features

-   **Admin-only access**: Secure login for tournament staff.
-   **Participant Management**: Register, update, and track players.
-   **Table and Seat Management**: Automated table and seat assignments.
-   **Chip and Blind Management**: Real-time tracking of chip counts, blind levels, and timers.
-   **Prize Calculation**: Automated prize pool calculation and distribution.
-   **Tournament History**: View past tournament results and statistics.
-   **Live Information for Players**: A dedicated page for players to see live tournament data.
-   **Staff Management**: Manage staff roles and permissions.

## Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS
-   **Backend & DB**: Firebase (Authentication, Firestore)
-   **Deployment**: Firebase Hosting (or Vercel, etc.)

## Getting Started

### Prerequisites

-   Node.js and npm
-   A Firebase project

### Installation

1.  Clone the repository.
2.  Install dependencies:
    `npm install`
3.  Set up your Firebase configuration in `src/firebase.ts`.
4.  Start the development server:
    `npm start`

## Available Scripts

### `npm start`

Runs the app in development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm run build`

Builds the app for production to the `build` folder.
This creates an optimized build ready for deployment.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
