
import { NodeTypes } from "./ast";

function createParserContext(content) {
  return {
    originalSource: content, // 初始的content，永远不变
    source: content, // 字符串会不停的减少
    line: 1,
    column: 1,
    offset: 0,
  };
}
/**
 * @description 判断解析是否结束
 * @param context 解析的上下文
 * @returns 是否结束的布尔值
 */
function isEnd(context, ancestors = []) {
  const c = context.source;
  if (c.startsWith("</")) {
    // 检查是否匹配当前的开始标签
    for (let i = ancestors.length - 1; i >= 0; --i) {
      if (c.startsWith(`</${ancestors[i]}`)) {
        return true;
      }
    }
    // 如果没有匹配到，说明闭合标签不合法
    console.error(`意外的闭合标签: ${c}`);
    return true; // 停止解析
  }
  return !c; // source 为空，解析结束
}

function advancePositionMutation(context, c, endIndex) {
  let lineCount = 0; // 第几行
  let linePos = -1; // 换行的位置信息
  for (let i = 0; i < endIndex; i++) {
    if (c.charCodeAt(i) === 10) {
      lineCount++;
      linePos = i;
    }
  }
  context.offset += endIndex;
  context.line += lineCount;
  context.column =
    linePos === -1 ? context.column + endIndex : endIndex - linePos - 1;
}
/**
 * @description 截取上下文，即更新context.source
 * @param context 上下文
 * @param endIndex 截取的位置
 */
function advanceBy(context, endIndex) {
  let c = context.source;
  // 把上下文截取掉（更新source）
  advancePositionMutation(context, c, endIndex);
  context.source = c.slice(endIndex);
}
function advanceBySpaces(context) {
  const match = /^[ \t\r\n]+/.exec(context.source);
  if (match) {
    // 删除空格
    advanceBy(context, match[0].length);
  }
}
/**
 * @description 获取当前解析位置的光标信息
 * @param context 解析的上下文
 * @returns 当前光标信息
 */
function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset };
}
/**
 * @description 获取从开始到当前的位置信息
 * @param context 解析的上下文
 * @param start 开始的光标信息
 * @returns 位置信息
 */
function getSelection(context, start) {
  const end = getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  };
}

function parseAttributeValue(context) {
  let quote = context.source[0];
  const isQuoted = quote === `"` || quote === `'`; // 判断引号
  let content;
  if (isQuoted) {
    advanceBy(context, 1); // 跳过引号
    const endIndex = context.source.indexOf(quote,1); // 找到结束的位置
    content = parseTextData(context, endIndex); // 截取引号内的内容
    advanceBy(context, 1); // 跳过引号
  } else { // 没有引号的话
    content = context.source.match(/([^ \t\r\n/>])+/)[1]; // 取出内容删除内容
    advanceBy(context, content.length); // 删除取出的内容
    advanceBySpaces(context);
  }
  return content;
}


function parseAttribute(context) {
  const start = getCursor(context);
  let match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
  const name = match[0];
  let value;
  advanceBy(context, name.length);
  if(/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceBySpaces(context); // 跳过等号前面可能存在的空格
    advanceBy(context, 1); // 跳过等号
    advanceBySpaces(context); // 跳过等号后面可能存在的空格
    value = parseAttributeValue(context);
  }
  let loc = getSelection(context, start);
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: {
      type: NodeTypes.TEXT,
      content: value,
      loc
    },
    loc: getSelection(context, start)
  }
}

function parseAttributes(context) {
  const props = [];
  while(context.source.length>0 && !context.source.startsWith('>')) { // 上下文未解析完毕，并且还在标签内
    props.push(parseAttribute(context));
    advanceBySpaces(context);
  }
  return props;
}

function parseTag(context) {
  const start = getCursor(context);
  const match: any = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length); // 截取掉匹配的部分
  advanceBySpaces(context); // 截取掉空格避免 <div   /> 这种情况

  // 处理属性 <div a="1" b='1' />
  let props = parseAttributes(context);

  const isSelfClosing = context.source.startsWith("/>"); // 是否为自闭合标签
  if (isSelfClosing) {
    advanceBy(context, 2); // 是自闭合标签的话，说明只剩 />, 所以截取掉两个字符
  } else {
    advanceBy(context, 1); // 不是自闭合标签的话，说明只剩 >, 所以截取掉一个字符
  }
  return {
    type: NodeTypes.ELEMENT,
    tag,
    isSelfClosing,
    loc: getSelection(context, start),
    props,
  };
}
function parseElement(context, ancestors = []) {
  const ele: any = parseTag(context); // 解析开始标签
  ancestors.push(ele.tag); // 将当前标签加入栈
  const children = parseChildren(context, ancestors); // 递归解析子节点
  ancestors.pop(); // 子节点解析完毕后，移除当前标签

  if (context.source.startsWith("</")) {
    // 检查闭合标签是否匹配
    const endTag = parseTag(context); // 解析闭合标签
    if (endTag.tag !== ele.tag) {
      console.error(
        `标签 <${ele.tag}> 的闭合标签 </${endTag.tag}> 不匹配，位置: line ${context.line}, column ${context.column}`
      );
    }
  } else {
    console.error(`缺失 <${ele.tag}> 的闭合标签`);
  }

  (ele as any).children = children;
  (ele as any).loc = getSelection(context, ele.loc.start);
  return ele;
}

/**
 * @description 返回最短的文本内容
 * @param context 文本上下文
 * @param endIndex 距离最近的词法
 */
function parseTextData(context, endIndex) {
  const content = context.source.slice(0, endIndex);
  advanceBy(context, endIndex);
  return content;
}
/**
 * @description 解析文本
 * @param context 传入的剩余的上下文
 * @returns 返回最短的文本内容节点
 */
function parseText(context) {
  let tokens = ["<", "{{"]; // 找当前离得最近的词法
  let endIndex = context.source.length; // 先假设找不到
  for (let i = 0; i < tokens.length; i++) {
    const index = context.source.indexOf(tokens[i], 1); // 第一个肯定不用找，因为就是自己肯定是文本
    if (index !== -1 && endIndex > index) {
      // 找到并且在后面
      endIndex = index;
    }
  }
  // 0 - endIndex 为文本内容
  const content = parseTextData(context, endIndex);
  return {
    type: NodeTypes.TEXT,
    content,
  };
}
/**
 * @description 解析表达式
 * @param context 传入的剩余的上下文
 * @returns 返回表达式节点
 */
function parseInterpolation(context) {
  const start = getCursor(context);
  const closeIndex = context.source.indexOf("}}", 2); // 从第二个字符开始查找 }}
  if (closeIndex === -1) {
    throw new Error(
      `Unclosed interpolation at line ${context.line}, column ${context.column}`
    );
  }
  advanceBy(context, 2); // 跳过 {{
  const innerStart = getCursor(context);
  const innerEnd = getCursor(context);
  const rawContentLength = closeIndex - 2;
  const rawContent = context.source.slice(0, rawContentLength);
  const preTrimContent = parseTextData(context, rawContentLength);
  const content = preTrimContent.trim();
  advanceBy(context, 2); // 跳过 }}
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
      loc: getSelection(context, innerStart),
    },
    loc: getSelection(context, start),
  };
}
function parseChildren(context, ancestors = []) {
  const nodes = [] as any;
  while (!isEnd(context, ancestors)) {
    const c = context.source; // 现在解析的内容
    let node;
    if (c.startsWith("{{")) {
      // {{}}
      node = parseInterpolation(context);
    } else if (c[0] === "<") {
      // <div>
      node = parseElement(context, ancestors);
    } else {
      // 文本
      node = parseText(context);
    }

    // 有限状态机
    nodes.push(node);
  }

  // 解析完结点后可能存在很多空结点，所以需要过滤掉/压缩
  for(let i=0;i<nodes.length;i++) {
    let node = nodes[i];
    if(node.type === NodeTypes.TEXT) {
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        nodes[i] = null; // 删除空格
      } else {
        node.content = node.content.replace(/[\t\r\n\f ]+/g, ' '); // 合并空格
      }
    }
  }

  return nodes.filter(Boolean);
}
/**
 * @description 创建ast语法树的根节点
 * @param children 子节点
 * @returns ast语法树的根节点
 */
function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children,
  };
}
export function parse(template) {
  // 根据template产生一颗树 line column offset
  const context = createParserContext(template);

  return createRoot(parseChildren(context, []));
}