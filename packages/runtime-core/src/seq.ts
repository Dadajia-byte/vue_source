// c d e  2 3 4
// e c d h 4 2 3 0(表示以前不存在)

// 2 3 7 6 8 4 9 11 -> 求最长递增子序列个数(贪心+二分)

/* 
    2
    2 3
    2 3 7 先暂且认为这个序列够长
    2 3 6
    2 3 6 8
    2 3 4 8 记录 4替换了6 且8之前的是6
    2 3 4 8 9
    2 3 4 8 9 11 
*/

// 实现最长递增子序列
/*
三步：
1. 当前元素和结果集最后一位比，如果大则放入
2. 二分查找找到比当前元素仅大一点的元素，如果存在，则替换
3. 前驱索引替换回去
 
 */
export const getSequence = (arr) => {
  const result = [0];
  const p = result.slice(0); // 用于存放索引
  let start;
  let end;
  let mid;
  const len = arr.length; // 数组长度
  for (let i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      // 在vue3中认为0应该是从未出现过的，需要创建的节点
      // 拿出结果集最后一项和当前做比对
      let resultLastIndex = result[result.length - 1];
      if (arr[resultLastIndex] < arrI) {
        p[i] = resultLastIndex;
        result.push(i); // 将当前的索引放入到结果集即可
        continue;
      }
    }
    start = 0;
    end = result.length - 1;
    while (start < end) {
      mid = ((start + end) / 2) | 0;
      if (arr[result[mid]] < arrI) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    if (arrI < arr[result[start]]) {
      p[i] = result[start - 1]; // 找到那个节点的前一个
      result[start] = i;
    }
    // p 为前驱节点的列表，需要根据最后一个节点做追溯
    let l = result.length - 1;
    let last = result[l - 1];
    while (l-- > 0) {
      result[l] = last;
      last = p[last];
    }
    // 需要创建一个前驱节点 进行倒序追溯
    return result;
  }
  return;
};
