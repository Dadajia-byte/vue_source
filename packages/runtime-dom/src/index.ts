import { nodeOps } from "./nodeOps";
import patchProp from "./patchProp";
import { createRenderer } from "@vue/runtime-core";

const renderOptions = Object.assign({ patchProp }, nodeOps); // 将节点操作和属性操作合并
// render方法采用domAPI进行渲染
export const render = (vnode, contanier) => {
  return createRenderer(renderOptions).render(vnode, contanier);
};
export * from "@vue/runtime-core";

// runtime-dom -> runtime-core -> reactivity
