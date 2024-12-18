import { h } from "../h";
function nextFrame(fn) {
  // requestAnimationFrame 其实不是再下一帧执行，而是放到这一帧的尾部执行
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

export function resolveTransitionProps(props) {
  /* enterFrom enterActive enterTo || leaveFrom leaveActive leaveTo */
  const {
    name = "v",
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
    onBeforeEnter,
    onEnter,
    onLeave,
  } = props;
  return {
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter(el); // 先执行外部传入的props钩子函数
      el.classList.add(enterFromClass);
      el.classList.add(enterActiveClass);
    },
    onEnter(el, done) {
      const resolve = () => {
        el.classList.remove(enterToClass);
        el.classList.remove(enterActiveClass);
        done && done();
      };
      onEnter && onEnter(el, resolve);
      // 添加后再移除，而不是马上移除, 为了动画效果应该是下一帧
      nextFrame(() => {
        // 保证动画的产生
        el.classList.remove(enterFromClass);
        el.classList.add(enterToClass);
        if (!onEnter || onEnter.length < 2) {
          el.addEventListener("transitionend", resolve); // 没有传入onEnter也保证能够执行resolve
        }
      });
    },
    onLeave(el, done) {
      const resolve = () => {
        el.classList.remove(leaveActiveClass);
        el.classList.remove(leaveToClass);
        done && done();
      };
      onLeave && onLeave(el, resolve);

      el.classList.add(leaveFromClass);
      // 不是+ 样式一 -》 样式二 -》 过渡
      // 而是+ 样式一 -》 过渡 -》 样式二
      document.body.offsetHeight; // 强制重绘
      el.classList.add(leaveActiveClass);

      nextFrame(() => {
        el.classList.remove(leaveFromClass);
        el.classList.add(leaveToClass);
        if (!onLeave || onLeave.length < 2) {
          el.addEventListener("transitionend", resolve); // 没有传入onEnter也保证能够执行resolve
        }
      });
    },
  };
}

// Transition 组件是函数式组件
export function Transition(props, { slots }) {
  // 函数式组件功能比较少，为了方便函数式组件处理属性
  // 处理属性后传递给状态组件 setup
  return h(BaseTransitionImpl, resolveTransitionProps(props), slots);
}

const BaseTransitionImpl = {
  // 真正的组件 只需要渲染的时候调用钩子就行了
  props: {
    onBeforeEnter: Function,
    onEnter: Function,
    onAfterEnter: Function,
    onEnterCancelled: Function,

    onBeforeLeave: Function,
    onLeave: Function,
    onAfterLeave: Function,
    onLeaveCancelled: Function,
  },
  setup(props, { slots }) {
    return () => {
      const vnode = slots.default && slots.default();
      // const instance = getCurrentInstance();
      if (!vnode) {
        return;
      }
      // 渲染前和渲染后
      /* const oldVal = instance.subTree;
            const newVal = vnode; */
      vnode.transition = {
        beforeEnter: props.onBeforeEnter,
        enter: props.onEnter,
        leave: props.onLeave,
      };
      return vnode;
    };
  },
};
