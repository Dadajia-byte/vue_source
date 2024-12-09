const queue = []; // 缓存当前要执行的队列
let isFlushing = false;
const resolvePromise = Promise.resolve();

// 如果在一个组件中更新多个状态 job肯定是一个
// 同时开启一个异步任务

// 目前有很多东西都没考虑，比如父子组件更新的顺序等等
export const queueJob = (job) => {
  if (!queue.includes(job)) {
    // 去重
    queue.push(job); // 让任务进入队列
  }
  if (!isFlushing) {
    isFlushing = true;
    resolvePromise.then(() => {
      isFlushing = false;
      const copy = queue.slice(0); // 拿到拷贝，以免死循环了
      queue.length = 0; // 将队列清空
      copy.forEach((job) => job()); // 执行队列中的操作
      copy.length = 0; // 清空拷贝
    });
  }
};

// 通过事件循环的机制，延迟更新操作，先走宏任务再走微任务（then里面的所有，顺便修改isFlushing状态以便下一次充能）
