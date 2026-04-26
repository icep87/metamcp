import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../index", () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));
vi.mock("../../schema", () => ({
  namespaceToolMappingsTable: {
    namespace_uuid: "namespace_uuid",
    tool_uuid: "tool_uuid",
    mcp_server_uuid: "mcp_server_uuid",
  },
}));

import { db } from "../../index";
import { NamespaceMappingsRepository } from "../namespace-mappings.repo";

describe("NamespaceMappingsRepository.syncToolMappingsForServer", () => {
  let repo: NamespaceMappingsRepository;

  beforeEach(() => {
    repo = new NamespaceMappingsRepository();
    vi.clearAllMocks();
  });

  it("is a callable method on the repository", () => {
    expect(typeof repo.syncToolMappingsForServer).toBe("function");
  });

  it("returns empty array when currentTools is empty", async () => {
    const txSelect = vi.fn();
    const txDelete = vi.fn();
    const txInsert = vi.fn();

    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    txSelect.mockReturnValue({ from: mockFrom });

    const mockDeleteWhere = vi.fn().mockResolvedValue([]);
    txDelete.mockReturnValue({ where: mockDeleteWhere });

    (db.transaction as any).mockImplementation(async (fn: any) =>
      fn({ select: txSelect, delete: txDelete, insert: txInsert }),
    );

    const result = await repo.syncToolMappingsForServer({
      namespaceUuid: "ns-1",
      serverUuid: "srv-1",
      currentTools: [],
    });

    expect(result).toEqual([]);
    expect(txDelete).toHaveBeenCalled();
    expect(txInsert).not.toHaveBeenCalled();
  });

  it("calls insert when currentTools is non-empty", async () => {
    const txSelect = vi.fn();
    const txDelete = vi.fn();
    const txInsert = vi.fn();

    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    txSelect.mockReturnValue({ from: mockFrom });

    const mockDeleteWhere = vi.fn().mockResolvedValue([]);
    txDelete.mockReturnValue({ where: mockDeleteWhere });

    const mockReturning = vi.fn().mockResolvedValue([{ tool_uuid: "tool-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    txInsert.mockReturnValue({ values: mockValues });

    (db.transaction as any).mockImplementation(async (fn: any) =>
      fn({ select: txSelect, delete: txDelete, insert: txInsert }),
    );

    const result = await repo.syncToolMappingsForServer({
      namespaceUuid: "ns-1",
      serverUuid: "srv-1",
      currentTools: [{ toolUuid: "tool-1" }],
    });

    expect(txInsert).toHaveBeenCalled();
    expect(result).toEqual([{ tool_uuid: "tool-1" }]);
  });
});
