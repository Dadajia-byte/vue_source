import {
  currentInstance,
  setCurrentInstance,
  unsetCurrentInstance,
} from "./component";
export const enum Lifecycle {
  BEFORE_MOUNT = "bm",
  MOUNTED = "m",
  BEFORE_UPDATE = "bu",
  UPDATED = "u",
}

function createHook(type: Lifecycle) {
  // 利用闭包将当前的实例存在此钩子中
  return (hook, target = currentInstance) => {
    if (target) {
      // 发布订阅。看当前钩子是否存放过
      const hooks = target[type] || (target[type] = []);
      // 让currentInstance存到这个钩子里
      const wrapHook = () => {
        // 这样这个钩子内部的instance就是正确的instance
        setCurrentInstance(target);
        hook.call(target);
        unsetCurrentInstance();
      };

      // 在执行函数内部确认实例是正确的
      hooks.push(wrapHook); // 这里有坑因为setup执行完毕之后就会将instance置空
    }
  };
}

// m-> [fn,fn,....]
// 柯里化的思想，通过传入不同的参数，返回不同的函数
export const onBeforeMount = createHook(Lifecycle.BEFORE_MOUNT);
export const onMounted = createHook(Lifecycle.MOUNTED);
export const onBeforeUpdate = createHook(Lifecycle.BEFORE_UPDATE);
export const onUpdated = createHook(Lifecycle.UPDATED);

export function invokeArrayFns(fns) {
  fns.forEach((fn) => fn());
}
