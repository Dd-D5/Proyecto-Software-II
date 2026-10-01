FROM ubuntu:22.04
RUN apt-get update && apt-get install -y python3 python3-pip nginx
COPY . /var/www/webapp
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
