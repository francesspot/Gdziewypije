🇵🇱 **Polski** | 🇬🇧 [English](README.en.md)

# 🍺 Gdziewypije

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white) ![PostGIS](https://img.shields.io/badge/PostGIS-336791) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB) ![Leaflet](https://img.shields.io/badge/Leaflet-199900?logo=leaflet&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

> 🎓 Projekt zespołowy z przedmiotu **Bazy Danych** (Politechnika Wrocławska, rok akademicki 2026/2027)

Aplikacja webowa do szukania barów we Wrocławiu, która zbiera w jednym miejscu **lokalizację, ocenę i cenę** drinków. Ceny trudno dziś porównać, bo menu często są tylko zdjęciami albo są nieaktualne. Bary pochodzą z **OpenStreetMap**, a oceny i ceny dodają użytkownicy. Projekt jest w trakcie realizacji: etapy projektowe są gotowe, a teraz trwa implementacja bazy i backendu.

## 🙋 Mój wkład

- **Analiza i projekt**: zakres, wymagania, historyjki użytkownika, diagramy **ERD**, **BPMN** i **UML**
- **Baza danych w PostgreSQL + PostGIS**: 8 tabel w **3NF** z polami audytowymi, **widoki** (statystyki barów, aktualne ceny, top miesiąca), **funkcje** do zgłaszania i potwierdzania cen, transakcje i zapytania zaawansowane (zapytania przestrzenne, funkcje okna, HAVING)
- **Backend w FastAPI**: API dla mapy, rankingu i kont użytkowników

## ✨ Funkcje aplikacji

- **Mapa** barów (Leaflet) z przełącznikiem cena / ocena oraz bary **w pobliżu** użytkownika
- **Ranking** oparty na ocenie ważonej liczbą głosów, z wyszukiwarką, **top 3 miesiąca** i **ulubione**
- **Zgłaszanie i potwierdzanie cen**: cena, której nikt nie potwierdził przez 90 dni, dostaje oznaczenie „do weryfikacji”
- Przeglądanie bez konta, konto potrzebne tylko do dodawania treści, oraz **panel administratora**

## 👥 Zespół

**Franciszek Pora** · Jakub Konieczko

## 🚀 Uruchomienie

Instrukcja pojawi się po złożeniu szkieletu backendu i frontendu w Dockerze.

---

Dane o barach: © współtwórcy OpenStreetMap (licencja ODbL).
