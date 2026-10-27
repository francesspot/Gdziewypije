# 🍺 Gdziewypije

A web app for finding bars in Wrocław: a map with prices and ratings, a ranking, the top 3 of the month and favourite places. A team project for the **Databases** course (Wrocław University of Science and Technology, academic year 2026/2027).

[Wersja polska](README.md)

## 🎯 Idea

Drink prices are hard to find: menus are often just photos or out of date, and review sites do not let you compare prices. Gdziewypije shows the location, rating and price in one place. Bars come from OpenStreetMap, while ratings and prices are added by users.

## ✨ Features

- Map of bars with a **price / rating** toggle
- List with a ranking (rating weighted by the number of votes) and search
- Top 3 bars of the current month
- Favourite bars
- Nearby bars (based on the user's location)
- User accounts: rating bars, reporting and confirming prices
- A price nobody has confirmed for 90 days is marked "needs verification"
- Browsing works without an account; an account is needed only to add content
- Admin panel for managing bars and drinks

## 🧰 Tech stack

| Area | Technology |
|---|---|
| Database | PostgreSQL with PostGIS |
| Backend | Python, FastAPI |
| Frontend | React, Leaflet |
| External data | Overpass API (OpenStreetMap) |
| Tools | Git, GitHub, Docker |

## 🗄️ Data model

The database has 8 tables: `users`, `user_profiles`, `bars`, `drinks`, `prices`, `price_confirmations`, `ratings`, `favorites`. It includes 1:1, 1:n and n:n relations, is in 3NF and has audit fields (`created_at`, `updated_at`, `is_active`). It also has views (bar statistics, current prices, top of the month), functions for reporting and confirming prices, and planned transactions and advanced queries (PostGIS, JOIN, GROUP BY, HAVING, window functions). The full ERD is in the stage 2 report in the `docs` directory.

## 📅 Project status

| Stage | Scope | Deadline | Status |
|---|---|---|---|
| 1 | Topic, scope, business analysis | 20.10.2026 | done |
| 2 | Design: technologies, database, diagrams | 03.11.2026 | done |
| 3 | Database and backend implementation | 15.12.2026 | in preparation |
| 4 | Frontend and tests | 12.01.2027 | planned |

## 📁 Repository structure

```
backend/   FastAPI application
frontend/  React application
db/        SQL scripts (schema, seed data, test data)
docs/      project stage documentation
```

See the README in each directory for details.

## 🚀 Getting started

Instructions will be added once the backend and frontend skeletons are ready.

## 📚 Documentation

- `docs` – reports for stages 1 and 2 (scope, requirements, user stories, ERD, transactions, queries, BPMN and UML diagrams). The reports are written in Polish.

## 👥 Authors

- Franciszek Pora
- Jakub Konieczko

## 🗺️ Data

Bar data comes from OpenStreetMap © OpenStreetMap contributors (ODbL licence). Prices and ratings are added by the app's users.
