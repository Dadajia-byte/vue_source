export * from '@vue/reactivity'
import {nodeOps} from './nodeOps'
import patchProp from './patchProp'

const renderOptions = Object.assign({patchProp},nodeOps);// 将节点操作和属性操作合并
function createRenderer(renderOptions) {
    
}