import { activeEffect,trackEffect,triggerEffect } from "./effect";
const targetMap = new WeakMap(); // 存放依赖收集的关系
export const createDep = (cleanup:Function,name:string)=>{
    const dep = new Map() as any;
    dep.cleanup = cleanup;
    dep.name = name; // 自定义的，源码里没有这里用来标识用于显示是为那个属性服务的收集effect
    return dep
}

// 追踪进行收集依赖
export function track(target,key) {
    // activeEffect 有这个属性 说明这个key是在effect中访问的，没有说明是在effect之外访问的，不用收集
    if(activeEffect) {
        let depsMap = targetMap.get(target);
        if(!depsMap) {
            // 如果实现没有保存过这个proxy对象，新增
            targetMap.set(target,(depsMap = new Map()))
        }
        let dep = depsMap.get(key); // 依赖收集器
        if(!dep) {
            depsMap.set(
                key,
                dep=createDep(()=>depsMap.delete(key),key) // 后面用于清理属性
            )
        }
        trackEffect(activeEffect,dep); // 将当前的effect放入到dep（映射表）中，后续可以根据值得变化触发此dep中变化       
        console.log(targetMap);
        
    }
}
// 触发更新
export function trigger(target,key,newValue,oldVlue) {
    let depsMap = targetMap.get(target)
    if(!depsMap) { // 如果对整个对象都没有依赖直接返回
        return ;
    }
    let dep = depsMap.get(key) // 获取对应的依赖;
    if(dep) {
        // 如果确实有对应的依赖，则执行其中的effect函数
        triggerEffect(dep)
    }
}

/* 
    利用Map进行依赖收集
    Map:{obj:{属性:Map:{effect,effect,...}}}
*/