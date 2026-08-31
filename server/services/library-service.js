const validStatuses = new Set(["wishlist", "playing", "completed"]);

function publicGame(game) {
  return {
    ...game,
    stores: game.stores ?? [],
    genres: game.genres ?? [],
  };
}

/**
 * The app has no login in this assignment, so the fallback is intentionally
 * ephemeral. With PostgreSQL configured, the same interface is backed by the
 * game_library table and survives API restarts.
 */
export function createLibraryService({ catalogService, repository } = {}) {
  if (!catalogService) throw new Error("catalogService é obrigatório para a biblioteca.");
  const memory = new Map();

  async function gameForSlug(slug) {
    const game = await catalogService.game(slug);
    return game ? publicGame(game) : null;
  }

  return {
    async list() {
      if (repository) return repository.list();
      return [...memory.values()]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((item) => ({ ...item, game: publicGame(item.game) }));
    },

    async save(slug, { status, note = "" }) {
      if (!validStatuses.has(status)) throw Object.assign(new Error("Status de biblioteca inválido."), { status: 400 });
      const game = await gameForSlug(slug);
      if (!game) return null;
      const normalizedNote = note.trim();

      if (repository) return repository.save({ gameId: game.id, status, note: normalizedNote });

      const now = new Date().toISOString();
      const existing = memory.get(game.slug);
      const item = {
        status,
        note: normalizedNote,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        game,
      };
      memory.set(game.slug, item);
      return item;
    },

    async remove(slug) {
      const game = await gameForSlug(slug);
      if (!game) return null;
      if (repository) return repository.remove(game.id);
      return memory.delete(game.slug);
    },
  };
}
