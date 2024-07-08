import { nanoid } from 'nanoid'
import { Edge, Node, XYPosition } from 'reactflow'
import {
  Flow,
  FlowNodeData,
  NodeDataTypes,
  NodeType,
  NodeTypes,
} from '@/store/types.ts'

const DEFAULT_NODE_MIN_WIDTH = 150
const DEFAULT_NODE_MIN_HEIGHT = 100

/**
 * react-flow 에서 사용할 util 함수들을 관리합니다.
 */
export const reactFlowUtils = {
  /**
   * 자식 노드의 위치를 계산하는 함수
   *
   * 부모 노드의 위치와 이벤트를 기반으로 자식 노드의 위치를 계산합니다.
   *
   * @param {Object} params - 입력 매개변수를 포함하는 객체
   * @param {MouseEvent | TouchEvent} params.event - 마우스 또는 터치 이벤트
   * @param {Node} [params.parentNode] - 부모 노드 객체
   * @param {HTMLDivElement | null} [params.domNode] - 현재 다이어그램의 DOM 노드
   * @param {Function} params.screenToFlowPosition - 화면 좌표 (예: 마우스 클릭 위치)를 플로우 좌표로 변환하는 함수
   * @returns {XYPosition | undefined} - 자식 노드의 위치 또는 undefined
   */
  getChildNodePosition: ({
    event,
    parentNode,
    domNode,
    screenToFlowPosition,
  }: {
    event: MouseEvent | TouchEvent
    parentNode?: Node
    domNode?: HTMLDivElement | null
    screenToFlowPosition: (position: XYPosition) => XYPosition
  }): XYPosition | undefined => {
    if (
      !domNode ||
      // 노드가 아직 초기화되지 않은 경우, 위치나 크기가 없을 수 있습니다.
      !parentNode?.positionAbsolute ||
      !parentNode?.width ||
      !parentNode?.height
    ) {
      return
    }

    const isTouchEvent = 'touches' in event
    const x = isTouchEvent ? event.touches[0].clientX : event.clientX
    const y = isTouchEvent ? event.touches[0].clientY : event.clientY
    const panePosition = screenToFlowPosition({
      x,
      y,
    })

    // 자식 노드는 부모 노드에 상대적으로 위치하기 때문에 positionAbsolute 를 사용하여 계산합니다.
    return {
      x: panePosition.x - parentNode.positionAbsolute.x + parentNode.width / 2,
      y: panePosition.y - parentNode.positionAbsolute.y + parentNode.height / 2,
    }
  },
  /**
   * 저장되어 있는 Flow, Node Data 를 React Flow 의 Node Data 로 변환한다.
   *
   * 존재하는 Flow, Node Data 로 react flow 를 그리기 위해 사용한다.
   *
   * @param {Flow | NodeTypes} origin - 원본 데이터
   * @returns {Object} - 변환된 Node 와 Edge 객체
   */
  convertToReactFlowNodeEdgeFromOrigin: (
    origin: Flow | NodeTypes,
  ): { node: Node; edges: Edge[] } => {
    const node: Node = {
      id: 'flowId' in origin ? origin.flowId : origin.nodeId,
      type: 'flowId' in origin ? 'flow' : origin.type,
      data: origin.data,
      position: origin.position ?? { x: 0, y: 0 },
      style: {
        width: origin.style?.width ?? DEFAULT_NODE_MIN_WIDTH,
        height: origin.style?.height ?? DEFAULT_NODE_MIN_HEIGHT,
      },
    }
    const edges: Edge[] = []

    if (origin.targets) {
      origin.targets.forEach((target) => {
        edges.push({
          id: nanoid(),
          source: 'flowId' in origin ? origin.flowId : origin.nodeId,
          target: target.id,
        })
      })
    }
    return {
      node,
      edges,
    }
  },
  /**
   * childFlowIds, childNodeIds 를 인자로 받고 노드와 엣지를 추가한다.
   *
   * 존재하는 Flow, Node Data 로 react flow 를 그리기 위해 사용한다.
   *
   * @param {string[]} ids - 아이디 배열
   * @param {Function} getItem - 아이디로 항목을 가져오는 함수
   * @param {Node[]} creatingNodes - 생성할 노드 배열
   * @param {Node[]} creatingEdges - 생성할 엣지 배열
   */
  initializeChildNodes: (
    ids: string[],
    getItem: (id: string) => Flow | NodeTypes | undefined,
    creatingNodes: Node[],
    creatingEdges: Edge[],
  ) => {
    ids.forEach((id) => {
      const item = getItem(id)
      if (item) {
        const { node, edges } =
          reactFlowUtils.convertToReactFlowNodeEdgeFromOrigin(item)
        creatingNodes.push(node)
        if (edges.length > 0) {
          edges.forEach((edge) => {
            creatingEdges.push(edge)
          })
        }
      }
    })
  },
  /**
   * 노드 타입에 따라서 디폴트 리액트 플로우 노드(기본값)를 생성합니다.
   */
  createReactFlowNodeByNodeType: ({
    nodeType,
    position,
  }: {
    nodeType: NodeType | 'flow'
    position: XYPosition
  }): Node => {
    return {
      id: nanoid(),
      type: nodeType,
      data: { title: 'Untitled' },
      position,
      style: {
        width: DEFAULT_NODE_MIN_WIDTH,
        height: DEFAULT_NODE_MIN_HEIGHT,
      },
    }
  },
  /**
   * 리액트 플로우 노드를 Flow(기본값) 로 변환합니다.
   */
  createFlowNodeByReactFlowNode: ({
    flowId,
    parentFlowId,
    data,
    position,
  }: {
    flowId: string
    parentFlowId: string
    data: FlowNodeData
    position: XYPosition
  }): Flow => {
    return {
      flowId,
      created_at: new Date(),
      updated_at: new Date(),
      data,
      position,
      parentFlowId,
      childNodeIds: [],
      childFlowIds: [],
      style: {
        width: DEFAULT_NODE_MIN_WIDTH,
        height: DEFAULT_NODE_MIN_HEIGHT,
      },
    }
  },

  /**
   * 리액트 플로우 노드를 Node(기본값) 로 변환합니다.
   */
  createNodeByReactFlowNode: ({
    nodeId,
    type,
    parentFlowId,
    data,
    position,
  }: {
    nodeId: string
    type: NodeType
    parentFlowId: string
    data: NodeDataTypes
    position: XYPosition
  }): NodeTypes => {
    return {
      nodeId,
      type,
      created_at: new Date(),
      updated_at: new Date(),
      data,
      position,
      parentFlowId,
      style: {
        width: DEFAULT_NODE_MIN_WIDTH,
        height: DEFAULT_NODE_MIN_HEIGHT,
      },
    }
  },
  /**
   * sourceId, targetId 를 받아 엣지를 생성합니다.
   */
  createEdge: ({
    sourceId,
    targetId,
  }: {
    sourceId: string
    targetId: string
  }): Edge => {
    return {
      id: nanoid(),
      source: sourceId,
      target: targetId,
    }
  },
}
