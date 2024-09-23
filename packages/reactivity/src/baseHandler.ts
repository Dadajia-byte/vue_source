import { track,trigger } from "./reactEffect";
export enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive' // 命名如此恶心的其中一个原因就是怕有些吊人给个对象的属性重了
}


export const mutableHandlers:ProxyHandler<any> = {
    get(target,key,recevier){ // receiver 是生成的代理对象
        if(key ===ReactiveFlags.IS_REACTIVE) {
            return true;
        }
        // 当取值的时候，应该让响应式属性 和 effect 映射起来
        
        // 依赖收集 todo...
        track(target,key) // 收集这个对象上的属性，和effect关联到一起
        // return target[key] 这样写有问题，如果是个函数里面有调用this，这时this指向的普通对象而不是代理后的对象，此时里面的this.属性不会触发get
        return Reflect.get(target,key,recevier)
    },
    set(target,key,value,recevier){
        
        // 找到属性 让对应的 effect 重新执行
        let oldVlue = target[key]; // 老值
        let result= Reflect.set(target,key,value,recevier)
        if(oldVlue!==value) { // 老值和新值不同，触发重新更新
            trigger(target,key,value,oldVlue)
        }
        // 触发更新
        
        return result
    }
}
