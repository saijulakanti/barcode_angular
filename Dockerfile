# Stage 1: Build the Angular app
FROM node:18 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build --prod

# Stage 2: Serve the app with nginx
FROM nginx:alpine

# Copy custom nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output
COPY --from=build /app/dist/barcode-scanner-app /usr/share/nginx/html







# # Stage 1: Build Angular app
# FROM node:18-alpine AS builder

# WORKDIR /app

# # Copy dependencies and install
# COPY package*.json ./
# RUN npm install

# # Copy rest of the code and build
# COPY . .
# RUN npm run build --prod

# # Stage 2: Serve with Nginx
# FROM nginx:stable-alpine

# # Remove default Nginx static site
# RUN rm -rf /usr/share/nginx/html/*

# # Copy built Angular app to Nginx public folder
# COPY --from=builder /app/dist/barcode /usr/share/nginx/html

# # Copy custom Nginx config (optional)
# # COPY nginx.conf /etc/nginx/conf.d/default.conf

# EXPOSE 80

# CMD ["nginx", "-g", "daemon off;"]
