export function effect(fn:Function,options?) {
    // 创建一个effect，只要依赖的属性发生改变就要执行回调（类似react中的useEffect？）
    const _effect = new ReactiveEffect(fn,()=>{
        _effect.run();
    });
    _effect.run(); // 创建完成后立即执行一次
    return _effect;
}

export let activeEffect;
class ReactiveEffect {
    _trackId = 0; // 用于记录当前effect执行了几次
    deps = []; //用于记录存放了哪些依赖
    _depsLength = 0;
    public active = true;// 默认创建的effect是响应式的
    // fn是用户编写的函数，scheduler依赖数据发生变化触发的回调函数-> run
    constructor(public fn,public scheduler) {
    }
    run() {
        if(!this.active) {
            return this.fn() // 不是激活的，执行后什么都不做
        }  
        let lastEffect = activeEffect;
        try {
            activeEffect = this
            // 如果是激活的，则需要做依赖收集     
            return this.fn(); // 依赖手机 -> state.name state.age
        } finally {
            // activeEffect = undefined; // 本来想着收集完依赖之后就将这个全局变量置空，但是考虑到如果effect嵌套了，内部effect执行完就置空了，如果还有接下来的逻辑那就尴尬了收集不了剩下的依赖了
            activeEffect = lastEffect; // 将上次最后的effect保存，待此次结束后返回避免丢失
        }
    }
    stop() {
        this.active = false; // 后续实现
    }
}

// 双向记忆，dep记录了收集得effect，而effect同时也记录被哪些dep所收集
export function trackEffect(effect,dep) {
    dep.set(effect,effect._trackId);
    effect.deps[effect._depsLength++] = dep;
}

export function triggerEffect(dep) { // 将属性里收集的所有effect依次执行
    for (const effect of dep.keys()) {
        if(effect.scheduler) {
            effect.scheduler(); // 执行回调函数，重新运行run
        }
    }
}