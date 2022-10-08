<template>
  <div id="container" class="w-full h-full"></div>
  <div id="minimap"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Graph, PropertyNode, ValueNode, OwnPropertyEdge } from './x6'
import { Cell } from '@antv/x6';
import { Builder } from './builder'


const props = defineProps({
  schema: { type: Object, required: true },
  doc: { type: Object, required: true },
})

const emit = defineEmits(['clickValueNode'])

onMounted(async () => {
  const builder = new Builder(props.schema, props.doc)
  const GraphData = await builder.build()

  // 初始化画布
  const x6Graph = new Graph({
    container: document.getElementById('container')!,
    async: false,
    frozen: false,
    scroller: true,
    interacting: false,
    sorting: 'approx',
    connecting: {
      anchor: 'orth',
      connector: 'rounded',
      connectionPoint: 'boundary',
      router: {
        name: 'er',
        args: {
          offset: 24,
          direction: 'H',
        },
      },
    },
    // minimap: {
    //   enabled: true,
    //   container: document.getElementById('minimap')!,
    //   graphOptions: {
    //     async: true,
    //     getCellView(cell) {
    //       // 用指定的 View 替换节点默认的 View
    //       if (cell.isNode()) {
    //         return NodeView
    //       }
    //     },
    //     createCellView(cell) {
    //       // 在小地图中不渲染边
    //       if (cell.isEdge()) {
    //         return null
    //       }
    //     },
    //   }
    // },
  })

  x6Graph.on('node:collapse', ({ node }: { node: PropertyNode }) => {
    node.toggleCollapse()
    const collapsed = node.isCollapsed()
    /**处理后代节点*/
    const run = (pre: PropertyNode) => {
      const succ = x6Graph.getSuccessors(pre, { distance: 1 })
      if (succ) {
        succ.forEach((node: Cell) => {
          node.toggleVisible(!collapsed)
          if (node instanceof PropertyNode) {
            if (!node.isCollapsed()) {
              run(node)
            }
          }
        })
      }
    }
    run(node)
  })

  x6Graph.on('node:clickValueNode', ({ node }: { node: ValueNode }) => {
    emit('clickValueNode', node.getData())
  })

  const nodes = GraphData.nodes.map(({ leaf, ...metadata }: any) => {
    let node
    if (metadata.shape === 'value-node') {
      node = new ValueNode(metadata)
    } else {
      node = new PropertyNode(metadata)
      node.toggleButtonVisibility(leaf === false)
    }
    return node
  })
  const edges = GraphData.edges.map(
    (edge: any) =>
      new OwnPropertyEdge({
        source: edge.source,
        target: edge.target,
      })
  )

  x6Graph.resetCells([...nodes, ...edges])
  // 将根节点滚动到画布的中心位置
  x6Graph.positionCell(nodes[0], 'left')
})
</script>
<style lang="scss">
#minimap {
  position: absolute;
  width: 300px;
  height: 200px;
  bottom: 0;
  right: 0;
}
</style>
