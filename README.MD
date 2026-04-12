# FRONT1KR

Общий README по практическим работам по курсу «Фронтенд и бэкенд разработка».
Ниже собрана карта практик с 1 по 17 и кратко описано, что было добавлено на каждом этапе.

## Структура репозитория

- `task1` - практика 1
- `task2` - практика 2
- `task3` - практика 3
- `task4-5` - практики 4 и 5 в одной папке
- `task7` - практика 7
- `task8` - практика 8
- `task9` - практика 9
- `task10` - практика 10
- `task11` - практика 11
- `task13` - практика 13
- `task14` - практика 14
- `task15` - практика 15
- `task16` - практика 16
- `task17` - практика 17

Отдельных папок `task6` и `task12` в текущем репозитории нет.

## Карта практик 1-17

| Практика | Папка | Главное нововведение |
| --- | --- | --- |
| 1 | `task1` | Базовая верстка карточки товара на HTML/CSS |
| 2 | `task2` | Express + CRUD для товаров через API |
| 3 | `task3` | REST API для `users` |
| 4 | `task4-5` | Переход на React-клиент |
| 5 | `task4-5` | Swagger-документация и расширение API |
| 6 | - | Отдельной папки в репозитории нет |
| 7 | `task7` | Регистрация/вход, хеширование паролей |
| 8 | `task8` | JWT и защита маршрутов |
| 9 | `task9` | Refresh token и продление сессии |
| 10 | `task10` | React-клиент с хранением токенов |
| 11 | `task11` | Роли пользователей и RBAC |
| 12 | - | Отдельной папки в репозитории нет |
| 13 | `task13` | Service Worker, офлайн-кэш и заметки в `localStorage` |
| 14 | `task14` | PWA Manifest и установка приложения |
| 15 | `task15` | HTTPS + App Shell архитектура |
| 16 | `task16` | Realtime через Socket.IO + уведомления без SW |
| 17 | `task17` | Push-напоминания, snooze на 5 минут, SW actions |

## Кратко по каждой практике

### Практика 1 (`task1`)
- статическая верстка карточки товара
- базовая адаптивность и UI-стили

### Практика 2 (`task2`)
- сервер на `Express`
- CRUD товаров (`POST`, `GET`, `GET by id`, `PATCH`, `DELETE`)
- фронтенд вызывает API через `fetch`

### Практика 3 (`task3`)
- REST API для `users`
- поддержка `GET`, `POST`, `PUT`, `PATCH`, `DELETE`

### Практика 4 (`task4-5`)
- клиентская часть на `React`
- каталог товаров с данными от backend API

### Практика 5 (`task4-5`)
- подключен `Swagger`
- описана документация API (`/api-docs`)

### Практика 6
- в этом репозитории отдельной реализации нет

### Практика 7 (`task7`)
- регистрация и вход
- проверка логина/пароля
- хеширование паролей с солью

### Практика 8 (`task8`)
- аутентификация через JWT
- защищенные маршруты товаров
- проверка `GET /api/auth/me`

### Практика 9 (`task9`)
- `refreshToken`
- обновление `accessToken` без повторного логина

### Практика 10 (`task10`)
- React-клиент с авторизацией
- хранение и использование токенов на фронтенде

### Практика 11 (`task11`)
- роли `user`, `seller`, `admin`
- разграничение прав доступа (RBAC)

### Практика 12
- в этом репозитории отдельной реализации нет

### Практика 13 (`task13`)
- офлайн-заметки с `Service Worker`
- кэш статики и работа без сети

### Практика 14 (`task14`)
- подключен `manifest.json`
- добавлены PWA-иконки и кнопка установки
- кэш обновлен с учетом manifest и icons

### Практика 15 (`task15`)
- запуск по HTTPS
- архитектура App Shell
- роутинг по `/content/home.html` и `/content/about.html`
- стратегии кэширования `Cache First` и `Network First`

### Практика 16 (`task16`)
- realtime-события через `Socket.IO`
- уведомления через `Notification API` (без Service Worker)

### Практика 17 (`task17`)
- push-подписка через `PushManager` + `web-push`
- форма напоминания (`datetime-local`)
- серверное планирование таймеров (`setTimeout`, `Map`)
- кнопка в уведомлении `Отложить на 5 минут` (`notificationclick` + `/snooze`)

## Запуск

Общий шаблон для Node-практик:

```bash
cd /Users/osipuzunan/Desktop/FRONT1KR/taskN
node server.js
```

### Практики с отдельными нюансами

- `task10` (React-клиент):

```bash
cd /Users/osipuzunan/Desktop/FRONT1KR/task10/client
npm install
npm start
```

- `task15` (HTTPS):

```bash
cd /Users/osipuzunan/Desktop/FRONT1KR/task15
node server.js
# открыть https://localhost:3015
```

- `task16` (HTTPS + Socket.IO):

```bash
cd /Users/osipuzunan/Desktop/FRONT1KR/task16
npm install
node server.js
# открыть https://localhost:3016
```

- `task17` (Push reminders):

```bash
cd /Users/osipuzunan/Desktop/FRONT1KR/task17
npm install
node server.js
# открыть http://localhost:3017
```

Если порт занят:

```bash
PORT=3037 node server.js
```

Для `task17` можно принудительно запустить HTTPS-режим:

```bash
PROTOCOL=https PORT=3037 node server.js
```

## Примечание

Внутри папок могут быть свои локальные `README.MD` с деталями конкретной практики,
а этот файл — общий обзор развития проекта от 1 до 17.
