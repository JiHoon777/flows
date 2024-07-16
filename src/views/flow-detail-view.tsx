import {
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { Map, NotebookPen, Type } from 'lucide-react'
import { observer } from 'mobx-react'
import { useParams } from 'react-router-dom'
import {
  Background,
  ConnectionLineType,
  Controls,
  EdgeChange,
  NodeChange,
  NodeDragHandler,
  NodeOrigin,
  OnConnectEnd,
  OnConnectStart,
  ReactFlow,
  ReactFlowProvider,
  useOnSelectionChange,
  useReactFlow,
  useStoreApi,
} from 'reactflow'

import {
  FlowContextMenuContent,
  MenuItem,
} from '@/components/flow-context-menu-content'
import { StraightEdge } from '@/components/flow-edge/straight-edge'
import { FlowNode } from '@/components/flow-node/flow-node'
import { NoteNode } from '@/components/flow-node/note-node'
import { TextNode } from '@/components/flow-node/text-node'
import { BookLoading } from '@/components/loading/book-loading'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'

import 'reactflow/dist/style.css'

const nodeOrigin: NodeOrigin = [0.5, 0.5]
const connectionLineStyle = { stroke: '#e2e8f0', strokeWidth: 3 }
const defaultEdgeOptions = { style: connectionLineStyle, type: 'text' }

const nodeTypes = {
  flow: FlowNode,
  text: TextNode,
  note: NoteNode,
}

const edgeTypes = {
  flow: StraightEdge,
  text: StraightEdge,
  note: StraightEdge,
}

export const FlowDetailViewParamsWrap = observer(() => {
  const { flowId } = useParams<{ flowId: string }>()

  if (!flowId) {
    throw new Error(`flowId 가 존재하지 않습니다.`)
  }

  return <FlowDetailView flowId={flowId} />
})

export const FlowDetailView = observer(({ flowId }: { flowId: string }) => {
  return (
    <ReactFlowProvider>
      <FlowDetailView_ flowId={flowId} />
    </ReactFlowProvider>
  )
})

const FlowDetailView_ = observer(({ flowId }: { flowId: string }) => {
  const appStore = useStore()
  const store = useStoreApi()
  const { screenToFlowPosition } = useReactFlow()
  const connectingNodeId = useRef<string | null>(null)
  const flow = appStore.flowStore.getFlowById(flowId) as DoFlow | undefined
  const drawer = flow?.drawer
  const [hasSelectedNode, setHasSelectedNode] = useState(false)
  //
  // context menu
  //
  const [paneContextMenuPosition, setPaneContextMenuPosition] = useState<{
    e: ReactMouseEvent | TouchEvent
    x: number
    y: number
  } | null>(null)

  //
  useOnSelectionChange({
    onChange: ({ nodes }) => {
      setHasSelectedNode(nodes.length > 0)
    },
  })

  /**
   * 연결 시작 시 호출되는 함수
   *
   * 연결이 시작될 때 노드의 ID를 저장합니다.
   *
   * @param _ - 사용되지 않는 첫 번째 매개변수
   * @param {Object} params - 노드 ID를 포함하는 객체
   */
  const onConnectStart: OnConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId
  }, [])

  /**
   * 연결 종료 시 호출되는 함수
   *
   * 연결이 종료될 때 자식 노드의 위치를 계산하고 새로운 자식 노드를 추가합니다.
   *
   * @param {MouseEvent | TouchEvent} event - 마우스 또는 터치 이벤트
   */
  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      const target = event.target as Element
      const {
        nodeInternals,
        // domNode
      } = store.getState()
      // 타겟이 빈 공간인지 여부
      // const targetIsPane = target.classList.contains('react-flow__pane')
      const targetNodeElement = target.closest('.react-flow__node')

      const sourceNode = nodeInternals.get(connectingNodeId.current ?? '')
      if (!sourceNode) {
        return
      }

      //
      // 노드와 노드를 연결할 떄,
      //
      if (targetNodeElement && connectingNodeId.current) {
        const targetNodeId = targetNodeElement.getAttribute('data-id')
        const targetNode = targetNodeId ? nodeInternals.get(targetNodeId) : null

        if (targetNode) {
          drawer?.connectNodes(sourceNode, targetNode)
        }
      }

      // Todo:
      // 노드와 빈 공간을 연결할 때,
      //
      // if (targetIsPane && connectingNodeId.current) {
      //   const childNodePosition = getChildNodePosition({
      //     event,
      //     parentNode: sourceNode,
      //     domNode,
      //     screenToFlowPosition,
      //   })
      //
      //   if (childNodePosition) {
      //     addChildNode(sourceNode, childNodePosition)
      //   }
      // }
    },
    [drawer, store],
  )

  const onNodeDragStop: NodeDragHandler = useCallback(
    (_, node) => {
      if (node.type) {
        drawer?.updateNodePosition({
          id: node.id,
          type: node.type,
          position: node.position,
        })
      }
    },
    [drawer],
  )

  const onPaneContextMenu = useCallback((e: ReactMouseEvent | TouchEvent) => {
    e.preventDefault()

    const isTouchEvent = 'touches' in e
    setPaneContextMenuPosition({
      e,
      x: isTouchEvent ? e.touches[0].clientX : e.clientX,
      y: isTouchEvent ? e.touches[0].clientY : e.clientY,
    })
  }, [])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      drawer?.onNodesChange(changes)
    },
    [drawer],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      drawer?.onEdgesChange(changes)
    },
    [drawer],
  )

  /**
   * 컴포넌트가 마운트될 때 초기화 함수 호출
   *
   * id가 변경될 때마다 initialize 함수를 호출합니다.
   */
  useEffect(() => {
    if (!appStore.appLoaded) {
      return
    }

    drawer?.initialize()
  }, [appStore.appLoaded, drawer])

  const paneContextMenuItems: MenuItem[] = (() => {
    if (!paneContextMenuPosition) {
      return []
    }
    const { x, y } = paneContextMenuPosition
    const panePosition = screenToFlowPosition({ x, y })
    const position = {
      x: panePosition.x,
      y: panePosition.y,
    }

    return [
      {
        leftIcon: <NotebookPen className={'w-4 h-4'} />,
        text: 'Create Note',
        onClick: () => drawer?.addNode({ nodeType: 'note', position }),
      },
      {
        leftIcon: <Map className={'w-4 h-4'} />,
        text: 'Create Flow',
        onClick: () => drawer?.addFlowNode(position),
      },
      {
        leftIcon: <Type className={'w-4 h-4'} />,
        text: 'Create Text',
        onClick: () => drawer?.addNode({ nodeType: 'text', position }),
      },
    ]
  })()

  if (!drawer?.loaded) {
    return <BookLoading />
  }

  const nodes = drawer.nodes
  const edges = drawer.edges
  return (
    <main className={'w-full h-screen'}>
      <ReactFlow
        /**
         * 다이어그램에서 사용될 노드들을 정의합니다.
         * 이 노드들은 화면에 렌더링되며, 상태 관리에서 가져온 값들입니다.
         */
        nodes={nodes}
        /**
         * 다이어그램에서 사용될 엣지들을 정의합니다.
         * 이 엣지들은 노드들 간의 연결을 나타내며, 상태 관리에서 가져온 값들입니다.
         */
        edges={edges}
        /**
         * 사용자 정의 노드 타입을 정의합니다.
         * 'mindMap' 타입의 노드를 사용하기 위해 커스텀 노드 컴포넌트를 설정합니다.
         */
        nodeTypes={nodeTypes}
        /**
         * 사용자 정의 엣지 타입을 정의합니다.
         * 'mindMap' 타입의 엣지를 사용하기 위해 커스텀 엣지 컴포넌트를 설정합니다.
         */
        edgeTypes={edgeTypes}
        /**
         * 노드 변경 이벤트 핸들러를 설정합니다.
         * 노드의 위치나 속성이 변경될 때 호출됩니다.
         */
        onNodesChange={onNodesChange}
        /**
         * 엣지 변경 이벤트 핸들러를 설정합니다.
         * 엣지의 연결 상태나 속성이 변경될 때 호출됩니다.
         */
        onEdgesChange={onEdgesChange}
        /**
         * 연결 시작 이벤트 핸들러를 설정합니다.
         * 노드 간의 연결이 시작될 때 호출됩니다.
         */
        onConnectStart={onConnectStart}
        /**
         * 연결 종료 이벤트 핸들러를 설정합니다.
         * 노드 간의 연결이 완료될 때 호출됩니다.
         */
        onConnectEnd={onConnectEnd}
        onNodeDragStop={onNodeDragStop}
        /**
         * 노드의 원점을 설정합니다.
         * 노드의 위치를 부모 노드에 상대적으로 설정할 때 사용됩니다.
         */
        nodeOrigin={nodeOrigin}
        /**
         * 연결선의 스타일을 설정합니다.
         * 연결선의 색상과 두께를 정의합니다.
         */
        connectionLineStyle={connectionLineStyle}
        /**
         * 기본 엣지 옵션을 설정합니다.
         * 모든 엣지에 공통적으로 적용될 스타일과 타입을 정의합니다.
         */
        defaultEdgeOptions={defaultEdgeOptions}
        /**
         * 연결선의 타입을 설정합니다.
         * 연결선의 종류를 설정하여 다양한 스타일의 연결선을 사용할 수 있습니다.
         */
        connectionLineType={ConnectionLineType.Straight}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={(e) => {
          e.preventDefault()
        }}
        onEdgeContextMenu={(e) => {
          e.preventDefault()
        }}
        /**
         * 다이어그램을 뷰포트에 맞게 조정합니다.
         * 초기 로드 시 다이어그램이 화면에 잘 맞게 조정됩니다.
         */
        fitView
        zoomOnScroll={!hasSelectedNode}
        panOnDrag={!hasSelectedNode}
      >
        {/**
         * 다이어그램 컨트롤을 표시합니다.
         * showInteractive 가 false 일 경우, 사용자가 상호작용할 수 없는 컨트롤만 표시됩니다.
         */}
        <Controls showInteractive={false} />
        <Background />
        <FlowContextMenuContent
          isOpen={!!paneContextMenuPosition}
          position={paneContextMenuPosition}
          menuItems={paneContextMenuItems}
          onClose={() => setPaneContextMenuPosition(null)}
        />
      </ReactFlow>
    </main>
  )
})
