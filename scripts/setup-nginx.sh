#!/bin/bash
# Настройка nginx для ptracker.indexhunt.ru
# Запуск: sudo bash scripts/setup-nginx.sh

set -e

DOMAIN="ptracker.indexhunt.ru"
APP_PORT=3000

echo "=== Настройка nginx для ${DOMAIN} ==="

# Проверяем что nginx установлен
if ! command -v nginx &> /dev/null; then
    echo "Установка nginx..."
    apt update && apt install -y nginx
fi

# Создаём конфиг
cat > /etc/nginx/sites-available/${DOMAIN} << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Максимальный размер загружаемого файла (чеки, карты)
    client_max_body_size 20M;
}
EOF

# Активируем
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/

# Проверяем конфиг
echo ""
echo "=== Проверка конфига nginx ==="
nginx -t

# Перезапускаем
echo ""
echo "=== Перезапуск nginx ==="
systemctl restart nginx

echo ""
echo "=== Готово! ==="
echo "Теперь ${DOMAIN} должен указывать на порт ${APP_PORT}"
echo ""
echo "Если нужен HTTPS, запусти:"
echo "  sudo certbot --nginx -d ${DOMAIN}"
