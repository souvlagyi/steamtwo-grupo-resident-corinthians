import { config } from "../config.js";
import { mockGames } from "../mock/games.js";
import { createPool } from "./pool.js";
import { createRepositories } from "./repositories.js";

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL é obrigatória para executar o seed.");
}

const pool = createPool(config.databaseUrl);
const repositories = createRepositories(pool);
const asOf = new Date().toISOString();

try {
  const persisted = [];
  for (const game of mockGames) {
    const saved = await repositories.games.upsert({
      slug: game.slug,
      title: game.title,
      summary: game.summary,
      coverUrl: game.coverUrl,
      heroUrl: game.heroUrl,
      igdbPopularity: game.historicalPopularity,
      releasedAt: game.releaseDate,
    });
    await repositories.games.replaceGenres(
      saved.id,
      game.genres.map((name) => ({ name, slug: name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })),
    );
    for (const listing of game.stores) {
      await repositories.games.upsertListing({
        gameId: saved.id,
        store: listing.store,
        externalId: `${listing.store}:${game.slug}`,
        url: listing.url,
      });
    }
    persisted.push({ ...game, id: saved.id });
  }

  await repositories.rankings.replace({
    period: "now",
    asOf,
    entries: [...persisted]
      .sort((a, b) => b.score - a.score)
      .map((game, index) => ({ gameId: game.id, rank: index + 1, score: game.score, metric: game.currentPlayers, trend: game.trend })),
  });
  await repositories.rankings.replace({
    period: "all-time",
    asOf,
    entries: [...persisted]
      .sort((a, b) => b.historicalPopularity - a.historicalPopularity)
      .map((game, index) => ({ gameId: game.id, rank: index + 1, score: game.historicalPopularity, metric: game.historicalPopularity, trend: game.trend, source: "igdb" })),
  });

  console.log(`Dados de demonstração inseridos: ${persisted.length} jogos.`);
} finally {
  await pool.end();
}
