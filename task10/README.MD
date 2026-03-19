# Практическое занятие 10

Фронтенд-часть на `React` для работы с токенами на клиенте. Практика опирается на backend из 9-й практики.

## Что нового

- вынесена логика работы с API на фронтенд
- добавлен React-клиент
- подключен `axios` для запросов
- каталог товаров отображается в React-приложении
- токены хранятся и используются на клиентской стороне

## Запуск

Backend:

```bash
npm install
npm start
```

Сервер: `http://localhost:3000`

Frontend:

```bash
cd client
npm install
npm start
```

Клиент: обычно `http://localhost:3001` или порт CRA по умолчанию

## Маршруты

- `POST /api/auth/register`
- `POST /api/auth/login` (выдаёт `accessToken` и `refreshToken`)
- `POST /api/auth/refresh` (читает refresh-токен из заголовка `x-refresh-token`)
- `GET /api/auth/me` (защищённый)
- `POST /api/products` (защищённый)
- `GET /api/products` (защищённый)
- `GET /api/products/:id` (защищённый)
- `PUT /api/products/:id` (защищённый)
- `DELETE /api/products/:id` (защищённый)
