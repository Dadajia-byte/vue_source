// 节点的dom操作

export const nodeOps = {
  // 创建元素
  createElement(tag) {
    return document.createElement(tag)
  },
  // 创建文本节点
  createText(text) {
    return document.createTextNode(text)
  },
// 设置文本
  setText(node, text) {
    node.nodeValue = text
  },
  // 设置元素文本
  setElementText(node, text) {
    node.textContent = text
  },
  // 插入节点
  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor||null)
  },
  // 删除节点
  remove(child) {
    const parent = child.parentNode
    if (parent) { // 根节点无法移除
      parent.removeChild(child)
    }
  },
  parentNode(node) {
    return node.parentNode
  },
  nextSibling(node) {
    return node.nextSibling
  },
  // ...还有几个不常用就先不写了

}