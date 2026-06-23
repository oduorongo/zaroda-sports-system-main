import { z } from "https://esm.sh/zod@4.30.0";

export const AdminWriteSchema = z.object({
  table: z.string(),
  op: z.enum(["insert", "update", "delete", "upsert"]),
  values: z.optional(z.any()),
  match: z.optional(z.record(z.string(), z.any())),
  in: z.optional(z.record(z.string(), z.array(z.any()))),
  returning: z.optional(z.boolean()),
  single: z.optional(z.boolean()),
});

export const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
});

export const InitPaymentSchema = z.object({
  plan_id: z.string().min(1),
  championship_id: z.optional(z.string()),
  category: z.optional(z.string()),
});

export const AuditQuerySchema = z.object({
  table_name: z.optional(z.string()),
  limit: z.optional(z.number().int().min(1).max(1000)),
  since: z.optional(z.string()),
  until: z.optional(z.string()),
});
