import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/ws/ops', cors: { origin: '*' } })
export class OpsGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  handleConnection(client: Socket) {
    // supply route via start.route like SignalR pattern
    client.on('start', async (payload: { route: string, start?: any }) => {
      // route -> resolve operation provider that implements IHubOperation
      // For brevity: echo ack
      client.emit('started', { ok: true, route: payload.route });
    });
  }
}
