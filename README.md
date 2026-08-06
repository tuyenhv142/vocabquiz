# VocabQuiz - Full-Stack Vocabulary & Quizlet Clone Application

VocabQuiz is a full-stack web application designed for creating, reviewing, practicing, and managing vocabulary flashcards with automated translations and intelligent practice modes.

## Tech Stack

- **Frontend**: React, Vite, Lucide Icons, Vanilla CSS Design System
- **Backend**: Node.js, Express.js, PostgreSQL (`pg`), CORS, JWT Authentication, bcryptjs
- **APIs**: Google Translate API (`client=gtx`), Free Dictionary API (`dictionaryapi.dev`), Datamuse API

## Project Structure

```
vocal/
├── vocabulary-backend/     # Node.js + Express API server
│   ├── db.js               # PostgreSQL pool connection
│   ├── server.js           # REST API endpoints & Auth routes
│   └── schema.sql          # Full PostgreSQL database schema dump
├── vocabulary-frontend/    # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   │   ├── PracticePage.jsx     # Multiple-choice practice mode
│   │   │   ├── SetReviewPage.jsx    # Card edit & auto-translate review
│   │   │   ├── FlashcardPage.jsx    # Flashcard viewer interface
│   │   │   └── ...
│   │   └── App.jsx                  # Main dashboard & set management
└── README.md
```

## Features

- **Automated Translations**: Instant English-to-Vietnamese word definitions powered by Google Translate API.
- **Grammatically Correct Examples**: Context-aware example sentences for nouns, verbs, adjectives, and adverbs.
- **Multiple-Choice Practice**: Interactive quiz mode with live feedback badges (`Correct ✓` / `Wrong ✗`) and natural distractor choices.
- **Targeted Practice**: Completion summary with percentage scores, performance recommendations, and a dedicated *"Practice Wrong Questions"* mode.
- **Database Persistence**: Automatic storage of best practice scores (`practice_percentage`) and timestamp logging in PostgreSQL.

## Getting Started

### 1. Database Setup (PostgreSQL)
Create the database and import the provided schema:
```bash
createdb -U postgres vocabulary_app
psql -U postgres -d vocabulary_app -f vocabulary-backend/schema.sql
```

### 2. Backend Setup
```bash
cd vocabulary-backend
npm install
npm start
```
*Environment variables in `.env`:*
```env
PORT=5000
DB_USER=postgres
DB_PASSWORD=1420
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vocabulary_app
JWT_SECRET=your_super_secret_jwt_key_here_12345
```

### 3. Frontend Setup
```bash
cd vocabulary-frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
