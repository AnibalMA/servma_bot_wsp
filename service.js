const Service = require('node-windows').Service;

// Crea un nuevo servicio
const svc = new Service({
  name: 'BotServMA', // Nombre del servicio
  description: 'Bot ServMA', // Descripción del servicio
  script: 'D:\\Documents\\GitHub\\api_bot_wsp\\index.js', // Ruta completa al archivo de tu aplicación
  nodeOptions: [
    '--harmony', // Opciones de Node.js (opcional)
    '--max_old_space_size=4096'
  ]
});

svc.on('install', () => {
  console.log('Service installed');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

// Instala el servicio
svc.install();
