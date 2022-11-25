<template>
  <div id="container" class="w-full h-full"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Graph, PropertyNode, ValueNode, OwnPropertyEdge } from './x6'
import { Cell } from '@antv/x6';
import { Builder } from './builder'
import { Field } from 'tms-vue3-ui/dist/es/json-doc';

const props = defineProps({
  schema: { type: Object, required: true },
  doc: { type: Object, required: true },
})

let X6Graph: any

const emit = defineEmits(['clickValueNode'])
/**
 * 更新指定字段的值
 * @param field 
 * @param newVal 
 */
const setPropertyValue = (field: Field, newVal: any) => {
  const cellId = field.fullname + '_val'
  const cell = X6Graph.getCellById(cellId)
  if (cell) {
    let text = field.schemaType === 'json' ? JSON.stringify(newVal) : newVal
    cell.setAttrs({ label: { textWrap: { text } } })
  }
}

defineExpose({ setPropertyValue })

onMounted(async () => {
  const builder = new Builder(props.schema, props.doc)
  const GraphData = await builder.build()

  // 初始化画布
  X6Graph = new Graph({
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
  })

  X6Graph.on('node:collapse', ({ node }: { node: PropertyNode }) => {
    node.toggleCollapse()
    const collapsed = node.isCollapsed()
    /**处理后代节点*/
    const run = (pre: PropertyNode) => {
      const succ = X6Graph.getSuccessors(pre, { distance: 1 })
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

  X6Graph.on('node:clickValueNode', ({ node }: { node: ValueNode }) => {
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

  X6Graph.resetCells([...nodes, ...edges])
  // 将根节点滚动到画布的中心位置
  X6Graph.positionCell(nodes[0], 'left')
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
