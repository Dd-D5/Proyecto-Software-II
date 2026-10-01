sudo systemctl restart webapp
ssh admin_db@10.0.2.15
cat /var/log/auth.log | grep Failed
python3 -m http.server 8000
git pull origin main
mysql -u admin_db -p
crontab -e
sudo ufw allow 8080
