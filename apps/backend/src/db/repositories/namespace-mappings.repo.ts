import {
  NamespaceServerStatusUpdate,
  NamespaceToolOverridesUpdate,
  NamespaceToolStatusUpdate,
} from "@repo/zod-types";
import { and, eq, sql } from "drizzle-orm";

import { db } from "../index";
import {
  namespaceServerMappingsTable,
  namespaceToolMappingsTable,
} from "../schema";

export class NamespaceMappingsRepository {
  async updateServerStatus(input: NamespaceServerStatusUpdate) {
    const [updatedMapping] = await db
      .update(namespaceServerMappingsTable)
      .set({
        status: input.status,
      })
      .where(
        and(
          eq(namespaceServerMappingsTable.namespace_uuid, input.namespaceUuid),
          eq(namespaceServerMappingsTable.mcp_server_uuid, input.serverUuid),
        ),
      )
      .returning();

    return updatedMapping;
  }

  async updateToolStatus(input: NamespaceToolStatusUpdate) {
    const [updatedMapping] = await db
      .update(namespaceToolMappingsTable)
      .set({
        status: input.status,
      })
      .where(
        and(
          eq(namespaceToolMappingsTable.namespace_uuid, input.namespaceUuid),
          eq(namespaceToolMappingsTable.tool_uuid, input.toolUuid),
          eq(namespaceToolMappingsTable.mcp_server_uuid, input.serverUuid),
        ),
      )
      .returning();

    return updatedMapping;
  }

  async updateToolOverrides(input: NamespaceToolOverridesUpdate) {
    const [updatedMapping] = await db
      .update(namespaceToolMappingsTable)
      .set({
        override_name: input.overrideName,
        override_title: input.overrideTitle,
        override_description: input.overrideDescription,
        override_annotations: input.overrideAnnotations,
      })
      .where(
        and(
          eq(namespaceToolMappingsTable.namespace_uuid, input.namespaceUuid),
          eq(namespaceToolMappingsTable.tool_uuid, input.toolUuid),
          eq(namespaceToolMappingsTable.mcp_server_uuid, input.serverUuid),
        ),
      )
      .returning();

    return updatedMapping;
  }

  async findServerMapping(namespaceUuid: string, serverUuid: string) {
    const [mapping] = await db
      .select()
      .from(namespaceServerMappingsTable)
      .where(
        and(
          eq(namespaceServerMappingsTable.namespace_uuid, namespaceUuid),
          eq(namespaceServerMappingsTable.mcp_server_uuid, serverUuid),
        ),
      );

    return mapping;
  }

  /**
   * Find all namespace UUIDs that use a specific MCP server
   */
  async findNamespacesByServerUuid(serverUuid: string): Promise<string[]> {
    const mappings = await db
      .select({
        namespace_uuid: namespaceServerMappingsTable.namespace_uuid,
      })
      .from(namespaceServerMappingsTable)
      .where(eq(namespaceServerMappingsTable.mcp_server_uuid, serverUuid));

    return mappings.map((mapping) => mapping.namespace_uuid);
  }

  /**
   * Get all existing tool mappings for a namespace
   */
  async findToolMappingsByNamespace(namespaceUuid: string) {
    const mappings = await db
      .select()
      .from(namespaceToolMappingsTable)
      .where(eq(namespaceToolMappingsTable.namespace_uuid, namespaceUuid));

    return mappings;
  }

  async findToolMapping(
    namespaceUuid: string,
    toolUuid: string,
    serverUuid: string,
  ) {
    const [mapping] = await db
      .select()
      .from(namespaceToolMappingsTable)
      .where(
        and(
          eq(namespaceToolMappingsTable.namespace_uuid, namespaceUuid),
          eq(namespaceToolMappingsTable.tool_uuid, toolUuid),
          eq(namespaceToolMappingsTable.mcp_server_uuid, serverUuid),
        ),
      );

    return mapping;
  }

  /**
   * Bulk upsert namespace tool mappings for a namespace
   * Used when refreshing tools from MetaMCP connection
   */
  async bulkUpsertNamespaceToolMappings(input: {
    namespaceUuid: string;
    toolMappings: Array<{
      toolUuid: string;
      serverUuid: string;
      status?: "ACTIVE" | "INACTIVE";
    }>;
  }) {
    if (!input.toolMappings || input.toolMappings.length === 0) {
      return [];
    }

    const mappingsToInsert = input.toolMappings.map((mapping) => ({
      namespace_uuid: input.namespaceUuid,
      tool_uuid: mapping.toolUuid,
      mcp_server_uuid: mapping.serverUuid,
      status: (mapping.status || "ACTIVE") as "ACTIVE" | "INACTIVE",
    }));

    // Upsert the mappings - if they exist, update the status; if not, insert them
    return await db
      .insert(namespaceToolMappingsTable)
      .values(mappingsToInsert)
      .onConflictDoUpdate({
        target: [
          namespaceToolMappingsTable.namespace_uuid,
          namespaceToolMappingsTable.tool_uuid,
        ],
        set: {
          status: sql`excluded.status`,
          mcp_server_uuid: sql`excluded.mcp_server_uuid`,
        },
      })
      .returning();
  }
  /**
   * Sync tool mappings for a (namespace, server) pair to exactly match `currentTools`.
   *
   * Uses delete-then-reinsert rather than upsert because upsert alone cannot remove
   * tools that no longer exist on the server — only a DELETE of the full set followed
   * by a selective INSERT achieves that. The entire operation is wrapped in a
   * transaction so callers never observe a partially-updated state.
   */
  async syncToolMappingsForServer(input: {
    namespaceUuid: string;
    serverUuid: string;
    currentTools: Array<{ toolUuid: string }>;
  }): Promise<typeof namespaceToolMappingsTable.$inferSelect[]> {
    const { namespaceUuid, serverUuid, currentTools } = input;

    return await db.transaction(async (tx) => {
      // 1. Load existing mappings for this (namespace, server) pair to preserve status + overrides
      const existing = await tx
        .select()
        .from(namespaceToolMappingsTable)
        .where(
          and(
            eq(namespaceToolMappingsTable.namespace_uuid, namespaceUuid),
            eq(namespaceToolMappingsTable.mcp_server_uuid, serverUuid),
          ),
        );

      const existingMap = new Map(existing.map((m) => [m.tool_uuid, m]));

      // 2. Delete all existing mappings for this (namespace, server)
      await tx
        .delete(namespaceToolMappingsTable)
        .where(
          and(
            eq(namespaceToolMappingsTable.namespace_uuid, namespaceUuid),
            eq(namespaceToolMappingsTable.mcp_server_uuid, serverUuid),
          ),
        );

      // 3. Nothing to insert — return early
      if (currentTools.length === 0) {
        return [];
      }

      // 4. Re-insert, preserving status and overrides for tools that existed before
      const toInsert = currentTools.map(({ toolUuid }) => {
        const prev = existingMap.get(toolUuid);
        return {
          namespace_uuid: namespaceUuid,
          tool_uuid: toolUuid,
          mcp_server_uuid: serverUuid,
          status: (prev?.status ?? "ACTIVE") as "ACTIVE" | "INACTIVE",
          override_name: prev?.override_name ?? null,
          override_title: prev?.override_title ?? null,
          override_description: prev?.override_description ?? null,
          override_annotations: prev?.override_annotations ?? null,
        };
      });

      return await tx
        .insert(namespaceToolMappingsTable)
        .values(toInsert)
        .returning();
    });
  }
}

export const namespaceMappingsRepository = new NamespaceMappingsRepository();
