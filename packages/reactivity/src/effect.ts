export function effect(fn:Function,options?) {
    // 创建一个effect，只要依赖的属性发生改变就要执行回调（类似react中的useEffect？）
    const _effect = new ReactiveEffect(fn,()=>{
        _effect.run();
    });
    _effect.run(); // 创建完成后立即执行一次
    if(options) {
        Object.assign(_effect,options); // 用用户传递的配置，覆盖默认配置
    }
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

export let activeEffect;

function preCleanEffect(effect) {
    effect._depsLength=0;
    effect._trackId++; // 每次effect执行都是id+1，如果是一个effect执行，id就是相同
}
function postCleanEffect(effect) {
    if(effect._depsLength<effect.deps.length) {
        for (let i = 0; i < effect._depsLength; i++) {
            cleanDepEffect(effect.deps[i],effect);
        }
        effect.deps.length = effect._depsLength;
    }
}
class ReactiveEffect {
    _trackId = 0; // 用于记录当前effect执行了几次
    deps = []; //用于记录存放了哪些依赖
    _running= 0; // 用于记录此时的effect是否正在执行避免递归调用
    _depsLength = 0;
    public active = true;// 默认创建的effect是响应式的
    // fn是用户编写的函数，scheduler依赖数据发生变化触发的回调函数-> run
    constructor(public fn:Function,public scheduler:Function) {
    }
    run() {
        if(!this.active) {
            return this.fn() // 不是激活的，执行后什么都不做
        }  
        let lastEffect = activeEffect;
        try {
            activeEffect = this

            // 每次effect执行前，应当将上次的依赖清空，不然会越来越多
            preCleanEffect(this.deps);
            this._running++;
            // 如果是激活的，则需要做依赖收集     
            return this.fn(); // 触发传入effect里的函数
        } finally {
            // activeEffect = undefined; // 本来想着收集完依赖之后就将这个全局变量置空，但是考虑到如果effect嵌套了，内部effect执行完就置空了，如果还有接下来的逻辑那就尴尬了收集不了剩下的依赖了
            postCleanEffect(activeEffect)
            activeEffect = lastEffect; // 将上次最后的effect保存，待此次结束后返回避免丢失
        }
    }
    stop() {
        this.active = false; // 后续实现
    }
}
function cleanDepEffect(dep,effect) {
    dep.delete(effect);
    if(dep.size==0) {
        dep.cleanup(); // 如果map为空，就清理掉这个依赖
    }
}

// 双向记忆，dep记录了收集得effect，而effect同时也记录被哪些dep所收集
// 1._trackId 用于记录执行次数（防止一个属性在effect中多次依赖收集）只收集一次
// 2.拿到上次依赖的最后一个和这次的比较
export function trackEffect(effect,dep) {
    // 需要重新去收集依赖，将不需要的依赖移除
    if(effect._trackId!==dep.get(effect)) { // 只要这个属性被收集过了就会记录这次的effect版本号，再同一次版本号内的effect再进来就会===了
        dep.set(effect,effect._trackId);// 更新id
        let oldDep = effect.deps[effect._depsLength] // 第二次或以后触发这个effects时候，看和上次触发里面的dep是不是一样的，从头开始比，不一样就记录
        if(oldDep!==dep) {
            if (oldDep) {
                // 删除老的依赖(如果有)
                cleanDepEffect(oldDep,effect);
            }
            effect.deps[effect._depsLength++] = dep;
        } else {
            effect._depsLength++;
        }
    }

}

export function triggerEffect(dep) { // 将属性里收集的所有effect依次执行
    for (const effect of dep.keys()) {
        if(!effect._running) { // 如果不是正在执行，才能执行
            if(effect.scheduler) {
                effect.scheduler(); // 执行回调函数，重新运行run
            } 
        }

    }
}