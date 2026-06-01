FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all dashboard files
COPY index.html /usr/share/nginx/html/index.html
COPY app.js /usr/share/nginx/html/app.js
COPY analisis.js /usr/share/nginx/html/analisis.js
COPY theme.js /usr/share/nginx/html/theme.js
COPY charts-theme.js /usr/share/nginx/html/charts-theme.js
COPY empleado.html /usr/share/nginx/html/empleado.html
COPY empleado.js /usr/share/nginx/html/empleado.js
COPY sucursal.html /usr/share/nginx/html/sucursal.html
COPY sucursal.js /usr/share/nginx/html/sucursal.js
COPY data.json /usr/share/nginx/html/data.json

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
