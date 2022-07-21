let isSelecting = false; // 是否正在选择文本
let transVisible = false;
let line
let content
let dic = new Map()
let user = {}
let isOpen = true // 扩展是否启用
chrome.storage.sync.get('user', (res) => {
  user = res.user
})
chrome.storage.sync.get('isOpen', (res) => {
  isOpen = res.isOpen
})
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.user) user = changes.user.newValue
  if (changes.isOpen) isOpen = changes.isOpen.newValue
});
const getNodes = (root) => {
  const nodes = []
  const excludeNodes = ['SCRIPT', 'NOSCRIPT', 'path', 'IMG', 'svg', 'I', 'STYLE', 'CODE', 'S'];
  const doNext = (next) => {
    for (let i = 0; i < next.children.length; i++) {
      var node = next.children[i];
      if (!excludeNodes.includes(node.nodeName)) {
        nodes.push(node);
        doNext(node);
      }
    }
    return nodes
  }
  return doNext(root)
}
const replaceHtml = (root) => {
  const nodes = getNodes(root)
  nodes.forEach((item) => {
    item.childNodes.forEach((subItem) => {
      const textContent = subItem.textContent;
      if (subItem.nodeType === 3 && textContent.trim() !== '') {
        const newNode = document.createElement('s')
        newNode.style.all = 'unset';
        const html = textContent.replace(/[a-zA-Z]+/g, (m) => `<s class="easy-translate" style="all: unset;">${m}</s>`)
        newNode.innerHTML = html
        item.insertBefore(newNode, subItem)
        item.removeChild(subItem)
      }
    })
  })
}
const createTrans = () => {
  line = document.createElement('s');
  line.id = 'et-line';
  document.body.appendChild(line)
  content = document.createElement('s')
  content.id = 'et-content';
  document.body.appendChild(content)
}
const updateTrans = ({ target, translation, type }) => {
  if (!content) createTrans();
  const targetRect = target.getBoundingClientRect();
  if (type === 'hover') line.style.cssText = `display: block; top: ${targetRect.bottom}px; left: ${targetRect.left}px; width: ${target.offsetWidth}px;`;
  content.innerText = translation;
  content.style.cssText = `display: block; left: ${targetRect.left}px;`;
  const dis = type === 'hover' ? 4 : 12
  content.style.top = `${targetRect.top - content.offsetHeight - dis}px`;
  if (content.getBoundingClientRect().top < 0) {
    content.style.top = `${targetRect.bottom + 10}px`
  }
  transVisible = true
}
const initParams = (q) => {
  const appid = user.appId
  const salt = Math.random()
  const secretKey = user.secretKey
  return {
    q,
    from: 'auto',
    to: 'zh',
    appid,
    salt,
    sign: MD5(`${appid}${q}${salt}${secretKey}`)
  }
}
const getTranslation = (q) => {
  return new Promise((resolve, reject) => {
    if (!user) {
      resolve('请先点击 Easy Translate 扩展图标进行配置')
      return
    }
    if (dic.has(q)) {
      // console.log('DIC', dic.get(q));
      resolve(dic.get(q))
    } else {
      chrome.runtime.sendMessage({
        type: 'getTranslation',
        data: initParams(q)
      }, (res) => {
        // console.log('NET', res);
        const dst = res.trans_result?.reduce((acc,curr) => `${acc}${curr.dst}\n`, '')
        if (dst) {
          if (!q.includes(' ')) dic.set(q, dst); // 不缓存段落
          resolve(dst)
        } else {
          reject()
        }
      });
    }
  })
}
const hideTrans = () => {
  if (line) line.style.display = 'none';
  if (content) content.style.display = 'none';
  transVisible = false;
}
// hover时提示
document.body.addEventListener('mouseover', debounce((e) => {
  if (!isOpen || isSelecting) return
  const target = e.target
  replaceHtml(target.parentNode)
  if (target.className == 'easy-translate') {
    let isHovering = true
    const hideFn = () => {
      isHovering = false
      if (line) {
        hideTrans()
      }
      target.removeEventListener('mouseout', hideFn)
    }
    target.addEventListener('mouseout', hideFn)
    getTranslation(target.innerText).then((v) => {
      if (isHovering) updateTrans({ target, translation: v, type: 'hover' })
    })
  }
}, 100))
let selectStartTime = 0; // 过滤掉click意外触发
document.body.addEventListener('mousedown', () => {
  selectStartTime = Date.now()
  isSelecting = true
  hideTrans()
})
// 选择文本后提示
document.body.addEventListener('mouseup', () => {
  if (!isOpen) return
  isSelecting = false
  if (Date.now() - selectStartTime < 500) return
  const selection = getSelection();
  const q = selection.toString();
  if (!q) return;
  getTranslation(q).then((v) => {
    updateTrans({ target: selection.getRangeAt(0), translation: v })
  })
})
window.addEventListener('scroll', () => {
  if (transVisible) hideTrans();
})