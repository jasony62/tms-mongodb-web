import { Graph, Node, Edge, Shape } from '@antv/x6'

/**
 *
 */
class ValueNode extends Node {}

ValueNode.config({
  zIndex: 3,
  markup: [
    {
      tagName: 'rect',
      selector: 'body',
    },
    {
      tagName: 'text',
      selector: 'label',
    },
  ],
  attrs: {
    body: {
      refWidth: '100%',
      refHeight: '100%',
      strokeWidth: 1,
      fill: '#FFEFF4',
      stroke: '#FF5F95',
      event: 'node:clickValueNode',
    },
    label: {
      textWrap: {
        ellipsis: true,
        width: -10,
      },
      textAnchor: 'middle',
      textVerticalAnchor: 'middle',
      refX: '50%',
      refY: '50%',
      fontSize: 12,
      event: 'node:clickValueNode',
    },
  },
})
/**
 *
 */
class PropertyNode extends Node {
  private collapsed: boolean = false

  protected postprocess() {
    this.toggleCollapse(false)
  }

  isCollapsed() {
    return this.collapsed
  }

  toggleButtonVisibility(visible: boolean) {
    this.attr('buttonGroup', {
      display: visible ? 'block' : 'none',
    })
  }
  /**
   * 切换展开/折叠状态
   */
  toggleCollapse(collapsed?: boolean) {
    const target = collapsed == null ? !this.collapsed : collapsed
    if (!target) {
      this.attr('buttonSign', {
        d: 'M 2 5 8 5',
        strokeWidth: 1.8,
      })
    } else {
      this.attr('buttonSign', {
        d: 'M 1 5 9 5 M 5 1 5 9',
        strokeWidth: 1.6,
      })
    }
    this.collapsed = target
  }
}

PropertyNode.config({
  zIndex: 2,
  markup: [
    {
      tagName: 'g',
      selector: 'buttonGroup',
      children: [
        {
          tagName: 'rect',
          selector: 'button',
          attrs: {
            'pointer-events': 'visiblePainted',
          },
        },
        {
          tagName: 'path',
          selector: 'buttonSign',
          attrs: {
            fill: 'none',
            'pointer-events': 'none',
          },
        },
      ],
    },
    {
      tagName: 'rect',
      selector: 'body',
    },
    {
      tagName: 'text',
      selector: 'label',
    },
  ],
  attrs: {
    body: {
      refWidth: '100%',
      refHeight: '100%',
      strokeWidth: 1,
      fill: '#EFF4FF',
      stroke: '#5F95FF',
    },
    label: {
      textWrap: {
        ellipsis: true,
        width: -10,
      },
      textAnchor: 'middle',
      textVerticalAnchor: 'middle',
      refX: '50%',
      refY: '50%',
      fontSize: 12,
    },
    buttonGroup: {
      refX: '100%',
      refY: '50%',
    },
    button: {
      fill: '#5F95FF',
      stroke: 'none',
      x: -10,
      y: -10,
      height: 20,
      width: 30,
      rx: 10,
      ry: 10,
      cursor: 'pointer',
      event: 'node:collapse',
    },
    buttonSign: {
      refX: 5,
      refY: -5,
      stroke: '#FFFFFF',
      strokeWidth: 1.6,
    },
  },
})

// 定义边
class OwnPropertyEdge extends Shape.Edge {
  isHidden() {
    const node = this.getTargetNode()
    return !node || !node.isVisible()
  }
}

OwnPropertyEdge.config({
  zIndex: 1,
  attrs: {
    line: {
      stroke: '#A2B1C3',
      strokeWidth: 1,
      targetMarker: null,
    },
  },
})

// 注册
Node.registry.register('property-node', PropertyNode, true)
Node.registry.register('value-node', ValueNode, true)
Edge.registry.register('own-property-edge', OwnPropertyEdge, true)

export { Graph, PropertyNode, ValueNode, OwnPropertyEdge }
