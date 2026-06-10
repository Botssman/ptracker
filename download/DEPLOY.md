# 🚀 Деплой Purchase Tracker на свой сервер (VPS)

## Что у вас должно быть
- VPS с Ubuntu 20.04+ (или аналогичный Linux)
- Доступ по SSH
- Домен (опционально, можно и по IP)

---

## Шаг 1: Подготовка сервера

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Устанавливаем Bun (быстрее npm)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Проверяем
node -v   # v20+
bun -v    # 1+

# Устанавливаем Nginx (反向代理)
sudo apt install -y nginx
```

---

## Шаг 2: Загрузка проекта

```bash
# Создаём папку проекта
sudo mkdir -p /var/www/purchase-tracker
sudo chown $USER:$USER /var/www/purchase-tracker

# Копируем архив на сервер (с вашего компьютера)
scp purchase-tracker-full.tar.gz user@YOUR_SERVER_IP:/var/www/purchase-tracker/

# На сервере — распаковываем
cd /var/www/purchase-tracker
tar xzf purchase-tracker-full.tar.gz
rm purchase-tracker-full.tar.gz
```

---

## Шаг 3: Установка зависимостей и сборка

```bash
cd /var/www/purchase-tracker

# Устанавливаем зависимости
bun install

# Создаём .env файл (если не скопировался)
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://YOUR_SERVER_IP:3000"
EOF

# Важно: сгенерируйте реальный секрет!
# Замените NEXTAUTH_SECRET на случайную строку:
sed -i "s/\$(openssl rand -base64 32)/$(openssl rand -base64 32)/" .env
# И замените YOUR_SERVER_IP на ваш IP или домен:
# nano .env  # отредактируйте NEXTAUTH_URL

# Создаём БД и заполняем тестовыми данными
bun run db:push
bun prisma db seed

# Создаём папку для загрузок
mkdir -p public/uploads/receipts public/uploads/cards

# Сборка проекта
bun run build
```

---

## Шаг 4: Запуск через systemd (автозапуск)

```bash
# Создаём сервис
sudo cat > /etc/systemd/system/purchase-tracker.service << EOF
[Unit]
Description=Purchase Tracker Next.js App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/purchase-tracker
ExecStart=/root/.bun/bin/bun .next/standalone/server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Права доступа
sudo chown -R www-data:www-data /var/www/purchase-tracker

# Запускаем
sudo systemctl daemon-reload
sudo systemctl enable purchase-tracker
sudo systemctl start purchase-tracker

# Проверяем статус
sudo systemctl status purchase-tracker
```

---

## Шаг 5: Настройка Nginx (обратный прокси)

```bash
sudo cat > /etc/nginx/sites-available/purchase-tracker << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Максимальный размер загружаемого файла (чеки)
    client_max_body_size 20M;
}
EOF

# Активируем
sudo ln -sf /etc/nginx/sites-available/purchase-tracker /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Проверяем конфиг
sudo nginx -t

# Перезапускаем
sudo systemctl restart nginx
```

---

## Шаг 6: HTTPS (опционально, но рекомендуется)

```bash
# Устанавливаем Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получаем сертификат (нужен домен, не голый IP)
sudo certbot --nginx -d yourdomain.ru

# Автопродление уже настроено, проверяем:
sudo certbot renew --dry-run
```

---

## Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| admin@example.com | password123 | Админ |
| maria@example.com | password123 | Модератор |
| alex@example.com | password123 | Пользователь |

**⚠️ Обязательно смените пароли после первого входа!**

---

## Полезные команды

```bash
# Перезапуск приложения
sudo systemctl restart purchase-tracker

# Логи приложения
sudo journalctl -u purchase-tracker -f

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Обновление проекта (после git pull)
cd /var/www/purchase-tracker
bun install
bun run build
sudo systemctl restart purchase-tracker
```

---

## Если нужен PostgreSQL вместо SQLite

1. Установите PostgreSQL:
```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createuser purchase_tracker
sudo -u postgres createdb purchase_tracker
sudo -u postgres psql -c "ALTER USER purchase_tracker WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE purchase_tracker TO purchase_tracker;"
```

2. Обновите `.env`:
```
DATABASE_URL="postgresql://purchase_tracker:your_password@localhost:5432/purchase_tracker"
```

3. В `prisma/schema.prisma` замените:
```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

4. Примените схему:
```bash
bun run db:push
bun prisma db seed
```

---

## Структура проекта

```
purchase-tracker/
├── prisma/
│   ├── schema.prisma      # Схема БД
│   ├── seed.ts            # Тестовые данные
│   └── dev.db             # SQLite база (автосоздание)
├── src/
│   ├── app/
│   │   ├── api/           # 17 API эндпоинтов
│   │   ├── page.tsx       # Главная страница (SPA-роутер)
│   │   ├── layout.tsx     # Корневой layout
│   │   └── globals.css    # Тема (зелёно-оранжевая палитра)
│   ├── components/
│   │   ├── layout/        # Хедер, обёртка
│   │   ├── pages/         # 12 страниц
│   │   ├── shared/        # EmptyState, Loading, Validation
│   │   └── ui/            # shadcn/ui компоненты
│   └── lib/
│       ├── auth.ts        # NextAuth конфигурация
│       ├── auth-context.tsx  # React-контекст авторизации
│       ├── api.ts         # API-клиент
│       ├── mock-data.ts   # (больше не используется, можно удалить)
│       └── db.ts          # Prisma клиент
├── public/
│   └── uploads/           # Загруженные файлы (чеки, карты)
├── .env                   # Переменные окружения
├── package.json
└── next.config.ts
```
