import Fastify from "fastify";
import { getPack, NotFoundError, ValidationError } from "./lib/packLoader.js";

const app = Fastify();

// healthcheck pro pohodlné preview
app.get("/", async () => ({ ok: true, hint: "/api/packs/:category" }));

app.get("/api/packs/:category", async (req, reply) => {
  const { category } = req.params as { category: string };
  try {
    const pack = await getPack(category);
    return reply.code(200).send(pack);
  } catch (e) {
    if (e instanceof NotFoundError) return reply.code(404).send({ error: "not_found", message: e.message });
    if (e instanceof ValidationError) return reply.code(400).send({ error: "invalid_manifest", message: e.message, details: e.details });
    req.log.error(e);
    return reply.code(500).send({ error: "internal_error" });
  }
});

export default app;
