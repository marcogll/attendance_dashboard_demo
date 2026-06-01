FROM nginx:alpine

# Copy custom nginx config from dashboard directory
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Copy all dashboard files
COPY dashboard/index.html /usr/share/nginx/html/index.html
COPY dashboard/app.js /usr/share/nginx/html/app.js
COPY dashboard/analisis.js /usr/share/nginx/html/analisis.js
COPY dashboard/theme.js /usr/share/nginx/html/theme.js
COPY dashboard/charts-theme.js /usr/share/nginx/html/charts-theme.js
COPY dashboard/empleado.html /usr/share/nginx/html/empleado.html
COPY dashboard/empleado.js /usr/share/nginx/html/empleado.js
COPY dashboard/sucursal.html /usr/share/nginx/html/sucursal.html
COPY dashboard/sucursal.js /usr/share/nginx/html/sucursal.js
COPY dashboard/data.json /usr/share/nginx/html/data.json

# Coolify expects port 3000 by default
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
