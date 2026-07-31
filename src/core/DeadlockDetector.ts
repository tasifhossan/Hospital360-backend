/**
 * DeadlockDetector.ts
 *
 * A kernel-level utility that inspects the ResourceManager's allocation ledger
 * and pending requests to construct a Wait-For Graph (WFG) and detect cycles.
 *
 * OS Analogue:
 * - Resource-Allocation Graph (RAG) / Wait-For Graph (WFG) Cycle Detection:
 *   In OS deadlock theory, a system is in a deadlocked state if and only if
 *   there exists a cycle in the Wait-For Graph (for single-unit resource systems).
 *   Operating systems running deadlock-detection engines periodically execute
 *   cycle-detection algorithms (e.g. depth-first search or Tarjan's strongly connected
 *   components algorithm) over the active transaction/process dependency graph.
 */

import { ResourceManager } from "./ResourceManager";
import { ResourceType, RESOURCE_CAPACITY } from "../types/resources";

export class DeadlockDetector {
  private readonly resourceManager: ResourceManager;

  constructor(resourceManager: ResourceManager) {
    this.resourceManager = resourceManager;
  }

  /**
   * Scans the resource manager and returns the list of nodes involved in a deadlock cycle, if any.
   * Uses a Depth-First Search (DFS) back-edge cycle detection algorithm.
   */
  detectDeadlock(): { deadlocked: boolean; cycle?: string[] } {
    const adj = this.getWaitForGraph();
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const parent = new Map<string, string>();
    let cycleNodes: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = adj.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          parent.set(neighbor, node);
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          // Cycle detected! Reconstruct the path from neighbor (ancestor) to current node
          const cycle: string[] = [neighbor];
          let curr = node;
          while (curr !== neighbor) {
            cycle.push(curr);
            const nextNode = parent.get(curr);
            if (!nextNode) break;
            curr = nextNode;
          }
          cycle.reverse(); // Order from dependency start to finish
          cycleNodes = cycle;
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    // Run DFS starting from each node in the graph
    for (const holder of adj.keys()) {
      if (!visited.has(holder)) {
        if (dfs(holder)) {
          return { deadlocked: true, cycle: cycleNodes };
        }
      }
    }

    return { deadlocked: false };
  }

  /**
   * Compiles the Wait-For Graph (WFG) from the ResourceManager's state.
   * Map keys are holderIds, values are arrays of holderIds that the key holder is waiting on.
   */
  private getWaitForGraph(): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    const holders = this.getAllActiveHolders();

    for (const holder of holders) {
      const pendingRes = this.resourceManager.getPendingRequest(holder);
      if (pendingRes) {
        // If the holder is waiting on a resource, find who is currently holding that resource
        const currentHolders = this.resourceManager.getHolders(pendingRes);
        adj.set(holder, currentHolders);
      } else {
        adj.set(holder, []);
      }
    }

    return adj;
  }

  /**
   * Identifies all active holders (both successfully holding or currently blocked waiting)
   * in the system.
   */
  private getAllActiveHolders(): Set<string> {
    const holders = new Set<string>();
    const resourceTypes = Object.keys(RESOURCE_CAPACITY) as ResourceType[];

    for (const res of resourceTypes) {
      // Add holders currently holding this resource
      this.resourceManager.getHolders(res).forEach((h) => holders.add(h));
      // Add holders waiting for this resource
      this.resourceManager.getWaitingHolders(res).forEach((h) => holders.add(h));
    }

    return holders;
  }
}
