# Use a lightweight base image
FROM nginx:alpine

# Copy the static website files to the Nginx document root
COPY ./dist /usr/share/nginx/html