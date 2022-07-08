// 将js对象转换为url参数形式
const urlEncode = (params = {}) => {
  return Object.entries(params)
    .reduce(
      (acc, curr) => `${acc}${curr[0]}=${encodeURIComponent(curr[1] ?? '')}&`,
      '?',
    )
    .slice(0, -1);
};
const get = (url, params) => {
  return new Promise((resolve) => {
    fetch(`${url}${urlEncode(params)}`).then((response) => response.json()).then((res) => resolve(res))
  })
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getTranslation') {
    get('https://fanyi-api.baidu.com/api/trans/vip/translate', message.data).then((res) => {
      sendResponse(res);
    })
  }
  return true;
});
chrome.storage.sync.get('isOpen', (res) => {
  const isOpen = res.isOpen
  chrome.action.setIcon({ path: isOpen ? './logo/logo.png': './logo/logo_gray.png' })
  if (isOpen == undefined) {
    // 初始安装
    chrome.storage.sync.set({ isOpen: true }, () => {});
  }
})
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.isOpen) {
    const isOpen = changes.isOpen.newValue
    chrome.action.setIcon({ path: isOpen ? './logo/logo.png': './logo/logo_gray.png' })
  } 
});