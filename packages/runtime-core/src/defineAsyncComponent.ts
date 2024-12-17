// vue2 中异步组件的原理 和 图片懒加载异曲同工 （都是先给空值后赋值）

import { ref } from "@vue/reactivity";
import { h } from "./h";
import { isFunction } from "@vue/shared";

// vue3 中异步组件是基于状态来实现的 loaded ? h(组件) : h(空节点)
export function defineAsyncComponent(options) {
  debugger;
  if (isFunction(options)) {
    options = { loader: options };
  }
  return {
    setup() {
      const {
        loader,
        errorComponent,
        timeout,
        delay,
        loadingComponent,
        onError,
      } = options;
      const loaded = ref(false);
      const loading = ref(false);
      const error = ref(null);
      let loadingTimer = null;
      if (delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true;
        }, delay);
      }

      let Comp = null;
      let attempt = 0;
      function loadFunc() {
        attempt++;
        return loader().catch((err) => {
          // 手动处理异常
          if (onError) {
            return new Promise((resolve, reject) => {
              const retry = () => resolve(loadFunc());
              const fail = () => reject(err);
              onError(err, retry, fail, ++attempt);
            });
          } else {
            throw err;
          }
        });
      }

      loadFunc()
        .then((comp) => {
          Comp = comp;
          loaded.value = true;
        })
        .catch((err) => {
          error.value = err;
        })
        .finally(() => {
          loading.value = false;
          if (loadingTimer) {
            // 无论组件加载成功还是失败，都不需要切换成loading了
            clearTimeout(loadingTimer);
          }
        });
      if (timeout) {
        setTimeout(() => {
          error.value = true;
          throw new Error("组件加载超时");
        }, timeout);
      }
      const placeholder = h("div");

      return () => {
        if (loaded.value) {
          return h(Comp);
        } else if (error.value && errorComponent) {
          return h(errorComponent);
        } else if (loading.value && loadingComponent) {
          return h(loadingComponent);
        } else {
          return placeholder;
        }
      };
    },
  };
}
