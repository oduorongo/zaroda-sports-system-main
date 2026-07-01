import { Prisma, AuditOp } from "@prisma/client";
import { prisma } from "./prisma";

type TxClient = Prisma.TransactionClient;

interface AuditParams<T> {
  /** id of the authenticated user performing the mutation, or null for system/public actions */
  actorId: string | null;
  operation: AuditOp;
  tableName: string;
  /** snapshot of the row before the mutation (omit for INSERT) */
  oldData?: unknown;
  /** snapshot of the row after the mutation (omit for DELETE) */
  newData?: unknown;
  /** run the actual mutation inside the same transaction as the audit row */
  mutate: (tx: TxClient) => Promise<T>;
  /** derive the audited recordId from the mutation result */
  recordId: (result: T) => string;
}

/**
 * Runs `mutate` and the resulting AuditLog insert inside a single transaction,
 * so a mutation is never persisted without its audit trail (there is no DB
 * trigger layer to fall back on without Supabase/RLS).
 */
export async function withAudit<T>(params: AuditParams<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const result = await params.mutate(tx);
    await tx.auditLog.create({
      data: {
        changedBy: params.actorId,
        operation: params.operation,
        tableName: params.tableName,
        recordId: params.recordId(result),
        oldData: toJson(params.oldData),
        newData: toJson(params.newData),
      },
    });
    return result;
  });
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
