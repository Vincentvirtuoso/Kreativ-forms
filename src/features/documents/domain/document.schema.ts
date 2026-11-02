import { z } from "zod";

export const documentStatusSchema = z.enum([
  "draft",
  "in_progress",
  "completed",
]);

export const documentPersistenceSchema = z.enum(["local", "session"]);

export const documentSyncStatusSchema = z.enum([
  "local",
  "pending",
  "synced",
  "conflict",
]);

export const pageRotationSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);

export const documentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  status: documentStatusSchema,

  sourceAssetId: z.string().min(1),
  workingAssetId: z.string().min(1),

  pageIds: z.array(z.string().min(1)),
  collectionId: z.string().optional(),

  persistence: documentPersistenceSchema,

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),

  revision: z.number().int().nonnegative(),
  schemaVersion: z.number().int().positive(),

  sync: z.object({
    status: documentSyncStatusSchema,
    lastSyncedAt: z.string().datetime().optional(),
    serverRevision: z.number().int().nonnegative().optional(),
  }),

  deletedAt: z.string().datetime().optional(),
});

export const documentPageSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),

  sourcePageNumber: z.number().int().nonnegative(),
  order: z.number().int().nonnegative(),

  rotation: pageRotationSchema,

  width: z.number().positive(),
  height: z.number().positive(),

  thumbnailAssetId: z.string().optional(),
});

export const documentAssetSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),

  type: z.enum(["original_pdf", "working_pdf", "thumbnail", "image"]),

  mimeType: z.string().min(1),
  size: z.number().nonnegative(),

  createdAt: z.string().datetime(),
  checksum: z.string().optional(),
});
