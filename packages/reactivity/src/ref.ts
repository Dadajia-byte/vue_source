import { isObject } from "@vue/shared";
import { activeEffect, trackEffect, triggerEffect } from "./effect";
import { createDep } from "./reactEffect";
import {toReactive} from  "./reactive"
export function ref(value) {
    return createRef(value)
}

function createRef(value) {
    return new RefImpl(value)
}

// 有点类似于使用defineProperty，利用类的getter和setter进行数据劫持，但是会和defineProperty出现一样的问题，那就是他是针对属性而非对象的，而且难以进行对对象的深度劫持（需要递归），但是使用toReactive将对象类转换为reactive，剩余单一的属性再包装成对象使用getter和setter就很合适了
class RefImpl {
    public __v_isRef = true; // 增加ref标识，和reactive一模一样，要是已经是ref就不在包装
    public _value; // 用于保存ref的值
    public dep; // 用于收集对应的effect
    constructor(public rawValue) {
        if(isObject(rawValue)) {
            this._value = toReactive(rawValue) 
        } else {
            this._value = rawValue
        }
    };
    
    get value() {
        trackRefValue(this)
        return this._value
    }   
    set value(newValue) {
        if(newValue!==this.rawValue) { // 原始值和新值不一样则替换
            this.rawValue= newValue
            this._value=newValue
            triggerRefValue(this)
        }
    }   
}


export function trackRefValue(ref) {
    if(activeEffect) {
        trackEffect(
            activeEffect,
            (ref.dep = ref.dep || createDep(()=>ref.dep=undefined,'undefined'))
        )
    }
}
export function triggerRefValue(ref) {
    let dep = ref.dep
    if(dep) {
        triggerEffect(dep) // 触发依赖更新   
    }

}

export function isRef(value) {
    return !!(value && value.__v_isRef)
}