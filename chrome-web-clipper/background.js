// 初始化右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "clipWebPage",
    title: "抓取此页面",
    contexts: ["page"]
  });
  
  // 监听页面加载完成事件
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
      // 只在http和https页面注入内容脚本，且确保脚本未被注入过
      if (!contentScriptTabs.has(tabId)) {
        try {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content/content.js']
          }).then(() => {
            console.log("页面加载后内容脚本注入成功:", tabId);
            contentScriptTabs.add(tabId);
          }).catch(err => {
            console.error('注入内容脚本失败:', err);
          });
        } catch (error) {
          console.error('尝试注入脚本错误:', error);
        }
      } else {
        console.log("内容脚本已存在，跳过注入:", tabId);
      }
    }
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "clipWebPage") {
    try {
      chrome.tabs.sendMessage(tab.id, { action: "clipPage" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("内容脚本可能未注入，尝试注入后再发送消息");
          // 尝试注入内容脚本，确保只注入一次
          if (!contentScriptTabs.has(tab.id)) {
            injectContentScript(tab.id, () => {
              // 注入成功后，延时发送抓取消息
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { action: "clipPage" });
              }, 500);
            });
          } else {
            console.error("内容脚本已标记为注入，但无响应，可能需要刷新页面");
            // 清除标记并重新注入
            contentScriptTabs.delete(tab.id);
            injectContentScript(tab.id, () => {
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { action: "clipPage" });
              }, 500);
            });
          }
        }
      });
    } catch (error) {
      console.error("发送右键菜单消息失败:", error);
    }
  }
});

// 存储已加载内容脚本的标签页
const contentScriptTabs = new Set();

// 标记下载状态，防止重复下载
let isDownloading = false;

// 监听来自content script和popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("接收到消息:", message);
  
  if (message.action === "downloadContent") {
    // 防止重复下载
    if (isDownloading) {
      console.log("已有下载任务正在进行，忽略此请求");
      sendResponse({ success: false, error: "已有下载正在进行" });
      return;
    }
    
    isDownloading = true;
    downloadContent(message.content, message.filename, message.format)
      .then(() => {
        // 下载成功
        notifyDownloadStatus(true);
        isDownloading = false;
      })
      .catch(error => {
        // 下载失败
        notifyDownloadStatus(false, error.message);
        isDownloading = false;
      });
    
    sendResponse({ success: true });
  } else if (message.action === "getPageContent") {
    // 将消息转发给当前活动的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        
        // 检查内容脚本是否已注入
        if (contentScriptTabs.has(tabId)) {
          console.log("内容脚本已加载，直接发送消息");
          chrome.tabs.sendMessage(tabId, { action: "clipPage" });
        } else {
          console.log("内容脚本未加载，先注入脚本");
          // 注入内容脚本
          injectContentScript(tabId, () => {
            // 注入成功后，延时发送抓取消息
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { action: "clipPage" });
            }, 500);
          });
        }
      }
    });
    return true; // 异步响应
  } else if (message.action === "captureError") {
    // 捕获来自content script的错误
    console.error("内容抓取错误:", message.error);
    // 向popup通知错误
    notifyDownloadStatus(false, message.error);
  } else if (message.action === "captureProgress") {
    // 转发进度消息到popup
    forwardProgressToPopup(message.progress);
  } else if (message.action === "initiateCapture") {
    // 处理来自popup的抓取请求
    console.log("接收到initiateCapture请求");
    
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tabId = tabs[0].id;
          const url = tabs[0].url || '';
          
          // 检查URL是否是有效页面
          if (!url || url.startsWith('chrome://') || 
              url.startsWith('chrome-extension://') ||
              url.startsWith('about:') ||
              url.startsWith('file:')) {
            console.log("不支持的页面类型:", url);
            sendResponse({ 
              success: false, 
              error: "无法在浏览器内部页面上使用此功能"
            });
            return;
          }
          
          // 检查内容脚本是否已加载
          if (contentScriptTabs.has(tabId)) {
            // 内容脚本已加载，直接发送消息
            console.log("内容脚本已加载，发送消息");
            sendClipMessage(tabId, message, sendResponse);
          } else {
            // 尝试注入内容脚本
            console.log("尝试注入内容脚本");
            injectContentScript(tabId, () => {
              // 注入成功后，延时发送消息
              setTimeout(() => {
                sendClipMessage(tabId, message, sendResponse);
              }, 1000); // 增加延迟时间到1秒
            });
          }
        } else {
          console.log("找不到活动标签页");
          sendResponse({ success: false, error: "找不到活动标签页" });
        }
      });
    } catch (err) {
      console.error("处理initiateCapture错误:", err);
      sendResponse({ success: false, error: "处理请求出错: " + err.message });
    }
    
    return true; // 保持消息通道开放，表示将异步响应
  } else if (message.action === "contentScriptReady") {
    // 记录内容脚本已加载的标签页
    if (sender.tab && sender.tab.id) {
      contentScriptTabs.add(sender.tab.id);
      console.log("内容脚本已加载到标签页:", sender.tab.id, sender.tab.url);
    }
  }
});

// 转发进度消息到popup
function forwardProgressToPopup(progress) {
  try {
    chrome.runtime.sendMessage({
      action: "captureProgress",
      progress: progress
    });
  } catch (e) {
    console.error("转发进度消息失败:", e);
  }
}

// 辅助函数：注入内容脚本
function injectContentScript(tabId, callback) {
  try {
    // 检查是否已经注入过脚本
    if (contentScriptTabs.has(tabId)) {
      console.log("内容脚本已存在，尝试通信验证");
      // 发送一个简单消息验证脚本是否正常工作
      chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("内容脚本存在但无法通信，重新注入");
          // 移除记录并重新注入
          contentScriptTabs.delete(tabId);
          executeScriptInjection(tabId, callback);
        } else {
          console.log("内容脚本正常工作，无需再次注入");
          if (callback && typeof callback === 'function') {
            callback();
          }
        }
      });
    } else {
      console.log("内容脚本不存在，开始注入");
      executeScriptInjection(tabId, callback);
    }
  } catch (error) {
    console.error("处理脚本注入时发生错误:", error);
  }
}

// 执行脚本注入的实际函数
function executeScriptInjection(tabId, callback) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content/content.js']
  }).then(() => {
    console.log("内容脚本注入成功");
    contentScriptTabs.add(tabId); // 添加到已加载集合
    
    if (callback && typeof callback === 'function') {
      callback();
    }
  }).catch(err => {
    console.error('注入内容脚本失败:', err);
  });
}

// 辅助函数：发送裁剪消息到标签页
function sendClipMessage(tabId, message, sendResponse) {
  try {
    // 转发消息到内容脚本
    console.log("发送裁剪消息到标签页:", tabId);
    chrome.tabs.sendMessage(tabId, {
      action: "clipPage",
      format: message.format,
      contentType: message.contentType,
      cssFilters: message.cssFilters || {
        includeInlineStyles: true,
        includeExternalStyles: true,
        includeImagesStyles: true,
        includeLayoutStyles: true,
        includeFontStyles: true,
        includeColorStyles: true
      },
      mediaOptions: message.mediaOptions || {
        includeImages: true,
        includeAudioVideo: true,
        includeIframes: true,
        convertImagesDataUri: false
      },
      contentOptions: message.contentOptions || {
        removeScripts: true,
        removeForms: false,
        removeHiddenElements: false,
        removeAds: true
      },
      exportOptions: message.exportOptions || {
        addTimestamp: false,
        filePrefix: ""
      }
    }, (response) => {
      // 处理响应
      if (chrome.runtime.lastError) {
        console.error("发送到内容脚本失败:", chrome.runtime.lastError);
        // 可能是内容脚本未准备好，重试一次
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            action: "clipPage",
            format: message.format,
            contentType: message.contentType,
            cssFilters: message.cssFilters || {
              includeInlineStyles: true,
              includeExternalStyles: true,
              includeImagesStyles: true,
              includeLayoutStyles: true,
              includeFontStyles: true,
              includeColorStyles: true
            },
            mediaOptions: message.mediaOptions || {
              includeImages: true,
              includeAudioVideo: true,
              includeIframes: true,
              convertImagesDataUri: false
            },
            contentOptions: message.contentOptions || {
              removeScripts: true,
              removeForms: false,
              removeHiddenElements: false,
              removeAds: true
            },
            exportOptions: message.exportOptions || {
              addTimestamp: false,
              filePrefix: ""
            }
          }, (retryResponse) => {
            if (chrome.runtime.lastError) {
              console.error("重试发送到内容脚本仍然失败:", chrome.runtime.lastError);
              sendResponse({ success: false, error: "无法与页面通信，请刷新页面后重试" });
            } else {
              console.log("重试发送成功，收到内容脚本响应:", retryResponse);
              sendResponse({ success: true });
            }
          });
        }, 500);
      } else {
        console.log("收到内容脚本响应:", response);
        sendResponse({ success: true });
      }
    });
  } catch (err) {
    console.error("发送消息出错:", err);
    sendResponse({ success: false, error: err.message });
  }
}

// 通知popup下载状态
function notifyDownloadStatus(success, errorMessage) {
  chrome.runtime.sendMessage({
    action: success ? "downloadSuccess" : "downloadError",
    error: errorMessage
  });
}

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId) => {
  // 清理已关闭标签页的记录
  contentScriptTabs.delete(tabId);
});

// 监听标签页加载完成
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      tab.url.startsWith('http') && 
      !tab.url.startsWith('chrome-extension://')) {
    // 只在http和https页面注入内容脚本
    contentScriptTabs.delete(tabId); // 移除可能存在的旧记录
    injectContentScript(tabId);
  }
});

// 下载内容为文件 - 改为Promise版本
function downloadContent(content, filename, format) {
  return new Promise((resolve, reject) => {
    // 根据格式处理内容
    let mimeType, fileExtension;
    
    switch (format) {
      case 'html':
        mimeType = 'text/html';
        fileExtension = 'html';
        break;
      case 'markdown':
        mimeType = 'text/markdown';
        fileExtension = 'md';
        break;
      case 'text':
        mimeType = 'text/plain';
        fileExtension = 'txt';
        break;
      default:
        mimeType = 'text/html';
        fileExtension = 'html';
    }
    
    // 构建文件名
    const safeFilename = filename.replace(/[^\w\u4e00-\u9fa5]+/g, '_').trim() || 'web_clip';
    const fullFilename = `${safeFilename}.${fileExtension}`;
    
    // 使用data URL代替Blob URL
    try {
      const base64Data = btoa(unescape(encodeURIComponent(content)));
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      
      // 触发下载
      chrome.downloads.download({
        url: dataUrl,
        filename: fullFilename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('下载失败:', chrome.runtime.lastError);
          reject(new Error('下载失败: ' + chrome.runtime.lastError.message));
        } else {
          console.log('下载成功，ID:', downloadId);
          resolve(downloadId);
        }
      });
    } catch (error) {
      console.error('下载过程出错:', error);
      reject(error);
    }
  });
} 