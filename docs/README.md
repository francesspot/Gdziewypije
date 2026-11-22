# Dokumentacja

Dokumentacja projektu jest wiążąca dla kodu.

- `Etap1_Gdziewypije.pdf` – raport etapu 1: zakres, wymagania WB, historyjki HU
- `Etap2_Gdziewypije.pdf` – raport etapu 2: ERD, transakcje T, zapytania Q, wymagania WF/WNF, przypadki użycia PU

## Backend (etap 3)

Uruchomienie bazy i backendu, lista ścieżek API i przykładowe wywołania: [`backend/README.md`](../backend/README.md). Skrypty bazy: [`db/README.md`](../db/README.md). Po uruchomieniu backendu opis każdej ścieżki jest w Swaggerze: http://127.0.0.1:8000/docs.

Transakcje i zapytania z raportu etapu 2 w kodzie:

| Raport | Baza | Ścieżka API |
|---|---|---|
| T1 rejestracja: konto i profil (PU.01) | funkcja `register_user` | `POST /auth/register` |
| T2 zgłoszenie ceny i 5 punktów (PU.02) | funkcja `report_price` | `POST /bars/{bar_id}/prices` |
| T3 potwierdzenie ceny i 1 punkt (PU.03) | funkcja `confirm_price` | `POST /prices/{price_id}/confirmations` |
| T4 dodanie lub zmiana oceny (PU.04) | `INSERT ... ON CONFLICT DO UPDATE` w `ratings` | `PUT /bars/{bar_id}/rating` |
| T5 dodanie i usunięcie ulubionego | `INSERT` i `DELETE` w `favorites` | `POST` i `DELETE /bars/{bar_id}/favorite` |
| Q1 bary w pobliżu | `ST_DWithin` i `ST_Distance` z widokiem `v_bar_stats` | `GET /nearby` |
| Q2 ranking według oceny ważonej | `RANK()` na widoku `v_bar_stats` | `GET /ranking` |
| Q3 top 3 miesiąca | widok `v_top_month` | `GET /top-month` |
