export default function patchAttr(el, key, value) {
  // 添加或更新属性
  if (!value) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}
