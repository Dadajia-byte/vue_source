export enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive' // 命名如此恶心的其中一个原因就是怕有些吊人给个对象的属性重了
}

export enum DirtyLevels {
    Dirty=4, // 脏值，意味着取值要运行计算属性
    NoDirty = 0, // 不脏，不允行

}