import { Router } from "express";
import { z } from "zod";
import { createCatalogService } from "../services/catalog-service.js";
import { createLibraryService } from "../services/library-service.js";

const storeSchema = z.enum(["all", "steam", "epic"]).default("all");
const periodSchema = z.enum(["now", "week", "all-time"]).default("now");
const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(20);
const libraryStatusSchema = z.enum(["wishlist", "playing", "completed"]);
const compareSchema = z.object({
  slugs: z.string().transform((value) => [...new Set(value.split(",").map((slug) => slug.trim()).filter(Boolean))])
    .refine((slugs) => slugs.length >= 2 && slugs.length <= 3, "Informe dois ou três jogos para comparar.")
    .refine((slugs) => slugs.every((slug) => /^[a-z0-9-]+$/.test(slug)), "Slug de jogo inválido."),
});

const methodology = {
  name: "Índice SteamTwo",
  formula: "100 × (N - posição + 1) / N",
  rules: [
    "Jogos presentes nas duas lojas recebem a média das notas disponíveis.",
    "Ausência em uma coleta válida vale zero; indisponibilidade da fonte é excluída.",
    "A semana representa a média dos sete snapshots diários válidos.",
    "De sempre é popularidade histórica, não uma contagem de horas jogadas.",
  ],
  sources: ["Steam Charts", "Epic Games Store — Mais jogados", "IGDB PopScore"],
};

export function createApiRouter({ catalogService = createCatalogService(), libraryService, healthCheck } = {}) {
  const router = Router();
  const userLibrary = libraryService ?? createLibraryService({ catalogService });

  router.get("/health", async (_request, response, next) => {
    try {
      const database = healthCheck ? await healthCheck() : { status: "not-configured" };
      response.json({ status: "ok", database, timestamp: new Date().toISOString() });
    } catch (error) {
      next(Object.assign(error, { status: 503 }));
    }
  });

  router.get("/dashboard", async (request, response, next) => {
    try {
      const { store } = z.object({ store: storeSchema }).parse(request.query);
      response.json(await catalogService.dashboard({ store }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings", async (request, response, next) => {
    try {
      const query = z.object({
        period: periodSchema,
        store: storeSchema,
        page: pageSchema,
        limit: limitSchema,
      }).parse(request.query);
      response.json(await catalogService.rankings(query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/games", async (request, response, next) => {
    try {
      const query = z.object({
        q: z.string().max(100).default(""),
        genre: z.string().max(60).optional(),
        store: storeSchema,
        sort: z.enum(["popularity", "name"]).default("popularity"),
        page: pageSchema,
        limit: limitSchema.default(12),
      }).parse(request.query);
      response.json(await catalogService.games(query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/games/:slug", async (request, response, next) => {
    try {
      const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
      const game = await catalogService.game(slug);
      if (!game) return response.status(404).json({ error: "Jogo não encontrado" });
      return response.json(game);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/compare", async (request, response, next) => {
    try {
      const { slugs } = compareSchema.parse(request.query);
      const comparison = await catalogService.compare(slugs);
      if (!comparison) return response.status(404).json({ error: "Um ou mais jogos não foram encontrados." });
      return response.json(comparison);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/library", async (_request, response, next) => {
    try {
      response.json({ items: await userLibrary.list() });
    } catch (error) {
      next(error);
    }
  });

  router.put("/library/:slug", async (request, response, next) => {
    try {
      const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
      const payload = z.object({
        status: libraryStatusSchema,
        note: z.string().trim().max(280).optional().default(""),
      }).parse(request.body);
      const item = await userLibrary.save(slug, payload);
      if (!item) return response.status(404).json({ error: "Jogo não encontrado" });
      return response.status(201).json(item);
    } catch (error) {
      return next(error);
    }
  });

  router.delete("/library/:slug", async (request, response, next) => {
    try {
      const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
      const removed = await userLibrary.remove(slug);
      if (removed == null) return response.status(404).json({ error: "Jogo não encontrado" });
      return response.status(removed ? 204 : 404).end();
    } catch (error) {
      return next(error);
    }
  });

  router.get("/methodology", (_request, response) => response.json(methodology));

  return router;
}

