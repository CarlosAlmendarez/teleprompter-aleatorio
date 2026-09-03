import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  uuid,
  jsonb,
  primaryKey,
  unique,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Auth.js (Drizzle adapter) tables — shape required by @auth/drizzle-adapter.
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------------------------------------------------------------------------
// App tables — private per user (owner_id), no cross-user sharing for MVP.
// ---------------------------------------------------------------------------

export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parentFolderId: uuid("parent_folder_id").references(
    (): AnyPgColumn => folders.id,
    { onDelete: "cascade" },
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documentTypeEnum = pgEnum("document_type", [
  "pdf",
  "musicxml",
  "text",
  "chordpro",
]);

export type DocumentMetadata = {
  key?: string;
  tempo?: number;
  notes?: string;
  durationSec?: number;
};

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, {
    onDelete: "set null",
  }),
  type: documentTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content"), // text / chordpro / musicxml
  blobUrl: text("blob_url"), // pdf (Vercel Blob)
  metadata: jsonb("metadata").$type<DocumentMetadata>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const setlistKindEnum = pgEnum("setlist_kind", [
  "music_set",
  "script_sequence",
]);

export const setlists = pgTable("setlists", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: setlistKindEnum("kind").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SetlistItemOverrides = {
  speed?: number;
  fontSize?: number;
  mirror?: boolean;
  showLyrics?: boolean;
  transitionNote?: string;
};

export const setlistItems = pgTable(
  "setlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    setlistId: uuid("setlist_id")
      .notNull()
      .references(() => setlists.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    // Stored with gaps (e.g. multiples of 1000) so reordering an item only
    // touches its own row instead of reindexing the whole list.
    position: integer("position").notNull(),
    overrides: jsonb("overrides").$type<SetlistItemOverrides>().default({}),
  },
  (t) => [unique().on(t.setlistId, t.position)],
);

export const offlineCacheFlags = pgTable("offline_cache_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Exactly one of setlistId / documentId is set: a whole setlist, or a
  // single standalone document (e.g. one script) marked for offline use.
  setlistId: uuid("setlist_id").references(() => setlists.id, {
    onDelete: "cascade",
  }),
  documentId: uuid("document_id").references(() => documents.id, {
    onDelete: "cascade",
  }),
  cachedAt: timestamp("cached_at").defaultNow().notNull(),
});
