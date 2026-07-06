# Realtime WebSockets (Socket.IO)

This backend exposes a Socket.IO gateway for realtime updates (orders, kitchen, payments, etc.). It is designed to work in:

- **Single instance**: no extra dependencies
- **Multi instance**: optional Redis adapter for cross-instance broadcasts

## Environment variables

- `WS_ENABLED`: set to `false` to reject new socket connections (default: enabled)
- `WS_CORS_ORIGIN`: CORS origin for Socket.IO. Use `*` or a comma-separated list.
- `WS_REDIS_ENABLED`: set to `true` to enable Redis adapter
- `REDIS_URL`: Redis connection string (required when `WS_REDIS_ENABLED=true`)

## Client connection

Authenticate using JWT:

- Header: `Authorization: Bearer <token>`
- Or handshake auth: `{ auth: { token: "<token>" } }`

On success the server emits:

- `realtime.connected` with `{ userId, companyId }`

On failure the server emits:

- `realtime.error` with `{ message }` and disconnects

## Rooms

The gateway auto-joins each authenticated client into:

- `company:<companyId>`

## Deploy behind a reverse proxy

### Nginx

Ensure WebSocket upgrade headers are preserved:

```nginx
location /socket.io/ {
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_pass http://127.0.0.1:3000;
}
```

### Kubernetes / Load balancers

- Ensure the load balancer supports WebSocket upgrades.
- For **multi-instance** broadcasts, enable Redis adapter (`WS_REDIS_ENABLED=true`) and provide `REDIS_URL`.
- Sticky sessions are optional when using Redis adapter.

