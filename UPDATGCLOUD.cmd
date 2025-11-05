
docker build -t gcr.io/strapi-website-454221/strapi-dorfbuehne:latest . 
docker buildx build -t gcr.io/strapi-website-454221/strapi-dorfbuehne:latest .
docker push gcr.io/strapi-website-454221/strapi-dorfbuehne:latest