export default function patchStyle(el,preValue,nextValue) {
    let style = el.style;
    for(let key in nextValue) {
        style[key] = nextValue[key]; // 新样式要全部生效
    }
    if(preValue && Object.keys(preValue).length) {
        // 看以前的属性有没有，如果现在没有就删掉
        for(let key in preValue) {
            if(!nextValue[key]) {
                style[key] = null;
            }
        }
    }
}