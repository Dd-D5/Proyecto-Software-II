#!/bin/bash
# Backup semanal de configuraciones (cron: domingos 03:00)
rsync -az /etc/nginx/ /backup/nginx/ --password-file=/home/developer/.backuppw
tar czf /backup/webapp_$(date +%F).tar.gz /var/www/webapp/
echo "Backup completado: $(date)" >> /var/log/backup.log
