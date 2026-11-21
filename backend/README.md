# Backend

Aplikacja FastAPI (Python). Kod w `src/`, testy w `tests/`, konfiguracja w `.env` (wzór w `.env.example`).

- `src/api/` – ścieżki API, po jednym module na obszar (konta, bary, ceny, oceny, ulubione, top 3, admin)
- `src/schemas/` – modele danych żądań i odpowiedzi (Pydantic)
- `src/db/` – połączenie z bazą, jedna transakcja na żądanie
- `src/import_bars.py` – import barów z OpenStreetMap (Overpass API)

## Wymagania

- Python 3.11 lub nowszy
- Docker Desktop (baza PostgreSQL + PostGIS z `docker-compose.yml` w katalogu głównym)
- Dostęp do internetu przy imporcie barów

## Uruchomienie od zera

Komendy dla Windows (`cmd`). Na Linuksie i macOS: `cp` zamiast `copy` oraz `source .venv/bin/activate`.

### 1. Baza danych

W katalogu głównym repozytorium:

```
copy .env.example .env
docker compose up -d
docker compose exec db psql -U gdziewypije -d gdziewypije -v ON_ERROR_STOP=1 -f /db/01_schema.sql
docker compose exec db psql -U gdziewypije -d gdziewypije -v ON_ERROR_STOP=1 -f /db/02_seed.sql
docker compose exec db psql -U gdziewypije -d gdziewypije -v ON_ERROR_STOP=1 -f /db/03_testdata.sql
```

Ostatnia komenda (dane testowe) jest opcjonalna. Jeśli `psql` zaraz po `up -d` zgłosi błąd połączenia, baza jeszcze startuje – wystarczy odczekać kilka sekund. Reset i szczegóły skryptów: [`db/README.md`](../db/README.md).

### 2. Backend

W katalogu `backend/`:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
copy .env.example .env
```

W `backend/.env` trzeba ustawić:

- `DB_PASSWORD` – to samo hasło co w `.env` w katalogu głównym (z niego Docker tworzy bazę),
- `JWT_SECRET` – długi losowy tekst, np. z `python -c "import secrets; print(secrets.token_hex(32))"`.

Uruchomienie serwera:

```
uvicorn src.main:app --reload
```

### 3. Import barów z OpenStreetMap (opcjonalnie)

W katalogu `backend/`, z aktywnym środowiskiem:

```
python -m src.import_bars
```

Pobiera bary i puby z Wrocławia (około 150) i wypisuje liczbę nowych, zaktualizowanych i wyłączonych barów. Ponowne uruchomienie aktualizuje dane z OSM i wyłącza bary, których w OSM już nie ma. Bary dodane ręcznie i z danych testowych zostają bez zmian.

### 4. Sprawdzenie

- http://127.0.0.1:8000/health zwraca `{"status": "ok"}` (503, gdy backend nie łączy się z bazą),
- http://127.0.0.1:8000/docs pokazuje Swaggera z opisem i przykładem każdej ścieżki.

## Konto administratora

Rejestracja zawsze tworzy zwykłe konto. Administratora ustawia się w bazie, po rejestracji przez API:

```
docker compose exec db psql -U gdziewypije -d gdziewypije -c "UPDATE users SET role = 'admin' WHERE email = 'jan@test.pl'"
```

Konta z danych testowych mają tylko zastępczy hash hasła, więc nie da się na nie zalogować.

## Ścieżki API

| Metoda i ścieżka | Opis | Dostęp |
|---|---|---|
| `GET /health` | stan backendu i bazy | wszyscy |
| `POST /auth/register` | rejestracja, zwraca token | wszyscy |
| `POST /auth/login` | logowanie, zwraca token | wszyscy |
| `GET /auth/me` | dane zalogowanego użytkownika | zalogowany |
| `GET /bars?q=` | lista barów z wyszukiwarką | wszyscy |
| `GET /bars/{bar_id}` | szczegóły baru | wszyscy |
| `GET /nearby?lat=&lon=&radius_m=` | bary w pobliżu | wszyscy |
| `GET /ranking` | ranking według oceny ważonej | wszyscy |
| `GET /top-month` | top 3 miesiąca | wszyscy |
| `GET /bars/{bar_id}/prices` | aktualne ceny baru | wszyscy |
| `POST /bars/{bar_id}/prices` | zgłoszenie ceny | zalogowany |
| `POST /prices/{price_id}/confirmations` | potwierdzenie ceny | zalogowany |
| `PUT /bars/{bar_id}/rating` | ocena baru | zalogowany |
| `POST /bars/{bar_id}/favorite` | dodanie do ulubionych | zalogowany |
| `DELETE /bars/{bar_id}/favorite` | usunięcie z ulubionych | zalogowany |
| `GET /favorites` | lista ulubionych | zalogowany |
| `POST /admin/bars`, `PUT/PATCH /admin/bars/{bar_id}` | dodanie, edycja, wyłączenie baru | administrator |
| `POST /admin/drinks`, `PUT/PATCH /admin/drinks/{drink_id}` | dodanie, edycja, wyłączenie napoju | administrator |

Zalogowany użytkownik wysyła nagłówek `Authorization: Bearer <token>`. Błędy mają komunikat po polsku w polu `detail`: 401 brak tokenu, 403 brak uprawnień, 404 brak zasobu, 409 duplikat, 422 błędne dane (lista pól).

## Przykładowe wywołania

Najprościej w Swaggerze (`/docs`): **Try it out** przy ścieżce, a token z rejestracji lub logowania wpisuje się przyciskiem **Authorize**.

Z wiersza poleceń przez `curl`, w Git Bash (w PowerShell `curl` to inna komenda). Przykłady zakładają dane testowe, więc bar o id 1 istnieje:

```bash
# Rejestracja; odpowiedź zawiera access_token
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "jan@test.pl", "password": "haslo1234", "display_name": "Jan"}'

# Logowanie tym samym kontem
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "jan@test.pl", "password": "haslo1234"}'

# Token z odpowiedzi
TOKEN=wklej_access_token

# Wyszukiwanie barów po fragmencie nazwy
curl "http://127.0.0.1:8000/bars?q=kufel"

# Bary w promieniu 1 km od Rynku
curl "http://127.0.0.1:8000/nearby?lat=51.11&lon=17.032&radius_m=1000"

# Zgłoszenie ceny napoju 1 w barze 1 (5 punktów dla autora)
curl -X POST http://127.0.0.1:8000/bars/1/prices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"drink_id": 1, "amount": 12.5}'

# Ocena baru 1
curl -X PUT http://127.0.0.1:8000/bars/1/rating \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": 4}'

# Dodanie baru 1 do ulubionych i lista ulubionych
curl -X POST http://127.0.0.1:8000/bars/1/favorite -H "Authorization: Bearer $TOKEN"
curl http://127.0.0.1:8000/favorites -H "Authorization: Bearer $TOKEN"
```

## Testy

W katalogu `backend/`, z aktywnym środowiskiem:

```
pytest
```

Większość testów wymaga działającej bazy z wgranym `01_schema.sql`. Testy same dodają potrzebne bary, napoje i konta, a po sobie je usuwają, więc dane testowe z `03_testdata.sql` nie są potrzebne. Bez bazy przechodzą tylko testy, które się z nią nie łączą (np. parsowanie odpowiedzi Overpass).

## Typowe problemy

- `password authentication failed` – inne `DB_PASSWORD` w `backend/.env` niż w `.env` w katalogu głównym. Jeśli baza powstała ze starym hasłem, pomaga reset: `docker compose down -v` i ponownie krok 1.
- `/health` zwraca 503 – kontener bazy nie działa (`docker compose up -d`) albo Docker Desktop jest wyłączony.
- `port is already allocated` przy `docker compose up -d` – port 5432 zajmuje lokalny PostgreSQL; trzeba go zatrzymać albo zmienić `DB_PORT` w obu plikach `.env`.
- `There was an error parsing the body` przy `curl` z polskimi znakami w `-d` (np. `Wrocław`) – Git Bash na Windows wysyła je w innym kodowaniu niż UTF-8; takie żądania lepiej wysłać ze Swaggera.
