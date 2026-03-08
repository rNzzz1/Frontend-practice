# Практическое занятие 8

Доработка практики 7: JWT, `GET /api/auth/me` и защита маршрутов товаров.

## Запуск

```bash
npm install
npm start
```

Сервер: `http://localhost:3000`

## Маршруты

- `POST /api/auth/register`
- `POST /api/auth/login` (выдаёт JWT)
- `GET /api/auth/me` (защищённый)
- `POST /api/products` (защищённый)
- `GET /api/products` (защищённый)
- `GET /api/products/:id` (защищённый)
- `PUT /api/products/:id` (защищённый)
- `DELETE /api/products/:id` (защищённый)
