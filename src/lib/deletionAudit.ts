import { supabase } from "./supabase";
import type { Json } from "./types";

export interface DeletionLogPayload {
  entityType: string;
  entityId: string | number;
  entityLabel?: string;
  reason: string;
  deletedBy?: string | null;
  metadata?: Json;
}

export async function logDeletion(payload: DeletionLogPayload): Promise<boolean> {
  try {
    const { error } = await supabase.from("deletion_logs").insert({
      entity_type: payload.entityType,
      entity_id: String(payload.entityId),
      entity_label: payload.entityLabel ?? null,
      reason: payload.reason,
      deleted_by: payload.deletedBy ?? null,
      metadata: payload.metadata ?? null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Failed to record deletion reason:", error);
    return false;
  }
}
