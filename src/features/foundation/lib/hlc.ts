export type Hlc = {
  wallClock: number;
  logical: number;
  nodeId: string;
};

const defaultNodeId = "device-local";

export function createHlc(nodeId = defaultNodeId): Hlc {
  return {
    wallClock: Date.now(),
    logical: 0,
    nodeId,
  };
}
