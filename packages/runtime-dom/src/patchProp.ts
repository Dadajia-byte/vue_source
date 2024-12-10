// 节点的属性操作
import patchClass from "./modules/patchClass";
import patchStyle from "./modules/patchStyle";
import patchEvent from "./modules/patchEvent";
import patchAttr from "./modules/patchAttr";
// diff

export default function patchProp(el, key, prevValue, nextValue) {
  if (key === "class") {
    return patchClass(el, nextValue);
  } else if (key === "style") {
    return patchStyle(el, prevValue, nextValue);
  } else if (/^on/.test(key)) {
    return patchEvent(el, key, nextValue);
  } else {
    return patchAttr(el, key, nextValue);
  }
}
