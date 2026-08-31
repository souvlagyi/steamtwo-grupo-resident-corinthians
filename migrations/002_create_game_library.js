export async function up(pgm) {
  pgm.createType("library_status", ["wishlist", "playing", "completed"]);
  pgm.createTable("game_library", {
    profile_key: { type: "text", notNull: true, default: "local" },
    game_id: { type: "uuid", notNull: true, references: '"games"', onDelete: "cascade" },
    status: { type: "library_status", notNull: true, default: "wishlist" },
    note: { type: "text", check: "char_length(note) <= 280" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  }, { constraints: { primaryKey: ["profile_key", "game_id"] } });
  pgm.createIndex("game_library", ["profile_key", { name: "updated_at", sort: "DESC" }]);
}

export async function down(pgm) {
  pgm.dropTable("game_library");
  pgm.dropType("library_status");
}
