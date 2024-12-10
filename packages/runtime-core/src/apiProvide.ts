import { currentInstance } from "./component";

export function provide(key, value) {
  // 子用的是父
  if (!currentInstance) return; // 必须在setup中，建立在组件基础上
  const parentProvide = currentInstance.parent?.provides;
  let provides = currentInstance.provides;
  if (parentProvide === provides) {
    // 如果在子组件上新增了provides，需要拷贝一份全新的
    provides = currentInstance.provides = Object.create(provides);
  }
  provides[key] = value;
}

export function inject(key, defalutValue) {
  if (!currentInstance) return;
  const provides = currentInstance.parent?.provides;
  if (provides && key in provides) {
    return provides[key]; // 从父亲对的provides中取出来
  } else {
    return defalutValue; // 默认的inject
  }
}
