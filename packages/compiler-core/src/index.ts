// 编译主要分为三步
// 1. 解析模板：解析模板字符串，生成 AST 语法树
// 2. 优化 AST：对 AST 进行优化，例如标记静态节点、预字符化等。
// 3. 生成渲染函数：将优化后的 AST 转换为渲染函数的代码。

// codegennode，变量文字，todisplatString 元素 createElementVnode createTextVnode
// openBlock createElementBlock
// -》 字符串
import { PatchFlags } from "@vue/shared";
import { createCallExpression, NodeTypes } from "./ast";
import { parse } from "./parser"
import { TO_DISPLAY_STRING } from "./runtimeHelper";

// dom的遍历方式，一般是🌲的遍历方式，先序中序后序
// -> 元素 -> 文本 -> 文本处理后 -> 元素处理后 组件挂载流程
function transformElement(node,context) {
  // 处理元素
  if(NodeTypes.ELEMENT === node.type) {
    console.log('处理元素');
    
    return function() {
      console.log('处理元素后执行');
      
    }
  }
}

function isText(node) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION;
}

function transformText(node,context) {
  // 处理文本
  if(NodeTypes.ELEMENT === node.type || NodeTypes.ROOT === node.type) {
    console.log('处理文本');
    // 注意处理顺序，要等待子节点全部处理后，再赋值给父元素
    return function() {
      console.log('处理文本后执行');
      const children = node.children;
      let container = null;
      let hasText = false;
      for(let i=0;i<children.length;i++) {
        const child = children[i];
        if(isText(child)) {
          for(let j=i+1;j<children.length;j++) {
            const next = children[j];
            if(isText(next)) {
              hasText = true;
              if(!container) {
                container = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child]
                };
              }
              container.children.push(`+${next}`);
              children.splice(j,1);
              j--;
            } else {
              container = null;
              break;
            }
          }
        }
      }
      if(!hasText || children.length === 1) {
        return;
      }
      for(let i=0;i<children.length;i++) {
        const child = children[i];
        if(isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          const args = [];
          args.push(child);
          if (child.type !== NodeTypes.TEXT) {
            args.push(PatchFlags.TEXT);
          }
          children[i] = {
            type: NodeTypes.TEXT_CALL, // createTextVNode
            content: child,
            codegenNode: createCallExpression(context,args)// createTextVNode(内容，code)
          }
        }
      }
      
    }
  }
}

function transformExpression(node,context) {
  // 处理表达式
  if(NodeTypes.INTERPOLATION === node.type) {
    node.content.content = `_ctx.${node.content.content}`;
  }
}

function createTransformContext(root) {
  const context = {
    currentNode: root, // 当前节点
    parent: null, // 父节点
    transformNode: [
      transformElement, 
      transformText,
      transformExpression
    ],
    // createElementVnode createTextVnode toDisplayString
    helpers: new Map(), // 生成的辅助函数(使用set也行)
    helper(name) {
      let count = context.helpers.get(name) || 0;
      context.helpers.set(name, count + 1);
      return name
    }
  }
  return context;
}

function traverseNode(node,context) {
  context.currentNode = node;
  const transform = context.transformNode;
  const exits = [];
  for(let i=0;i<transform.length;i++) {
    let exit = transform[i](node,context);
    exit && exits.push(exit);
  }
  switch(node.type) {
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      for(let i=0;i<node.children.length;i++) {
        context.parent = node;
        traverseNode(node.children[i],context);
      }
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING);
      break;
  }
  context.currentNode = node; // 因为traverseNode 会将node变成子节点，所以需要重新赋值
  let i = exits.length;
  if(i>0) { // 倒序执行
    while(i--) {
      exits[i]();
    }
  }
}

function transform(ast) {
  // 类似于babel babel-traverse
  const context = createTransformContext(ast);

  traverseNode(ast,context);
  ast.helpers = [...context.helpers.keys()];
}

function compile(template: string) {
  const ast = parse(template);
  // 进行代码的转化
  transform(ast);

}

export {
  parse,
  compile
}
