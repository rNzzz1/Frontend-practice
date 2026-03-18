# Практическое занятие 9

Доработка практики 8: `refreshToken`, ротация refresh-токенов и маршрут обновления токенов.

## Запуск

```bash
npm install
npm start
```

Сервер: `http://localhost:3000`

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
