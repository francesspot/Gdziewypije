🇵🇱 [Polski](README.md) | 🇬🇧 **English**

# 🍺 Gdziewypije

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white) ![PostGIS](https://img.shields.io/badge/PostGIS-336791) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB) ![Leaflet](https://img.shields.io/badge/Leaflet-199900?logo=leaflet&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

> 🎓 Team project for the **Databases** course (Wrocław University of Science and Technology, academic year 2026/2027)

A web app for finding bars in Wrocław that brings together **location, rating and drink prices** in one place. Prices are hard to compare today, since menus are often just photos or out of date. Bars come from **OpenStreetMap**, and ratings and prices are added by users. The project is in progress: the design stages are done, and the database and backend are now being implemented.

## 🙋 My contribution

- **Analysis and design**: scope, requirements, user stories, **ERD**, **BPMN** and **UML** diagrams
- **PostgreSQL + PostGIS database**: 8 tables in **3NF** with audit fields, **views** (bar statistics, current prices, top of the month), **functions** for submitting and confirming prices, transactions and advanced queries (spatial queries, window functions, HAVING)
- **FastAPI backend**: API for the map, ranking and user accounts

## ✨ App features

- **Map** of bars (Leaflet) with a price / rating toggle, plus bars **near** the user
- **Ranking** based on a rating weighted by vote count, with search, **top 3 of the month** and **favorites**
- **Price submission and confirmation**: a price nobody has confirmed for 90 days gets a "needs verification" label
- Browsing without an account (an account is only needed to add content), plus an **admin panel**

## 👥 Team

**Franciszek Pora** · Jakub Konieczko

## 🚀 Getting started

Setup instructions will be added once the backend and frontend skeleton is running in Docker.

---

Bar data: © OpenStreetMap contributors (ODbL license).
