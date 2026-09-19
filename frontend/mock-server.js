/**
 * Servidor WebSocket Mock con capacidad de retransmisión (Broadcast)
 * Escucha en: ws://127.0.0.1:8080/ws
 */
import { WebSocketServer } from 'ws';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`\n======================================================`);
console.log(`🛡️  AegisTrap Mock WebSocket Server activo en:`);
console.log(`    ws://127.0.0.1:${PORT}/ws`);
console.log(`    ws://localhost:${PORT}/ws`);
console.log(`======================================================\n`);
console.log(`Listo para recibir conexiones de React y Postman...\n`);

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[+] Cliente conectado desde: ${clientIp} (Total clientes: ${wss.clients.size})`);

  // Enviar mensaje de bienvenida / confirmación de handshake
  ws.send(JSON.stringify({
    type: 'alert',
    service: 'ssh',
    payload: 'Conexión WebSocket establecida con el servidor AegisTrap'
  }));

  // Retransmitir cualquier mensaje recibido a TODOS los demás clientes (Broadcast)
  ws.on('message', (data, isBinary) => {
    const rawMessage = isBinary ? data : data.toString();
    console.log(`[← RECIBIDO]:`, rawMessage);

    // Reenviar a todos los clientes conectados (ej: de Postman a React)
    let broadcastCount = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(rawMessage);
        broadcastCount++;
      }
    });

    console.log(`[→ REENVIADO]: Retransmitido a ${broadcastCount} cliente(s)\n`);
  });

  ws.on('close', () => {
    console.log(`[-] Cliente desconectado. (Clientes restantes: ${wss.clients.size})`);
  });

  ws.on('error', (err) => {
    console.error(`[!] Error en cliente:`, err.message);
  });
});
