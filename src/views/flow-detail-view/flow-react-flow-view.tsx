import {
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { Map, NotebookPen, Type } from 'lucide-react'
import { observer } from 'mobx-react'
import { useNavigate } from 'react-router-dom'
import {
  Background,
  ConnectionLineType,
  Controls,
  DefaultEdgeOptions,
  EdgeChange,
  EdgeTypes,
  NodeChange,
  NodeDragHandler,
  NodeOrigin,
  NodeTypes,
  OnConnectEnd,
  OnConnectStart,
  ReactFlow,
  useOnSelectionChange,
  useReactFlow,
  useStoreApi,
} from 'reactflow'

import { BezierEdge } from '@/components/flow-edge/bezier-edge.tsx'
import { FlowNode } from '@/components/flow-node/flow-node.tsx'
import { NoteNode } from '@/components/flow-node/note-node.tsx'
import { TextNode } from '@/components/flow-node/text-node.tsx'
import { BookLoading } from '@/components/loading/book-loading.tsx'
import { Menu, MenuModel, MenuRef } from '@/components/menu/menu.tsx'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'

const nodeOrigin: NodeOrigin = [0.5, 0.5]
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'bezierAnimated',
}

const nodeTypes: NodeTypes = {
  flow: FlowNode,
  text: TextNode,
  note: NoteNode,
}

const edgeTypes: EdgeTypes = {
  bezierAnimated: BezierEdge,
}

export const FlowReactFlowView = observer(({ flow }: { flow: DoFlow }) => {
  const appStore = useStore()
  const store = useStoreApi()
  const navigate = useNavigate()
  const { screenToFlowPosition } = useReactFlow()
  const connectingNodeId = useRef<string | null>(null)
  const drawer = flow?.drawer
  const [hasSelectedNode, setHasSelectedNode] = useState(false)
  const contextMenuRef = useRef<MenuRef | null>(null)

  useOnSelectionChange({
    onChange: ({ nodes }) => {
      setHasSelectedNode(nodes.length > 0)
    },
  })

  const onConnectStart: OnConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId
  }, [])

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

    contextMenuRef.current?.show(e)
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

  useEffect(() => {
    if (!flow) {
      navigate('/')
    }
  }, [flow, navigate])

  useEffect(() => {
    if (!appStore.appLoaded) {
      return
    }

    drawer?.initialize()
  }, [appStore.appLoaded, drawer])

  const contextMenuModel: MenuModel = [
    {
      leftIcon: <NotebookPen className={'h-4 w-4'} />,
      label: 'Create Note',
      command: ({ contextMenuPosition: { x, y } }) =>
        drawer?.addNode({
          nodeType: 'note',
          position: screenToFlowPosition({ x, y }),
        }),
    },
    {
      leftIcon: <Map className={'h-4 w-4'} />,
      label: 'Create Flow',
      command: ({ contextMenuPosition: { x, y } }) =>
        drawer?.addFlowNode(screenToFlowPosition({ x, y })),
    },
    {
      leftIcon: <Type className={'h-4 w-4'} />,
      label: 'Create Text',
      command: ({ contextMenuPosition: { x, y } }) =>
        drawer?.addNode({
          nodeType: 'text',
          position: screenToFlowPosition({ x, y }),
        }),
    },
  ]

  if (!drawer?.loaded) {
    return <BookLoading />
  }

  const nodes = drawer.nodes
  const edges = drawer.edges
  return (
    <main className={'h-screen w-full'}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeDragStop={onNodeDragStop}
        nodeOrigin={nodeOrigin}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.Straight}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={(e) => {
          e.preventDefault()
        }}
        onEdgeContextMenu={(e) => {
          e.preventDefault()
        }}
        fitView
        zoomOnScroll={!hasSelectedNode}
        panOnDrag={!hasSelectedNode}
      >
        <Controls showInteractive={false} />
        <Background />
        <Menu ref={contextMenuRef} model={contextMenuModel} />
      </ReactFlow>
    </main>
  )
})
