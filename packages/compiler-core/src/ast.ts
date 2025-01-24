import { CREATE_TEXT_VNODE } from "./runtimeHelper";

// 枚举类型不赋值，默认从0开始递增
export enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION, // {{ }}
  ATTRIBUTE, // 6
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION, // {{ name }} + 'abc'
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL, // createVnode
  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION, // ()
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,
  // ssr codegen
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT,
}

export function createCallExpression(context,args) {
  let name = context.helper(CREATE_TEXT_VNODE);
  return { // createTextVNode(内容，code)
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee: name,
    arguments: args
  }
}
