import type { FastifyInstance } from "fastify";

export async function loginAsAdmin(app: FastifyInstance): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "admin@hcb.com", password: "Admin@1234" },
  });
  if (res.statusCode !== 200) {
    throw new Error(`Login failed: ${res.statusCode} ${res.body}`);
  }
  const body = res.json() as { accessToken: string; refreshToken: string };
  return { accessToken: body.accessToken, refreshToken: body.refreshToken };
}

export function authHeaders(accessToken: string): { authorization: string } {
  return { authorization: `Bearer ${accessToken}` };
}
