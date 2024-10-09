function createInvoker(fn) {
    const invoker = (e) => invoker.value()
    invoker.value = fn;// 更改invoker中的fn，而不是重新解绑事件再重新绑定新事件
    return invoker
}
export default function patchEvent(el, name, nextValue) {
    // vue_event_invoker
    const invokers = el._vei || (el._vei = {})
    const eventName = name.slice(2).toLowerCase()
    const existingInvoker = invokers[name]; // 是否存在同名的事件绑定

    if(nextValue && existingInvoker) { // 同名事件值替换
        const invoker = (invokers[name] = createInvoker(nextValue));
        return el.addEventListener(eventName, invoker)
    } 
    if(existingInvoker) { // 移除旧事件（没有在新事件中）
        el.removeEventListener(name,existingInvoker);
        invokers[name] = undefined;
    }

}