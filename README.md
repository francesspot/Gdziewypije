# 🍺 Gdziewypije

Aplikacja webowa do szukania barów we Wrocławiu: mapa z cenami i ocenami, ranking, top 3 miesiąca i ulubione miejsca. Projekt zespołowy z przedmiotu **Bazy Danych** (Politechnika Wrocławska, rok akademicki 2026/2027).

[English version](README.en.md)

## 🎯 Pomysł

Ceny drinków trudno znaleźć: menu są często tylko zdjęciami albo są nieaktualne, a serwisy z opiniami nie pozwalają porównać cen. Gdziewypije pokazuje lokalizację, ocenę i cenę w jednym miejscu. Bary pochodzą z OpenStreetMap, a oceny i ceny dodają użytkownicy.

## ✨ Funkcje

- Mapa z barami i przełącznikiem **cena / ocena**
- Lista z rankingiem (ocena ważona liczbą głosów) i wyszukiwarką
- Top 3 barów bieżącego miesiąca
- Ulubione bary
- Bary w pobliżu (według lokalizacji użytkownika)
- Konta użytkowników: ocenianie barów, zgłaszanie i potwierdzanie cen
- Cena, której nikt nie potwierdził przez 90 dni, dostaje oznaczenie „do weryfikacji”
- Przeglądanie jest dostępne bez konta, konto jest potrzebne tylko do dodawania treści
- Panel administratora do zarządzania barami i napojami

## 🧰 Technologie

| Obszar | Technologia |
|---|---|
| Baza danych | PostgreSQL z PostGIS |
| Backend | Python, FastAPI |
| Frontend | React, Leaflet |
| Dane zewnętrzne | Overpass API (OpenStreetMap) |
| Narzędzia | Git, GitHub, Docker |

## 🗄️ Model danych

Baza ma 8 tabel: `users`, `user_profiles`, `bars`, `drinks`, `prices`, `price_confirmations`, `ratings`, `favorites`. Zawiera relacje 1:1, 1:n i n:n, jest w 3NF i ma pola audytowe (`created_at`, `updated_at`, `is_active`). Zawiera też widoki (statystyki barów, aktualne ceny, top miesiąca), funkcje do zgłaszania i potwierdzania cen oraz zaplanowane transakcje i zapytania zaawansowane (PostGIS, JOIN, GROUP BY, HAVING, funkcje okna). Pełny diagram ERD jest w raporcie etapu 2 w katalogu `docs`.

## 📅 Status projektu

| Etap | Zakres | Termin | Stan |
|---|---|---|---|
| 1 | Temat, zakres, analiza biznesowa | 20.10.2026 | gotowe |
| 2 | Projekt: technologie, baza, diagramy | 03.11.2026 | gotowe |
| 3 | Implementacja bazy i backendu | 15.12.2026 | w przygotowaniu |
| 4 | Frontend i testy | 12.01.2027 | zaplanowane |

## 📁 Struktura repozytorium

```
backend/   aplikacja FastAPI
frontend/  aplikacja React
db/        skrypty SQL (schemat, dane początkowe, dane testowe)
docs/      dokumentacja etapów projektu
```

Szczegóły w README poszczególnych katalogów.

## 🚀 Uruchomienie

Instrukcja zostanie uzupełniona po zakończeniu szkieletu backendu i frontendu.

## 📚 Dokumentacja

- `docs` – raporty z etapów 1 i 2 (zakres, wymagania, historyjki użytkownika, ERD, transakcje, zapytania, diagramy BPMN i UML)

## 👥 Autorzy

- Franciszek Pora
- Jakub Konieczko

## 🗺️ Dane

Dane o barach pochodzą z OpenStreetMap © współtwórcy OpenStreetMap (licencja ODbL). Ceny i oceny dodają użytkownicy aplikacji.
