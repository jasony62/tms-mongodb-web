import { SchemaIter, SchemaProp } from 'tms-vue3-ui/dist/es/json-schema'
import { DocAsArray, createField, Field } from 'tms-vue3-ui/dist/es/json-doc'
import ELK from 'elkjs'
import Debug from 'debug'

const debug = Debug('tmw:builder')

const elk = new ELK()

type FieldVNodePair = {
  field: Field
  node: any
  index?: number // 在父节点中的位置
}

type StackJoint = {
  field: Field
  childNames: string[]
  childrenIndex: number // 子节点的索引位置
  indexInParent: number //连接字段在父字段中的位置。这时节点还没有生成，所以还不能加入的到父连接字段的子节点中。
}

class Stack {
  ctx: any
  joints: StackJoint[] // 等待生成的连接节点
  fieldNames: string[] // 按字段生成VNode的顺序记录字段名称，用于调试

  constructor(ctx: any, fieldNames?: string[]) {
    this.ctx = ctx
    this.joints = []
    this.fieldNames = fieldNames ?? []
  }

  /**
   * 新的连接字段
   */
  newJoint(field: Field, parent: StackJoint | null): StackJoint {
    const joint = {
      field,
      childNames: [],
      children: [],
      childrenIndex: -1,
      indexInParent: -1,
    }
    if (parent) {
      parent.childrenIndex++
      joint.indexInParent = parent.childrenIndex
      parent.childNames.push(field.name)
    }

    this.joints.push(joint)

    return joint
  }

  pop() {
    return this.joints.pop()
  }

  /**
   * 获得属性所有的父字段
   * 从stack中查找
   */
  propParent(childProp: SchemaProp): StackJoint[] {
    const topJoints = []
    for (let joint of this.joints) {
      let { field } = joint // 上层节点的字段对象
      let isParent = false
      if (field.schemaProp.isPattern) {
        // 可选属性
        isParent = field.schemaProp.fullname === childProp.path
      } else if (childProp.isArrayItem) {
        isParent = field.schemaProp.fullname === childProp.path
      } else {
        if (childProp.path === field.fullname) {
          isParent = true
        } else if (childProp.path === field.schemaProp.fullname) {
          isParent = true
        }
      }

      if (isParent) {
        topJoints.push(joint)
        let msg = `属性【${childProp.fullname}】是`
        msg += field.fullname
          ? `字段【${field.fullname}】字段属性【${field.schemaProp.fullname}】`
          : '根字段'
        msg += `的子属性`
        debug.extend('propParent')(msg)
      }
    }

    return topJoints
  }

  /**字段只会有1个或没有父字段*/
  fieldParent(field: Field): StackJoint | undefined {
    for (let i = 0; i < this.joints.length; i++) {
      let joint = this.joints[i]
      if (field.isChildOf(joint.field)) {
        debug.extend('fieldParent')(
          `字段【${field.fullname}】是【${joint.field.fullname}】的子字段`
        )
        return joint
      }
    }
  }

  /**
   * 将创建的节点放入堆栈中的父字段
   *
   * @param atHeader 是为了解决一个属性有多个字段的情况。这多个字段是逆序加入的到父节点中的。父节点中用childrenIndex记录。有漏洞？
   */
  addNode(pair: FieldVNodePair, parent: StackJoint, atHeader = false) {
    if (!parent) return
    const log = debug.extend('addNode')
    if (typeof pair.index === 'number') {
      /**连接节点指定在父节点中的位置*/
      if (pair.index >= parent.childNames.length) {
        throw Error(
          `字段【${pair.field.fullname}】在父节点中的位置【${pair.index}】超出父节点范围【childNameslengthe=${parent.childNames.length}】`
        )
      }
      if (parent.childNames[pair.index] !== pair.field.name) {
        throw Error(
          `字段【${pair.field.fullname}】在父节点中的位置【${
            pair.index
          }】已经存在其它节点名称【${parent.childNames[pair.index]}】`
        )
      }
      createEdge(parent.field.fullname, pair.field.fullname)
      log(
        `字段【${parent.field.fullname}】在位置【${pair.index}】，更新子节点【${pair.field.fullname}】`
      )
    } else {
      createEdge(parent.field.fullname, pair.field.fullname)
      parent.childNames.push(pair.field.name)
      parent.childrenIndex++
      log(
        `字段【${parent.field.fullname}】在尾部，添加子节点【${pair.field.fullname}】`
      )
    }

    this.fieldNames.push(pair.field.fullname)
  }

  get length() {
    return this.joints.length
  }
}
/**
 *
 * @param field
 * @returns
 */
function createPropertyNode(field: Field) {
  let isRoot = field.fullname ? false : true
  let node: any = {
    id: field.fullname || 'root',
    leaf: false,
    shape: 'property-node',
    width: isRoot ? 40 : 140,
    height: 26,
    attrs: {
      label: {
        textWrap: {
          text: field.index !== -1 ? field.index : field.name,
        },
      },
    },
    data: field,
  }

  return node
}

function createValueNode(field: Field, value = '') {
  let text
  if (field.schemaType === 'json') {
    text = JSON.stringify(value)
  } else {
    text = value
  }
  let valueNode = {
    id: field.fullname + '_val',
    shape: 'value-node',
    width: 140,
    height: 26,
    attrs: {
      label: {
        textWrap: {
          text,
        },
      },
    },
    data: field,
  }
  return valueNode
}

function createEdge(sourceName: string, targetName: string) {
  let edge = {
    source: sourceName || 'root',
    target: targetName,
    shape: 'own-property-edge',
  }
  return edge
}
/**
 * 构造图的节点和边
 */
export class Builder {
  private schema
  private rawDoc
  private editDoc
  private fields = new Map()
  private fieldNames: string[] = []

  private _nodes: any[] = []
  private _edges: any[] = []

  constructor(schema: any, doc: any) {
    this.schema = schema
    this.rawDoc = doc
    this.editDoc = new DocAsArray(JSON.parse(JSON.stringify(doc)))
  }

  /**
   * 使用elk布局算法计算节点位置
   */
  async layout() {
    const elkGraph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.spacing.nodeNode': '15',
        'elk.layered.spacing.nodeNodeBetweenLayers': '60',
        'elk.layered.crossingMinimization.forceNodeModelOrder': true,
      },
      children: this._nodes.map((node: any) => {
        return { id: `${node.id}`, width: node.width, height: node.height }
      }),
      edges: this._edges.map((edge: any, index: number) => {
        return {
          id: `edge-${index}`,
          sources: [edge.source],
          targets: [edge.target],
        }
      }),
    }

    //@ts-ignore
    const { children } = await elk.layout(elkGraph)

    children?.forEach((child) => {
      const node = this._nodes.find((n: any) => n.id === child.id)
      if (node) {
        if (child.x) node.x = child.x
        if (child.y) node.y = child.y
      }
    })
  }
  /**
   * 根据字段名称获得节点插入位置
   * 放在父节点的所有后代节点之后
   *
   */
  private getInsertPosition(field: Field): number {
    let pos = -1
    for (let i = this._nodes.length - 1; i >= 0; i--) {
      let existField = this._nodes[i].data
      if (existField.fullname.indexOf(field.path.replace('[*]', '')) === 0) {
        pos = i
        break
      }
    }
    return pos
  }

  async build() {
    // 用于记录处理过程的中间数据
    let stack = new Stack({ fields: this.fields }, this.fieldNames)

    /**创建属性迭代器*/
    let iter = new SchemaIter(JSON.parse(JSON.stringify(this.schema)))

    // 依次处理JSONSchema的属性
    for (let prop of iter) {
      /**处理根节点*/
      if (prop.name === iter.rootName) {
        const rootField = this.createFieldAndNode(prop)
        const joint = stack.newJoint(rootField, null)
        debug(`----属性【${prop.fullname}】生成根字段，放入堆栈----`)
        if (prop.attrs.type === 'array') {
          debug('根节点类型是数组，需要生成items节点')
          this.createArrayItemFieldAndNode(stack, rootField, prop, joint)
        }
        continue
      }

      debug(`----属性【${prop.fullname}】开始处理----`)

      // 当前属性的父字段。如果父属性是可选属性，可能有多个父字段。
      const parentJoints = stack.propParent(prop)
      if (parentJoints.length === 0) {
        debug(`属性【${prop.fullname}】的父字段不存在，跳过`)
        continue
      } else {
        debug(`属性【${prop.fullname}】有${parentJoints.length}个父字段`)
      }

      // // 需要处理题目是否可见
      // if (false === checkPropExistIf(prop, editDoc)) {
      //   // 子字段也不能显示
      //   // 将对应数据对象的值清空
      //   continue
      // }

      if (prop.attrs.type === 'object') {
        // 对象，连接节点
        if (prop.isPattern) {
          // 属性是动态的，需要根据文档数据生成字段
          parentJoints.forEach((joint) => {
            let fields = this.createOptionalFields(prop, joint)
            debug(`属性【${prop.fullname}】生成${fields.length}个字段`)
            fields.forEach((field) => {
              this.createFieldAndNode(field, joint.field)
              stack.newJoint(field, joint)
              debug(
                `属性【${prop.fullname}】生成字段【${field.fullname}】放入堆栈`
              )
            })
          })
        } else {
          parentJoints.forEach((joint) => {
            let field = this.createFieldAndNode(prop, joint.field)
            // 创建连接节点，等待加入子节点
            stack.newJoint(field, joint)
            debug(
              `属性【${prop.fullname}】生成字段【${field.fullname}】放入堆栈`
            )
          })
        }
      } else if (prop.attrs.type === 'array') {
        // 数组，连接节点
        if (prop.isPattern) {
          parentJoints.forEach((parentJoint) => {
            let fields = this.createOptionalFields(prop, parentJoint)
            debug(`属性【${prop.fullname}】生成${fields.length}个可选字段`)
            fields.forEach((field) => {
              this.createFieldAndNode(field, parentJoint.field)
              const joint = stack.newJoint(field, parentJoint)
              this.createArrayItemFieldAndNode(stack, field, prop, joint)
            })
          })
        } else {
          parentJoints.forEach((parentJoint) => {
            let field = this.createFieldAndNode(prop, parentJoint.field)
            const joint = stack.newJoint(field, parentJoint)
            debug(
              `属性【${prop.fullname}】生成字段【${field.fullname}】放入堆栈；生成连接节点，在父节点中的位置【${joint.indexInParent}】`
            )
            this.createArrayItemFieldAndNode(stack, field, prop, joint)
          })
        }
      } else {
        // 简单类型，叶节点，生成用户输入字段，生成字段节点，放入父连接字段
        if (prop.isPattern) {
          parentJoints.forEach((joint) => {
            // 在父节点中按顺序添加
            let fields = this.createOptionalFields(prop, joint)
            debug(`属性【${prop.fullname}】生成${fields.length}个可选字段`)
            fields.forEach((field) =>
              this.createFieldAndNode(field, joint.field, true)
            )
          })
        } else {
          parentJoints.forEach((joint) => {
            this.createFieldAndNode(prop, joint.field, true)
          })
        }
      }
    }
    // 计算节点的位置
    await this.layout()

    return { nodes: this._nodes, edges: this._edges }
  }

  private createFieldAndNode(
    prop: SchemaProp | Field,
    parent?: Field,
    leaf = false
  ) {
    let field
    if (prop instanceof Field) field = prop
    //@ts-ignore
    else field = createField({ fields: this.fields }, prop, parent)

    const node = createPropertyNode(field)
    const pos = this.getInsertPosition(field)
    pos === -1 ? this._nodes.push(node) : this._nodes.splice(pos + 1, 0, node)
    // 添加到父节点到子节点的边
    if (parent) {
      let edge = createEdge(parent.fullname, field.fullname)
      this._edges.push(edge)
    }

    // 添加值节点
    if (leaf === true) {
      let val = this.editDoc.get(field.fullname)
      let valNode = createValueNode(field, val)
      pos === -1
        ? this._nodes.push(valNode)
        : this._nodes.splice(pos + 2, 0, valNode)
      let edge = createEdge(field.fullname, valNode.id)
      this._edges.push(edge)
    }

    return field
  }

  private createArrayItemFieldAndNode(
    stack: Stack,
    field: Field,
    prop: SchemaProp,
    joint: StackJoint
  ) {
    const log = debug.extend('createArrayItemNode')
    if (prop.items?.type) {
      let { fullname, items } = prop
      log(`属性【${fullname}】需要生成类型为【${items.type}】的子项目字段`)
      // 给数组属性的items生成1个模拟属性，用name=[*]表示
      let itemProp = new SchemaProp(`${fullname}`, '[*]', items.type)
      if (items.format) itemProp.attrs.format = items.format

      // 需要传递和子属性中哪些是oneOf
      itemProp.isOneOfChildren = prop.isOneOfChildren

      const itemFields = this.createArrayItemFields(field, itemProp)
      log(
        `属性【${fullname}】生成【${items.type}】类型的数组项目属性，生成【${itemFields.length}】个字段`
      )
      if ('object' === items.type) {
        if (prop.patternChildren) {
          itemProp.patternChildren = prop.patternChildren
          log(
            `属性【${fullname}】的子项目属性【${itemProp.fullname}】包含模板【${itemProp.patternChildren.length}】个字段`
          )
        }
        if (prop.isOneOfChildren)
          itemProp.isOneOfChildren = prop.isOneOfChildren
        // 复合类型，需要根据文档数据生成字段，放入堆栈
        itemFields.forEach((itemField) => {
          this.createFieldAndNode(itemField, field)
          stack.newJoint(itemField, joint)
          log(
            `属性【${fullname}】生成的字段【${itemField.fullname}】，放入堆栈`
          )
        })
      } else if ('array' === items.type) {
        // 复合类型，需要根据文档数据生成字段，放入堆栈
        itemFields.forEach((itemField) => {
          this.createFieldAndNode(itemField, field)
          stack.newJoint(itemField, joint)
          log(
            `属性【${fullname}】生成的字段【${itemField.fullname}】，放入堆栈`
          )
        })
      } else {
        // 简单类型，生成节点，放入父字段
        itemFields.forEach((itemField) => {
          this.createFieldAndNode(itemField, joint.field, true)
        })
      }
    }
  }

  /**根据文档数据生成数组项目的字段*/
  private createArrayItemFields(parentField: Field, prop: SchemaProp): Field[] {
    const log = debug.extend('createArrayItemFields')
    log(`字段【${parentField.fullname}】需要根据文档数据生成数组项目字段`)
    const fieldValue = this.editDoc.get(parentField.fullname)
    if (Array.isArray(fieldValue) && fieldValue.length) {
      let fields = fieldValue.map((val, index) => {
        // 数组中的项目需要指定索引
        const field = createField(
          // @ts-ignore
          { fields: this.fields },
          prop,
          parentField,
          index
        )
        log(
          `字段【${parentField.fullname}】根据文档数据生成数组项目字段【${field.fullname}】`
        )
        return field
      })
      log(`属性【${prop.fullname}】根据文档数据生成了${fields.length}个字段`)
      return fields
    }

    return []
  }

  /**
   * 根据文档数据生成可选属性的字段
   */
  private createOptionalFields(prop: SchemaProp, joint: StackJoint): Field[] {
    const log = debug.extend('createOptionalFields')
    /*需要根据数据对象的值决定是否生成字段和节点*/
    const fieldValue = this.editDoc.get(joint.field.fullname)
    let keys: string[] = []
    if (typeof fieldValue === 'object') {
      let re: RegExp
      try {
        re = eval(prop.name)
      } catch (e) {
        re = new RegExp(prop.name)
      }
      Object.keys(fieldValue).forEach((key) => {
        // 检查字段是否为properties中定义的字段，是否符合正则表达式
        if (joint.childNames.includes(key)) {
          log(`属性【${prop.fullname}】忽略已存在文档数据【${key}】`)
          return
        }
        if (!re.test(key)) {
          log(`属性【${prop.fullname}】忽略不匹配文档数据【${key}】`)
          return
        }
        keys.push(key)
      })
    } else {
      log(
        `属性【${prop.fullname}】的父属性【${prop.parentFullname}】的在文档中的值不是对象`
      )
    }
    if (keys.length) {
      log(`属性【${prop.fullname}】需要创建【${keys.length}】个字段`)
      let fields = keys.map((key) => {
        const field = createField(
          //@ts-ignore
          { fields: this.fields },
          prop,
          joint.field,
          -1,
          key
        )
        log(`属性【${prop.fullname}】生成字段【${field.fullname}】`)
        return field
      })
      log(`属性【${prop.fullname}】根据文档数据生成${fields.length}个字段`)
      return fields
    } else {
      log(
        `属性【${prop.fullname}】无法根据文档数据生成字段\n` +
          JSON.stringify(fieldValue, null, 2)
      )
    }

    return []
  }
}
