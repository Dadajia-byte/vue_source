import { currentInstance } from "./component";

export function provide(key, value) {
  // 子用的是父
  if (!currentInstance) return; // 必须在setup中，建立在组件基础上
  const parentProvide = currentInstance.parent?.provides;
  let provides = currentInstance.provides;
  if (parentProvide === provides) {
    // 如果当前组件的 provides 与父组件的 provides 相同（对象引用相等），说明当前组件还没有自己的 provides 对象，需要拷贝一份新的 provides 对象
    provides = currentInstance.provides = Object.create(provides);
  }
  provides[key] = value;
}

// 有点类似原型链的设计模式
// 如果没有新增的provide，当前的instance就是复用父亲的provides（引用相同），有就重新创建一个provides（继承之前的并新增继续传承下去）
// p1(a) -> p1(a) -> p2(a,b) -> p2(a,b) -> p3(a,b,c) -> p4(a,b,c,d) 这种感觉
// 然后inject就是拿对应父亲的provides中的值，后面新增的肯定拿不到，最多拿到自己的上一级

export function inject(key, defalutValue) {
  if (!currentInstance) return;
  const provides = currentInstance.parent?.provides;
  if (provides && key in provides) {
    return provides[key]; // 从父亲对的provides中取出来
  } else {
    return defalutValue; // 默认的inject
  }
}
