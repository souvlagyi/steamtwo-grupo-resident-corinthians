import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app.js";
import { createApiRouter } from "../../server/routes/index.js";

const app = createApp({ apiRouter: createApiRouter() });

describe("recursos autorais do grupo", () => {
  it("compara jogos e calcula um resumo", async () => {
    const response = await request(app)
      .get("/api/compare")
      .query({ slugs: "elden-ring,cyberpunk-2077" })
      .expect(200);

    expect(response.body.items).toHaveLength(2);
    expect(response.body.summary.highestScore).toBe("elden-ring");
    expect(response.body.summary.scoreDifference).toBe(11.1);
    expect(response.body.summary.sharedGenres).toContain("RPG");
  });

  it("salva, atualiza e remove um jogo da biblioteca", async () => {
    const created = await request(app)
      .put("/api/library/elden-ring")
      .send({ status: "wishlist", note: "Jogar no feriado" })
      .expect(201);
    expect(created.body.status).toBe("wishlist");
    expect(created.body.game.slug).toBe("elden-ring");

    const updated = await request(app)
      .put("/api/library/elden-ring")
      .send({ status: "playing", note: "Comecei a campanha" })
      .expect(201);
    expect(updated.body.status).toBe("playing");
    expect(updated.body.note).toBe("Comecei a campanha");

    expect((await request(app).get("/api/library").expect(200)).body.items).toHaveLength(1);
    await request(app).delete("/api/library/elden-ring").expect(204);
    expect((await request(app).get("/api/library").expect(200)).body.items).toHaveLength(0);
  });

  it("valida status e quantidade de jogos selecionados", async () => {
    await request(app).put("/api/library/elden-ring").send({ status: "parado" }).expect(400);
    await request(app).get("/api/compare").query({ slugs: "elden-ring" }).expect(400);
  });
});
