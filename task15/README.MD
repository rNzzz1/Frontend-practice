# Практическое занятие 15

Продолжение 14-й практики: приложение заметок переведено на `HTTPS` и архитектуру `App Shell`.

## Что реализовано

- запуск приложения по `https://localhost:<PORT>`
- локальные сертификаты в `task15/certs`
- каркас приложения (shell): `index.html + styles.css + app.js`
- динамические страницы:
  - `/content/home.html`
  - `/content/about.html`
- навигация между страницами внутри shell
- заметки в `localStorage`
- `Service Worker` со стратегиями:
  - `Cache First` для App Shell
  - `Network First` для динамических страниц в `/content/*`
- офлайн-фолбэк:
  - `offline.html` для навигации
  - `/content/offline.html` для динамического контента

## Структура

- `server.js` - HTTPS сервер
- `certs/localhost-cert.pem` - локальный сертификат
- `certs/localhost-key.pem` - приватный ключ
- `public/index.html` - App Shell каркас
- `public/content/home.html` - динамическая главная
- `public/content/about.html` - динамическая страница "О нас"
- `public/app.js` - роутинг, загрузка контента и заметки
- `public/sw.js` - кэширование shell и dynamic контента
- `public/manifest.json` - манифест PWA
- `smoke-test.js` - быстрая проверка

## Запуск

```bash
cd /Users/osipuzunan/Desktop/FRONT1KR/task15
node server.js
```

Открыть:

```text
https://localhost:3015
```

Если порт занят:

```bash
PORT=3025 node server.js
```

## Как показать преподавателю

1. Открыть приложение по `HTTPS` и показать значок защищенного соединения.
2. В `DevTools -> Application -> Service Workers` показать активный SW.
3. В `Cache Storage` показать кэш `task15-app-shell-v1` и `task15-dynamic-v1`.
4. Открыть `Главная`, затем `О нас`.
5. В `Network` включить `Slow 3G` и обновить:
   - shell появляется сразу
   - контент подгружается отдельно
6. Отключить сеть и обновить:
   - shell и страница доступны из кэша
   - заметки остаются из `localStorage`

## Доверенный сертификат (опционально)

Чтобы получить "полностью доверенный" сертификат без предупреждений, можно использовать `mkcert`.

### macOS (через Homebrew)

```bash
brew install mkcert
mkcert -install
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost-cert.pem localhost 127.0.0.1 ::1
```

После этого перезапусти сервер.
