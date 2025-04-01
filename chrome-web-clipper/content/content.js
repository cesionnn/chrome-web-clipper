// 内容脚本加载时发送就绪通知
console.log("内容抓取脚本已加载");

// 设置全局标记，防止重复处理
// 使用window对象存储全局状态，避免重复声明错误
if (typeof window.clipperIsProcessing === 'undefined') {
  window.clipperIsProcessing = false;
}

// 向background发送内容脚本加载完成的通知
try {
  chrome.runtime.sendMessage({
    action: "contentScriptReady",
    pageUrl: window.location.href
  });
} catch (e) {
  console.error("无法发送内容脚本就绪消息:", e);
}

// 报告进度的辅助函数
function reportProgress(step, total, description) {
  const percentage = Math.floor((step / total) * 100);
  console.log(`进度: ${percentage}% - ${description}`);
  
  try {
    chrome.runtime.sendMessage({
      action: "captureProgress",
      progress: {
        percentage: percentage,
        description: description
      }
    });
  } catch (e) {
    console.error("发送进度消息出错:", e);
  }
}

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("内容脚本收到消息:", message);
  
  if (message.action === "ping") {
    // 响应ping消息，用于验证脚本是否正常工作
    console.log("收到ping消息，脚本正常工作");
    sendResponse({ pong: true });
    return;
  }
  
  if (message.action === "clipPage") {
    // 立即响应，保持连接
    sendResponse({ received: true });
    
    // 防止重复处理
    if (window.clipperIsProcessing) {
      console.log("已有处理进行中，忽略请求");
      return;
    }
    
    window.clipperIsProcessing = true;
    console.log("开始抓取页面内容");
    
    // 报告进度 - 开始
    reportProgress(0, 100, "开始抓取页面内容");
    
    // 异步捕获页面内容
    capturePageContent(
      message.contentType || "auto", 
      message.cssFilters,
      message.mediaOptions,
      message.contentOptions
    )
      .then(pageContent => {
        console.log("页面内容抓取完成");
        // 报告进度 - 内容抓取完成
        reportProgress(50, 100, "页面内容抓取完成，正在处理格式转换");
        
        // 根据选择的格式处理内容
        let content = pageContent.html;
        const format = message.format || "html"; // 默认为HTML格式
        
        if (format === "markdown") {
          // 报告进度 - 开始转换Markdown
          reportProgress(55, 100, "正在转换为Markdown格式");
          content = convertToMarkdown(pageContent.html);
          reportProgress(75, 100, "Markdown转换完成");
        } else if (format === "text") {
          // 报告进度 - 开始转换纯文本
          reportProgress(55, 100, "正在转换为纯文本格式");
          content = convertToPlainText(pageContent.html);
          reportProgress(75, 100, "纯文本转换完成");
        } else {
          // HTML格式不需要转换
          reportProgress(75, 100, "HTML内容处理完成");
        }
        
        // 报告进度 - 准备下载
        reportProgress(80, 100, "正在准备下载文件");
        
        // 处理文件名 - 添加前缀和时间戳
        let filename = pageContent.title;
        
        if (message.exportOptions) {
          // 添加前缀
          if (message.exportOptions.filePrefix) {
            filename = message.exportOptions.filePrefix + "-" + filename;
          }
          
          // 添加时间戳
          if (message.exportOptions.addTimestamp) {
            const date = new Date();
            const timestamp = date.getFullYear() + 
                            ("0" + (date.getMonth() + 1)).slice(-2) + 
                            ("0" + date.getDate()).slice(-2) + "_" +
                            ("0" + date.getHours()).slice(-2) + 
                            ("0" + date.getMinutes()).slice(-2);
            filename = filename + "-" + timestamp;
          }
        }
        
        console.log("发送抓取内容到后台处理");
        // 发送到后台处理下载
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: "downloadContent",
            content: content,
            filename: filename,
            format: format
          }, response => {
            if (chrome.runtime.lastError) {
              console.error("发送到后台失败:", chrome.runtime.lastError);
              reject(new Error("发送到后台失败: " + chrome.runtime.lastError.message));
            } else if (response && response.success) {
              console.log("后台接收成功");
              // 报告进度 - 发送成功
              reportProgress(90, 100, "内容已发送，准备下载");
              resolve();
            } else {
              console.error("后台返回错误:", response);
              reject(new Error("后台处理失败"));
            }
          });
        });
      })
      .catch(error => {
        console.error("抓取页面内容失败:", error);
        chrome.runtime.sendMessage({
          action: "captureError",
          error: error.message || "未知错误"
        });
      })
      .finally(() => {
        // 无论成功或失败，都恢复标记
        window.clipperIsProcessing = false;
      });
    
    return true; // 表示将异步发送响应
  }
});

// 抓取页面内容 - 改为异步函数
async function capturePageContent(contentType, cssFilters, mediaOptions, contentOptions) {
  // 默认CSS过滤器设置
  cssFilters = cssFilters || {
    includeInlineStyles: true,
    includeExternalStyles: true,
    includeImagesStyles: true,
    includeLayoutStyles: true,
    includeFontStyles: true,
    includeColorStyles: true
  };
  
  // 默认媒体选项
  mediaOptions = mediaOptions || {
    includeImages: true,
    includeAudioVideo: true,
    includeIframes: true,
    convertImagesDataUri: false
  };
  
  // 默认内容选项
  contentOptions = contentOptions || {
    removeScripts: true,
    removeForms: false,
    removeHiddenElements: false,
    removeAds: true
  };

  console.log("使用CSS过滤选项:", cssFilters);
  console.log("使用媒体选项:", mediaOptions);
  console.log("使用内容选项:", contentOptions);
  
  // 获取页面标题
  const pageTitle = document.title;
  reportProgress(5, 100, "获取页面标题");
  
  try {
    // 创建页面内容的副本
    const clonedDocument = document.cloneNode(true);
    const docType = document.doctype;
    reportProgress(10, 100, "创建页面副本");
    
    // 处理相对路径
    fixRelativePaths(clonedDocument);
    reportProgress(15, 100, "修复相对路径");
    
    // 提取内联样式 - 改为异步，并根据过滤选项决定是否包含
    reportProgress(20, 100, "开始提取样式表");
    const styles = await extractStyles(cssFilters);
    reportProgress(30, 100, "样式表提取完成");
    
    // 创建最终HTML
    let html = "";
    
    // 添加DOCTYPE
    if (docType) {
      html += "<!DOCTYPE " + 
        docType.name + 
        (docType.publicId ? ' PUBLIC "' + docType.publicId + '"' : '') +
        (docType.systemId ? ' "' + docType.systemId + '"' : '') + '>';
    }
    
    // 开始构建HTML文档
    html += '<html>';
    
    // 添加头部信息
    html += '<head>';
    html += '<meta charset="UTF-8">';
    html += '<title>' + pageTitle + '</title>';
    
    // 添加样式
    html += '<style>' + styles + '</style>';
    
    // 从原始页面复制meta标签
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(meta => {
      if (meta.getAttribute('charset') !== 'UTF-8') { // 避免重复添加charset
        html += meta.outerHTML;
      }
    });
    
    html += '</head>';
    reportProgress(35, 100, "头部信息处理完成");
    
    // 添加正文内容
    html += '<body>';
    
    // 根据选择的内容类型获取内容
    let mainContent;
    if (contentType === "selection") {
      mainContent = getSelectedContent();
      reportProgress(40, 100, "获取选中内容");
    } else if (contentType === "full") {
      mainContent = document.body;
      reportProgress(40, 100, "获取整个页面内容");
    } else { // auto
      mainContent = findMainContent();
      reportProgress(40, 100, "自动识别主要内容");
    }
    
    // 应用CSS过滤
    applyStyleFilters(mainContent, cssFilters);
    reportProgress(42, 100, "应用样式过滤器");
    
    // 处理媒体选项
    applyMediaOptions(mainContent, mediaOptions);
    reportProgress(44, 100, "应用媒体选项");
    
    // 处理内容选项
    applyContentOptions(mainContent, contentOptions);
    reportProgress(45, 100, "应用内容选项");
    
    html += mainContent.outerHTML;
    
    html += '</body></html>';
    
    return {
      title: pageTitle,
      html: html
    };
  } catch (error) {
    console.error("抓取页面内容时出错:", error);
    throw new Error("抓取页面内容时出错: " + (error.message || "未知错误"));
  }
}

// 应用媒体选项
function applyMediaOptions(element, mediaOptions) {
  if (!element || !mediaOptions) return;
  
  // 处理图片
  if (!mediaOptions.includeImages) {
    removeImages(element);
  } else if (mediaOptions.convertImagesDataUri) {
    convertImagesToDataURI(element);
  }
  
  // 处理音频/视频
  if (!mediaOptions.includeAudioVideo) {
    removeAudioVideo(element);
  }
  
  // 处理iframe
  if (!mediaOptions.includeIframes) {
    removeIframes(element);
  }
}

// 移除图片
function removeImages(element) {
  const images = element.querySelectorAll('img');
  images.forEach(img => {
    img.parentNode.removeChild(img);
  });
}

// 将图片转换为Data URI
async function convertImagesToDataURI(element) {
  const images = element.querySelectorAll('img');
  const convertPromises = [];
  
  for (const img of images) {
    if (img.src && !img.src.startsWith('data:')) {
      try {
        const convertPromise = fetch(img.src)
          .then(response => {
            if (response.ok) {
              return response.blob();
            }
            return null;
          })
          .then(blob => {
            if (blob) {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  img.src = reader.result;
                  resolve();
                };
                reader.readAsDataURL(blob);
              });
            }
          })
          .catch(error => {
            console.error('无法将图片转换为Data URI:', img.src, error);
          });
        
        convertPromises.push(convertPromise);
      } catch (e) {
        console.error('图片转换出错:', img.src);
      }
    }
  }
  
  try {
    await Promise.all(convertPromises);
  } catch (error) {
    console.error('转换图片过程中出错:', error);
  }
}

// 移除音频/视频元素
function removeAudioVideo(element) {
  const audioVideo = element.querySelectorAll('audio, video, source');
  audioVideo.forEach(av => {
    av.parentNode.removeChild(av);
  });
}

// 移除iframe元素
function removeIframes(element) {
  const iframes = element.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    iframe.parentNode.removeChild(iframe);
  });
}

// 应用内容选项
function applyContentOptions(element, contentOptions) {
  if (!element || !contentOptions) return;
  
  // 移除脚本
  if (contentOptions.removeScripts) {
    removeScripts(element);
  }
  
  // 移除表单
  if (contentOptions.removeForms) {
    removeForms(element);
  }
  
  // 移除隐藏元素
  if (contentOptions.removeHiddenElements) {
    removeHiddenElements(element);
  }
  
  // 移除广告和评论
  if (contentOptions.removeAds) {
    removeAdsAndComments(element);
  }
}

// 移除脚本
function removeScripts(element) {
  const scripts = element.querySelectorAll('script');
  scripts.forEach(script => {
    script.parentNode.removeChild(script);
  });
  
  // 移除内联事件处理器
  const allElements = element.querySelectorAll('*');
  allElements.forEach(el => {
    const attributes = el.attributes;
    for (let i = attributes.length - 1; i >= 0; i--) {
      const attrName = attributes[i].name;
      if (attrName.startsWith('on')) {
        el.removeAttribute(attrName);
      }
    }
  });
}

// 移除表单元素
function removeForms(element) {
  const forms = element.querySelectorAll('form, input, select, textarea, button');
  forms.forEach(form => {
    form.parentNode.removeChild(form);
  });
}

// 移除隐藏元素
function removeHiddenElements(element) {
  // 使用computed style检查元素是否可见
  const allElements = element.querySelectorAll('*');
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      el.parentNode.removeChild(el);
    }
  });
  
  // 移除hidden属性的元素
  const hiddenElements = element.querySelectorAll('[hidden]');
  hiddenElements.forEach(hiddenEl => {
    hiddenEl.parentNode.removeChild(hiddenEl);
  });
}

// 移除广告和评论
function removeAdsAndComments(element) {
  // 移除常见广告和评论容器
  const selectors = [
    // 广告选择器
    '[class*="ad-"], [class*="ads-"], [class*="advertisement"], [id*="ad-"], [id*="ads-"]',
    '[data-ad], [data-ads], [data-adunit]',
    '.adsbygoogle, .ad-container, .advertisement',
    // 评论选择器
    '.comments, .comment-section, #comments, #comment-section',
    '[class*="comment-"], [id*="comment-"]',
    '.disqus_thread, .fb-comments'
  ];
  
  selectors.forEach(selector => {
    try {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => {
        el.parentNode.removeChild(el);
      });
    } catch (e) {
      console.error('移除广告或评论时出错:', e);
    }
  });
}

// 应用样式过滤
function applyStyleFilters(element, cssFilters) {
  if (!element || !cssFilters) return;
  
  // 处理行内样式
  if (!cssFilters.includeInlineStyles) {
    removeInlineStyles(element);
  }
  
  // 处理图片样式
  if (!cssFilters.includeImagesStyles) {
    removeImageStyles(element);
  }
  
  // 处理布局样式
  if (!cssFilters.includeLayoutStyles) {
    removeLayoutStyles(element);
  }
  
  // 处理字体样式
  if (!cssFilters.includeFontStyles) {
    removeFontStyles(element);
  }
  
  // 处理颜色样式
  if (!cssFilters.includeColorStyles) {
    removeColorStyles(element);
  }
}

// 移除内联样式
function removeInlineStyles(element) {
  const elements = element.querySelectorAll('*');
  elements.forEach(el => {
    el.removeAttribute('style');
  });
  element.removeAttribute('style');
}

// 移除图片样式
function removeImageStyles(element) {
  const images = element.querySelectorAll('img');
  images.forEach(img => {
    // 保留src和alt属性，移除其他样式相关属性
    const src = img.getAttribute('src');
    const alt = img.getAttribute('alt');
    
    img.removeAttribute('style');
    img.removeAttribute('class');
    img.removeAttribute('width');
    img.removeAttribute('height');
    img.removeAttribute('border');
    
    if (src) img.setAttribute('src', src);
    if (alt) img.setAttribute('alt', alt);
  });
}

// 移除布局样式
function removeLayoutStyles(element) {
  const elements = element.querySelectorAll('*');
  elements.forEach(el => {
    // 移除布局相关的class
    if (el.classList) {
      // 保留原始class名称列表
      const originalClasses = [...el.classList];
      
      // 移除可能包含layout、grid、flex等关键字的class
      originalClasses.forEach(className => {
        if (/layout|grid|flex|position|container|wrapper|row|col|float|clear|display|margin|padding/i.test(className)) {
          el.classList.remove(className);
        }
      });
    }
  });
}

// 移除字体样式
function removeFontStyles(element) {
  const elements = element.querySelectorAll('*');
  elements.forEach(el => {
    // 移除字体相关的样式
    el.style.fontFamily = '';
    el.style.fontSize = '';
    el.style.fontWeight = '';
    el.style.fontStyle = '';
    el.style.lineHeight = '';
    el.style.letterSpacing = '';
    el.style.textTransform = '';
    el.style.textDecoration = '';
    
    // 移除字体相关的class
    if (el.classList) {
      const originalClasses = [...el.classList];
      originalClasses.forEach(className => {
        if (/font|text|typography/i.test(className)) {
          el.classList.remove(className);
        }
      });
    }
  });
}

// 移除颜色样式
function removeColorStyles(element) {
  const elements = element.querySelectorAll('*');
  elements.forEach(el => {
    // 移除颜色相关的样式
    el.style.color = '';
    el.style.backgroundColor = '';
    el.style.backgroundImage = '';
    el.style.borderColor = '';
    el.style.outlineColor = '';
    el.style.fill = '';
    el.style.stroke = '';
    
    // 移除颜色相关的class
    if (el.classList) {
      const originalClasses = [...el.classList];
      originalClasses.forEach(className => {
        if (/color|bg-|background|theme/i.test(className)) {
          el.classList.remove(className);
        }
      });
    }
  });
}

// 提取页面样式 - 改为异步函数
async function extractStyles(cssFilters) {
  let styles = '';
  
  // 如果不包含任何样式，则直接返回空字符串
  if (!cssFilters.includeInlineStyles && !cssFilters.includeExternalStyles) {
    return styles;
  }
  
  // 获取内联样式表
  if (cssFilters.includeInlineStyles) {
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach(style => {
      styles += style.textContent;
    });
  }
  
  // 获取外部样式表 - 使用异步请求
  if (cssFilters.includeExternalStyles) {
    try {
      const styleLinks = document.querySelectorAll('link[rel="stylesheet"]');
      const fetchPromises = [];
      
      const totalLinks = styleLinks.length;
      let processedLinks = 0;
      
      for (const link of styleLinks) {
        if (link.href) {
          try {
            const fetchPromise = fetch(link.href)
              .then(response => {
                if (response.ok) {
                  return response.text();
                }
                return '';
              })
              .then(cssText => {
                styles += cssText;
                processedLinks++;
                
                // 报告样式表加载进度
                const progressPercentage = 20 + Math.floor((processedLinks / totalLinks) * 10);
                reportProgress(progressPercentage, 100, `加载样式表 (${processedLinks}/${totalLinks})`);
              })
              .catch(error => {
                console.error('无法加载样式表:', link.href, error);
                processedLinks++;
                return '';
              });
            
            fetchPromises.push(fetchPromise);
          } catch (e) {
            console.error('样式表请求出错:', link.href);
            processedLinks++;
          }
        }
      }
      
      // 等待所有样式表加载完成
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('加载外部样式表时出错:', error);
      // 继续处理，不要中断整个流程
    }
  }
  
  // 处理CSS过滤
  if (cssFilters) {
    // 如果不包含图片样式，移除图片相关CSS
    if (!cssFilters.includeImagesStyles) {
      styles = filterImageStyles(styles);
    }
    
    // 如果不包含布局样式，移除布局相关CSS
    if (!cssFilters.includeLayoutStyles) {
      styles = filterLayoutStyles(styles);
    }
    
    // 如果不包含字体样式，移除字体相关CSS
    if (!cssFilters.includeFontStyles) {
      styles = filterFontStyles(styles);
    }
    
    // 如果不包含颜色样式，移除颜色相关CSS
    if (!cssFilters.includeColorStyles) {
      styles = filterColorStyles(styles);
    }
  }
  
  return styles;
}

// 过滤图片相关样式
function filterImageStyles(cssText) {
  if (!cssText) return '';
  
  // 移除与图片相关的CSS规则
  return cssText.replace(/[^{]*img[^{]*\{[^}]*\}/g, '')
                .replace(/[^{]*\.(jpg|jpeg|png|gif|svg|webp)[^{]*\{[^}]*\}/gi, '');
}

// 过滤布局相关样式
function filterLayoutStyles(cssText) {
  if (!cssText) return '';
  
  // 移除布局相关的CSS属性
  const layoutProps = [
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'float', 'clear', 'z-index', 'flex', 'grid', 'box-sizing',
    'margin', 'padding', 'width', 'height', 'min-width', 'min-height',
    'max-width', 'max-height', 'overflow'
  ];
  
  let filteredCss = cssText;
  
  // 为每个布局属性创建一个正则表达式并替换
  layoutProps.forEach(prop => {
    const regex = new RegExp(`${prop}\\s*:([^;]|\\n)*;`, 'gi');
    filteredCss = filteredCss.replace(regex, '');
  });
  
  // 移除可能为空的CSS规则
  filteredCss = filteredCss.replace(/[^{]*\{\s*\}/g, '');
  
  return filteredCss;
}

// 过滤字体相关样式
function filterFontStyles(cssText) {
  if (!cssText) return '';
  
  // 移除字体相关的CSS属性
  const fontProps = [
    'font', 'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'word-spacing', 'text-align',
    'text-decoration', 'text-transform', 'white-space'
  ];
  
  let filteredCss = cssText;
  
  // 为每个字体属性创建一个正则表达式并替换
  fontProps.forEach(prop => {
    const regex = new RegExp(`${prop}\\s*:([^;]|\\n)*;`, 'gi');
    filteredCss = filteredCss.replace(regex, '');
  });
  
  return filteredCss;
}

// 过滤颜色相关样式
function filterColorStyles(cssText) {
  if (!cssText) return '';
  
  // 移除颜色相关的CSS属性
  const colorProps = [
    'color', 'background-color', 'background-image', 'border-color',
    'outline-color', 'fill', 'stroke', 'box-shadow', 'text-shadow'
  ];
  
  let filteredCss = cssText;
  
  // 为每个颜色属性创建一个正则表达式并替换
  colorProps.forEach(prop => {
    const regex = new RegExp(`${prop}\\s*:([^;]|\\n)*;`, 'gi');
    filteredCss = filteredCss.replace(regex, '');
  });
  
  return filteredCss;
}

// 获取用户选择的内容
function getSelectedContent() {
  const selection = window.getSelection();
  
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    return container;
  } else {
    // 如果没有选择，则返回主内容
    return findMainContent();
  }
}

// 查找页面主要内容
function findMainContent() {
  console.log("开始智能识别页面主要内容");
  
  // 第一步：尝试查找明确的语义化内容标签
  const semanticSelectors = [
    'article', 'main', '.article', '.post', '.entry-content', 
    '.post-content', '.article-content', '#article', '#post',
    '[itemprop="articleBody"]', '[role="main"]'
  ];
  
  for (const selector of semanticSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim().length > 100) {
      console.log("通过语义化标签找到内容:", selector);
      return element;
    }
  }
  
  // 第二步：通过内容密度分析查找主要内容区域
  const contentBlocks = findContentBlocksByDensity();
  if (contentBlocks && contentBlocks.element) {
    console.log("通过内容密度找到主要内容区域");
    return contentBlocks.element;
  }
  
  // 第三步：尝试识别常见CMS模式
  const cmsContent = findContentByCMSPattern();
  if (cmsContent) {
    console.log("通过CMS模式识别找到内容");
    return cmsContent;
  }
  
  // 第四步：回退到通用选择器
  let content = document.querySelector('.content') || 
                document.querySelector('#content') ||
                document.querySelector('.main') ||
                document.querySelector('#main');
                
  if (content && content.textContent.trim().length > 100) {
    console.log("通过通用选择器找到内容");
    return content;
  }
  
  // 如果所有方法都失败，创建一个包含可能有用内容的容器
  if (!content) {
    console.log("无法找到明确的内容区域，将提取所有有意义的内容");
    content = extractUsefulContent();
  }
  
  return content;
}

// 通过内容密度查找主要区块
function findContentBlocksByDensity() {
  // 先获取所有可能的内容容器
  const possibleContainers = document.querySelectorAll('div, section, td, main, article');
  let bestContainer = null;
  let bestScore = 0;
  
  possibleContainers.forEach(container => {
    // 跳过小区域
    if (container.offsetWidth < 200 || container.offsetHeight < 200) {
      return;
    }
    
    // 跳过导航、页脚等区域
    if (/nav|header|footer|comment|sidebar|menu|banner|ad/i.test(container.className) ||
        /nav|header|footer|comment|sidebar|menu|banner|ad/i.test(container.id)) {
      return;
    }
    
    // 计算文本密度和链接密度
    const text = container.textContent || '';
    const textLength = text.trim().length;
    const links = container.querySelectorAll('a');
    const linkTextLength = Array.from(links).reduce((sum, link) => sum + (link.textContent || '').length, 0);
    
    // 跳过文本太少的容器
    if (textLength < 200) {
      return;
    }
    
    // 计算内容得分 (文本密度高，链接密度低的区域更可能是正文)
    // 文本密度 = 文本长度 / 元素数量
    const elements = container.querySelectorAll('*').length;
    const textDensity = elements > 0 ? textLength / elements : 0;
    
    // 链接密度 = 链接文本长度 / 总文本长度
    const linkDensity = textLength > 0 ? linkTextLength / textLength : 0;
    
    // 段落密度
    const paragraphs = container.querySelectorAll('p').length;
    const paragraphDensity = elements > 0 ? paragraphs / elements : 0;
    
    // 图像数量
    const images = container.querySelectorAll('img').length;
    
    // 计算总分 (优先考虑文本密度高、链接密度中等、段落多的区域)
    let score = textDensity * 3;  // 文本密度很重要
    score -= linkDensity * 25;    // 链接密度过高通常是导航或列表
    score += paragraphDensity * 15; // 段落密度高说明是正文
    score += Math.min(images, 5) * 1; // 适量图像可能是内容的一部分
    score += (textLength / 1000) * 10; // 较长文本更可能是内容
    
    // 加分：包含特定元素
    if (container.querySelector('h1, h2, h3, blockquote, pre, table')) {
      score += 10;
    }
    
    // 减分：包含广告或特定的非内容元素
    if (container.querySelector('.ad, .ads, .advertisement, .banner')) {
      score -= 20;
    }
    
    // 保存最高分数的容器
    if (score > bestScore) {
      bestScore = score;
      bestContainer = container;
    }
  });
  
  return { element: bestContainer, score: bestScore };
}

// 识别常见CMS模式
function findContentByCMSPattern() {
  // WordPress常见模式
  const wpContent = document.querySelector('.entry-content, .post-content, .single-content, article .content');
  if (wpContent && wpContent.textContent.trim().length > 200) {
    return wpContent;
  }
  
  // 新闻网站常见模式
  const newsContent = document.querySelector('.article-body, .story-body, .article-text, .story-content');
  if (newsContent && newsContent.textContent.trim().length > 200) {
    return newsContent;
  }
  
  // 博客平台常见模式
  const blogContent = document.querySelector('.post-body, .blog-post, .blog-entry, .blogpost');
  if (blogContent && blogContent.textContent.trim().length > 200) {
    return blogContent;
  }
  
  // 通过文章与日期的组合模式查找
  const articleWithDate = document.querySelector('article time, .article time, .post time');
  if (articleWithDate) {
    let container = articleWithDate.closest('article') || articleWithDate.closest('.article') || articleWithDate.closest('.post');
    if (container && container.textContent.trim().length > 200) {
      return container;
    }
  }
  
  return null;
}

// 提取所有有用的内容到一个新容器中
function extractUsefulContent() {
  const container = document.createElement('div');
  container.className = 'extracted-content';
  
  // 添加标题
  const titleElement = document.querySelector('h1') || document.querySelector('h2');
  if (titleElement) {
    container.appendChild(titleElement.cloneNode(true));
  }
  
  // 提取所有段落，排除不太可能是内容的区域
  const paragraphs = Array.from(document.querySelectorAll('p, article, .content p, .article p, .post p, .entry p'));
  const usefulParagraphs = paragraphs.filter(p => {
    // 排除过短段落和可能的页脚、导航等
    const text = p.textContent.trim();
    const parentClassAndId = (p.parentElement.className + ' ' + p.parentElement.id).toLowerCase();
    
    return text.length > 20 &&
           !p.closest('nav') &&
           !p.closest('footer') &&
           !p.closest('header') &&
           !p.closest('.comment') &&
           !p.closest('.comments') &&
           !p.closest('.sidebar') &&
           !p.closest('.widget') &&
           !/nav|footer|header|comment|sidebar|menu|banner|ad/i.test(parentClassAndId);
  });
  
  // 添加有内容的段落到容器
  usefulParagraphs.forEach(p => {
    container.appendChild(p.cloneNode(true));
  });
  
  // 添加有内容的图片
  const images = Array.from(document.querySelectorAll('img'));
  const contentImages = images.filter(img => {
    // 排除小图标、广告图片等
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const area = width * height;
    
    return area > 10000 && // 比较大的图片
           !img.closest('nav') &&
           !img.closest('header') &&
           !img.closest('footer') &&
           !img.closest('.ad') &&
           !img.closest('.banner') &&
           !img.closest('.icon') &&
           !img.closest('.logo');
  });
  
  // 添加内容图片到容器
  contentImages.forEach(img => {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'image-container';
    imgWrapper.appendChild(img.cloneNode(true));
    container.appendChild(imgWrapper);
  });
  
  // 如果内容太少，可能没有找到足够的内容
  if (container.textContent.trim().length < 100 && container.querySelectorAll('img').length === 0) {
    console.log("无法提取足够的有用内容，回退到body");
    return document.body;
  }
  
  return container;
}

// 修复相对路径
function fixRelativePaths(doc) {
  try {
    // 修复图片路径
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
      if (img.src) {
        img.src = new URL(img.src, document.baseURI).href;
      }
    });
    
    // 修复链接路径
    const links = doc.querySelectorAll('a');
    links.forEach(link => {
      if (link.href) {
        link.href = new URL(link.href, document.baseURI).href;
      }
    });
    
    // 修复样式表路径
    const styleLinks = doc.querySelectorAll('link[rel="stylesheet"]');
    styleLinks.forEach(link => {
      if (link.href) {
        link.href = new URL(link.href, document.baseURI).href;
      }
    });
  } catch (error) {
    console.error('修复相对路径时出错:', error);
    // 继续处理，不要中断整个流程
  }
}

// 将HTML转换为Markdown - 增强版
function convertToMarkdown(html) {
  // 创建临时DOM解析HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // 开始构建Markdown文本
  let markdown = '';
  
  // 添加标题
  const title = doc.querySelector('title');
  if (title) {
    markdown += '# ' + title.textContent + '\n\n';
  }
  
  // 获取正文内容
  const content = doc.querySelector('body');
  if (content) {
    // 递归处理DOM节点
    function processNode(node, level = 0) {
      if (!node) return '';
      
      let result = '';
      const nodeType = node.nodeType;
      
      // 文本节点
      if (nodeType === Node.TEXT_NODE) {
        return node.textContent.replace(/\s+/g, ' ');
      }
      
      // 元素节点
      if (nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        // 处理标题
        if (/^h[1-6]$/.test(tagName)) {
          const level = parseInt(tagName.substring(1));
          return '\n' + '#'.repeat(level) + ' ' + getTextContent(node) + '\n\n';
        }
        
        // 处理段落
        if (tagName === 'p') {
          result = '\n';
          for (const child of node.childNodes) {
            result += processNode(child);
          }
          return result + '\n\n';
        }
        
        // 处理加粗
        if (tagName === 'strong' || tagName === 'b') {
          return '**' + getTextContent(node) + '**';
        }
        
        // 处理斜体
        if (tagName === 'em' || tagName === 'i') {
          return '*' + getTextContent(node) + '*';
        }
        
        // 处理链接
        if (tagName === 'a') {
          const href = node.getAttribute('href');
          return '[' + getTextContent(node) + '](' + href + ')';
        }
        
        // 处理图片
        if (tagName === 'img') {
          const src = node.getAttribute('src');
          const alt = node.getAttribute('alt') || '';
          return '![' + alt + '](' + src + ')';
        }
        
        // 处理列表
        if (tagName === 'ul' || tagName === 'ol') {
          result = '\n';
          // 处理嵌套列表
          function processListItems(listElement, prefix = '', depth = 0) {
            let listResult = '';
            const items = listElement.children;
            
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.tagName.toLowerCase() === 'li') {
                // 构建前缀
                let itemPrefix = prefix;
                if (listElement.tagName.toLowerCase() === 'ul') {
                  itemPrefix += '- ';
                } else {
                  itemPrefix += (i + 1) + '. ';
                }
                
                // 提取直接文本内容
                let itemText = '';
                let hasNestedList = false;
                let nestedListResult = '';
                
                for (const child of item.childNodes) {
                  if (child.nodeType === Node.TEXT_NODE) {
                    itemText += child.textContent.trim() + ' ';
                  } else if (child.nodeType === Node.ELEMENT_NODE) {
                    const childTag = child.tagName.toLowerCase();
                    if (childTag === 'ul' || childTag === 'ol') {
                      hasNestedList = true;
                      nestedListResult += processListItems(child, '  ' + prefix, depth + 1);
                    } else {
                      itemText += getTextContent(child) + ' ';
                    }
                  }
                }
                
                // 添加列表项
                listResult += itemPrefix + itemText.trim() + '\n';
                
                // 添加嵌套列表
                if (hasNestedList) {
                  listResult += nestedListResult;
                }
              }
            }
            
            return listResult;
          }
          
          result += processListItems(node);
          return result + '\n';
        }
        
        // 处理代码块
        if (tagName === 'pre') {
          const code = node.querySelector('code');
          if (code) {
            return '\n```\n' + code.textContent + '\n```\n\n';
          }
          return '\n```\n' + node.textContent + '\n```\n\n';
        }
        
        // 处理行内代码
        if (tagName === 'code' && node.parentNode.tagName.toLowerCase() !== 'pre') {
          return '`' + node.textContent + '`';
        }
        
        // 处理引用
        if (tagName === 'blockquote') {
          result = '\n';
          for (const child of node.childNodes) {
            const childResult = processNode(child);
            result += childResult.split('\n').map(line => line ? '> ' + line : '').join('\n');
          }
          return result + '\n\n';
        }
        
        // 处理表格
        if (tagName === 'table') {
          result = '\n';
          // 处理表头
          const headers = node.querySelectorAll('th');
          if (headers.length > 0) {
            result += '| ';
            for (const header of headers) {
              result += getTextContent(header) + ' | ';
            }
            result += '\n| ';
            
            // 添加分隔行
            for (let i = 0; i < headers.length; i++) {
              result += '--- | ';
            }
            result += '\n';
          }
          
          // 处理表格内容
          const rows = node.querySelectorAll('tbody tr');
          for (const row of rows) {
            result += '| ';
            const cells = row.querySelectorAll('td');
            for (const cell of cells) {
              result += getTextContent(cell) + ' | ';
            }
            result += '\n';
          }
          
          return result + '\n';
        }
        
        // 递归处理子节点
        for (const child of node.childNodes) {
          result += processNode(child);
        }
      }
      
      return result;
    }
    
    // 获取元素的文本内容
    function getTextContent(element) {
      if (!element) return '';
      
      let result = '';
      for (const child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          result += child.textContent.replace(/\s+/g, ' ');
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          // 处理特殊元素
          const tagName = child.tagName.toLowerCase();
          
          if (tagName === 'strong' || tagName === 'b') {
            result += '**' + getTextContent(child) + '**';
          } else if (tagName === 'em' || tagName === 'i') {
            result += '*' + getTextContent(child) + '*';
          } else if (tagName === 'a') {
            const href = child.getAttribute('href');
            result += '[' + getTextContent(child) + '](' + href + ')';
          } else if (tagName === 'code') {
            result += '`' + child.textContent + '`';
          } else {
            result += getTextContent(child);
          }
        }
      }
      
      return result;
    }
    
    // 处理主体内容
    markdown += processNode(content);
    
    // 清理多余空行
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
  }
  
  return markdown;
}

// 将HTML转换为纯文本
function convertToPlainText(html) {
  try {
    // 创建临时DOM解析HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 获取文本内容，保留段落结构
    let text = '';
    const paragraphs = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote');
    
    if (paragraphs.length > 0) {
      paragraphs.forEach(p => {
        text += p.textContent.trim() + '\n\n';
      });
    } else {
      // 如果没有找到任何结构化元素，则使用整个body的文本
      text = doc.body.textContent;
    }
    
    // 清理多余空行和空格
    return text.replace(/\n{3,}/g, '\n\n').trim();
  } catch (error) {
    console.error('转换为纯文本时出错:', error);
    // 简单的回退方案
    return html.replace(/<[^>]*>/g, '');
  }
} 