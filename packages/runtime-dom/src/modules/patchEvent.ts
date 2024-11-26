function createInvoker(fn) {
    const invoker = (e) => invoker.value(e)
    invoker.value = fn;// 更改invoker中的fn，而不是重新解绑事件再重新绑定新事件
    return invoker
}
export default function patchEvent(el, name, nextValue) {
    // vue_event_invoker
    const invokers = el._vei || (el._vei = {})
    const eventName = name.slice(2).toLowerCase()
    const existingInvoker = invokers[name]; // 是否存在同名的事件绑定

    if (nextValue) {
        if (existingInvoker) { // 同名事件值替换
            existingInvoker.value = nextValue;
        } else {
            const invoker = (invokers[name] = createInvoker(nextValue));
            el.addEventListener(eventName, invoker);
        }
    } else if (existingInvoker) { // 移除旧事件（没有在新事件中）
        el.removeEventListener(eventName, existingInvoker);
        invokers[name] = undefined;
    }

}