/**
 * 计算属性实现原理：
 * 1. 计算属性维护了一个dirty属性，默认就是true，稍微运行一次后就会将dirty变成false，并且稍后依赖值的变化会再次让dirty变为true
 * 2. 计算属性本质上返回一个不可变(触发渲染effect是通过修改依赖响应式数据->触发computed effect(内部scheduler(内部含triggerEffect触发外部渲染effect)))的ref，并且本身具有缓存（通过dirty实现）的功能
 * 3. 计算属性也是一个effect(执行fn函数)，依赖的属性(计算属性内部的响应式数据)会收集这个effect(或者说计算属性，当响应式数据变化后重新执行effect函数)，当值变化后，会让computedEffect里面的dirty变成true
 * 4. 计算属性也具有收集能力，可以收集到对应的effect，依赖的值变化后会触发effect重新执行（就像ref和reactive）
 *  
 * */
import { isFunction } from "@vue/shared";
import { ReactiveEffect } from "./effect"
import { trackRefValue, triggerRefValue } from "./ref";
class ComputedRefImpl {
    public _value;
    public effect;
    public dep;
    constructor(getter,public setter) {
        // 我们需要创建一个effect，来关注当前计算属性的dirty属性
        this.effect = new ReactiveEffect(
            ()=>getter(this._value),
            ()=>{
                // 计算属性依赖发生改变后，我们应该触发渲染effect重新执行
                triggerRefValue(this); // 依赖的属性变化后需要重新渲染，还需要将dirty变为true
            })
    }
    get value() { // 让计算属性对应effect
        // 这里需要做额外处理
        if(this.effect.dirty) {
            // 如果dirty为true，说明依赖的值发生了变化，需要重新计算
            // 初始时dirty就是true
            this._value = this.effect.run()
            // 如果当前在effect中访问计算属性，计算属性是可以收集这个effect的
            trackRefValue(this);
        }
        return this._value
    }
    set value(newValue) {
        // 这个就是ref的setter
        this.setter(newValue)
    }
}
  

export function computed(getterOrOptions) {
    let onlyGetter = isFunction(getterOrOptions);
    let getter;
    let setter;
    if(onlyGetter) {
        getter = onlyGetter;
        setter = ()=>{}
    } else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter,setter) // 计算属性ref
}
