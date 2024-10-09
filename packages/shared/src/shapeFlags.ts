export enum ShapeFlags { // 对元素形状的判断
    ELEMENT = 1, // 单纯的元素
    FUNCTIONAL_COMPONENT = 1 << 1, // 函数式组件；右移一位变成0b10即2
    STATEFUL_COMPONENT = 1 << 2, // 4
    TEXT_CHILDREN = 1 << 3, // 8
    ARRAY_CHILDREN = 1 << 4, // 16
    SLOTS_CHILDREN = 1 << 5, // 32
    TELEPORT = 1 << 6, // 64
    SUSPENSE = 1 << 7, // 128
    COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, // 256
    COMPONENT_KEPT_ALIVE = 1 << 9, // 512
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}

// 1 | 8 = 9；1 & 9 = 1
// 位运算避免歧义，随意组合
// 每次创建虚拟节点，将自己的shapeFlag和children的shapeFlag进行组合