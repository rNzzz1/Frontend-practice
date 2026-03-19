# Практическое занятие 11

Управление доступом на основе ролей: `user`, `seller`, `admin`.

## Запуск

```bash
npm install
npm start
```

Сервер: `http://localhost:3000`

## Роли

- `user` - просмотр каталога
- `seller` - просмотр каталога, создание и изменение товаров
- `admin` - все права продавца + удаление товаров и admin-маршрут

## Маршруты

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (`seller`, `admin`)
- `PUT /api/products/:id` (`seller`, `admin`)
- `DELETE /api/products/:id` (`admin`)
- `GET /api/products/role` и `GET /api/product/role` (`seller`, `admin`)
- `GET /api/products/admin/role` и `GET /api/product/admin/role` (`admin`)
