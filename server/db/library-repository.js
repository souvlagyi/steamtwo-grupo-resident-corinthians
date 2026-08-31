function mapLibraryRow(row) {
  return {
    status: row.status,
    note: row.note ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    game: {
      id: row.gameId,
      slug: row.slug,
      title: row.title,
      summary: row.summary ?? "",
      coverUrl: row.coverUrl,
      heroUrl: row.heroUrl,
      genres: row.genres ?? [],
      stores: row.stores ?? [],
      score: Number(row.score ?? row.historicalPopularity ?? 0),
      trend: Number(row.trend ?? 0),
      currentPlayers: row.currentPlayers == null ? null : Number(row.currentPlayers),
      historicalPopularity: Number(row.historicalPopularity ?? 0),
    },
  };
}

/**
 * A small persistence boundary for the anonymous local profile used by this
 * academic prototype. Keeping it separate from the HTTP routes lets a future
 * authentication layer replace `profileKey` without rewriting the feature.
 */
export function createLibraryRepository(pool) {
  const profileKey = "local";
  const fields = `
    l.status, l.note, l.created_at AS "createdAt", l.updated_at AS "updatedAt",
    g.id AS "gameId", g.slug, g.title, g.summary,
    g.cover_url AS "coverUrl", g.hero_url AS "heroUrl",
    g.igdb_popularity AS "historicalPopularity",
    current_ranking.score, current_ranking.trend,
    steam_metric.concurrent_players AS "currentPlayers",
    COALESCE(array_agg(DISTINCT ge.name) FILTER (WHERE ge.name IS NOT NULL), '{}') AS genres,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object(
        'store', sl.store,
        'label', CASE WHEN sl.store = 'steam' THEN 'Steam' ELSE 'Epic Games' END,
        'url', sl.url
      )) FILTER (WHERE sl.id IS NOT NULL),
      '[]'::jsonb
    ) AS stores`;
  const joins = `
    JOIN games g ON g.id = l.game_id
    LEFT JOIN game_genres gg ON gg.game_id = g.id
    LEFT JOIN genres ge ON ge.id = gg.genre_id
    LEFT JOIN store_listings sl ON sl.game_id = g.id
    LEFT JOIN LATERAL (
      SELECT score, trend
      FROM game_rankings
      WHERE game_id = g.id AND period = 'now' AND store = 'all'
      ORDER BY as_of DESC
      LIMIT 1
    ) current_ranking ON true
    LEFT JOIN LATERAL (
      SELECT re.concurrent_players
      FROM ranking_entries re
      JOIN ranking_snapshots rs ON rs.id = re.snapshot_id
      WHERE re.game_id = g.id AND rs.source = 'steam' AND rs.status = 'success'
      ORDER BY rs.captured_at DESC
      LIMIT 1
    ) steam_metric ON true`;
  const groupBy = `
    l.game_id, l.status, l.note, l.created_at, l.updated_at,
    g.id, current_ranking.score, current_ranking.trend, steam_metric.concurrent_players`;

  return {
    async list() {
      const result = await pool.query(`
        SELECT ${fields}
        FROM game_library l
        ${joins}
        WHERE l.profile_key = $1
        GROUP BY ${groupBy}
        ORDER BY l.updated_at DESC, g.title ASC
      `, [profileKey]);
      return result.rows.map(mapLibraryRow);
    },

    async save({ gameId, status, note }) {
      await pool.query(`
        INSERT INTO game_library (profile_key, game_id, status, note)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (profile_key, game_id) DO UPDATE SET
          status = EXCLUDED.status,
          note = EXCLUDED.note,
          updated_at = now()
      `, [profileKey, gameId, status, note || null]);

      const result = await pool.query(`
        SELECT ${fields}
        FROM game_library l
        ${joins}
        WHERE l.profile_key = $1 AND l.game_id = $2
        GROUP BY ${groupBy}
      `, [profileKey, gameId]);
      return result.rows[0] ? mapLibraryRow(result.rows[0]) : null;
    },

    async remove(gameId) {
      const result = await pool.query(
        "DELETE FROM game_library WHERE profile_key = $1 AND game_id = $2",
        [profileKey, gameId],
      );
      return result.rowCount > 0;
    },
  };
}
