import { isFunction, isObject } from "@vue/shared";
import { ReactiveEffect } from "./effect";
import { isReactive } from "./reactive";
import { isRef } from "./ref";

export function watch(source,cb,options={} as any) {
    // watchEffect也是基于doWatch实现的
    return doWatch(source,cb,options);
    // source用于收集getter，给对应的属性收集依赖，以便触发cb（schedluer）
}

// 其实watchEffect效果上就等于reactEffect，只不过中间多加了一层中转罢了；但是好像没有导出reactEffect作为一个函数，但是你可以通过使用effect，但是自定义scheduler来实现
export function watchEffect(getter,options={} as any) {
    // 没有cb就是watchEffect
    return doWatch(getter,null,options)
    // 在watchEffect中，第一个参数既作为getter的收集源，也作为触发的scheduler
}

// 控制depth已经遍历的层数
function traverse(source,depth,currentDepth=0,seen=new Set()) {
    if(!isObject(source)) {
        return source
    }
    if(depth) {
        if(currentDepth>=depth) {
            return source; 
        }
        currentDepth++; // deep属性来确认遍历层数是否ok
    }
    if(seen.has(source)) { // 放置递归遍历
        return source;
    }
    for(let key in source) {
        traverse(source[key],depth,currentDepth,seen)
    }
    return source; // 在遍历的过程中就会触发每个属性的getter
}


function doWatch(source,cb,{deep,immediate}) {
    const reactiveGetter=(source)=>traverse(source,deep===false?1:undefined)
    
    // 产生一个可以给reactiveGetter来使用的getter，需要对这个对象进行取值操作，会关联当前的reactiveEffect
    let getter;
    if(isReactive(source)) {
        getter=()=>reactiveGetter(source);
    } else if (isRef(source)) {
        getter = () => { // 考虑到ref可能是个对象，他会自动封装成reactive所以丢失getter
            const value = source.value;
            return isObject(value) ? reactiveGetter(value) : value;
        };
    } else if(isFunction(source)) {
        getter = source;
    }

    let oldValue;
    const job = ()=>{
        if(cb) {
            const newValue = effect.run(); // 这里的run是fn返回的结果，即getter的返回结果，若是source非函数则getter就是一个函数触发并返回被watch属性的getter；若是函数，则直接就是这个函数触发getter并返回自己的值作为结果（()=>xxx.abc）
            cb(newValue,oldValue);
            oldValue = newValue;
        } else { // 没有cb说明是watchEffect，所以第一个source一定是函数，且不用那种返回了所以也不需要newValue之类得了，只需要执行job也就是source函数即可
            effect.run()
        }

    }

    const effect = new ReactiveEffect(getter,job);
    if(cb) {
        if(immediate) { // 立即执行scheduler
            job();
        } else {
            oldValue = effect.run();
        }
    } else {
        effect.run()
    }

}