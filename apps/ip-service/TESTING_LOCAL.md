# Testing Client IP Retrieval from Localhost

When running the IP service locally, direct requests to `localhost` (e.g., `http://localhost:8081`) will bypass external routing and use the local loopback interface, returning `127.0.0.1` or `::1`.

## Simulating Public IP Requests

To test how the application handles public IP addresses, geolocations, or rate limits without deploying the service, you can inject a custom header (`X-Real-IP` or `X-Forwarded-For`) using `curl`:

```bash
curl -H "X-Real-IP: <IP_ADDRESS>" http://localhost:8081
```

For example, to simulate a request from `154.120.119.141`:
```bash
curl -H "X-Real-IP: 154.120.119.141" http://localhost:8081
```

### Why this works
In [main.go](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/ip-service/main.go), the service extracts client IP addresses by inspecting standard forwarding headers first:
1. `X-Forwarded-For`
2. `X-Real-IP`
3. Fallback to the TCP connection's remote address (`r.RemoteAddr`).

By supplying the `X-Real-IP` header during a local request, you mock the presence of a reverse proxy (like Nginx, Cloudflare, or AWS ALB) forwarding an external client request.
