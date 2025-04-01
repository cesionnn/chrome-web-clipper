// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
  console.log("Popup加载完成");
  
  // 获取界面元素
  const clipButton = document.getElementById('clip-button');
  const formatSelect = document.getElementById('format');
  const contentTypeSelect = document.getElementById('content-type');
  const statusMessage = document.getElementById('status-message');
  
  // 获取进度条相关元素
  const progressContainer = document.getElementById('progress-container');
  const progressInner = document.getElementById('progress-inner');
  const progressText = document.getElementById('progress-text');
  
  // 获取标签页和面板
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  // 获取CSS过滤选项
  const includeInlineStyles = document.getElementById('include-inline-styles');
  const includeExternalStyles = document.getElementById('include-external-styles');
  const includeImagesStyles = document.getElementById('include-images-styles');
  const includeLayoutStyles = document.getElementById('include-layout-styles');
  const includeFontStyles = document.getElementById('include-font-styles');
  const includeColorStyles = document.getElementById('include-color-styles');
  
  // 获取媒体选项
  const includeImages = document.getElementById('include-images');
  const includeAudioVideo = document.getElementById('include-audio-video');
  const includeIframes = document.getElementById('include-iframes');
  const convertImagesDataUri = document.getElementById('convert-images-data-uri');
  
  // 获取内容选项
  const removeScripts = document.getElementById('remove-scripts');
  const removeForms = document.getElementById('remove-forms');
  const removeHiddenElements = document.getElementById('remove-hidden-elements');
  const removeAds = document.getElementById('remove-ads');
  
  // 获取导出选项
  const addTimestamp = document.getElementById('add-timestamp');
  const filePrefix = document.getElementById('file-prefix');
  
  // 绑定标签页切换事件
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // 移除所有标签页的激活状态
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));
      
      // 激活当前标签页
      this.classList.add('active');
      const tabId = this.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
      
      // 保存设置
      saveSettings();
    });
  });
  
  // 检查当前标签页是否可以使用抓取功能
  checkCurrentPage();
  
  // 从存储中恢复上次的设置
  restoreSettings();
  
  // 显示进度条
  function showProgress(percentage, description) {
    progressContainer.style.display = 'block';
    progressInner.style.width = percentage + '%';
    progressText.textContent = description + ' (' + percentage + '%)';
  }
  
  // 隐藏进度条
  function hideProgress() {
    progressContainer.style.display = 'none';
    progressInner.style.width = '0%';
    progressText.textContent = '0%';
  }
  
  // 监听来自background脚本的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Popup收到消息:", message);
    
    if (message.action === "captureError") {
      hideProgress();
      statusMessage.textContent = '抓取失败: ' + message.error;
      clipButton.disabled = false;
    } else if (message.action === "downloadSuccess") {
      // 显示最终进度
      showProgress(100, '抓取完成');
      setTimeout(() => {
        hideProgress();
        statusMessage.textContent = '抓取成功，文件已下载！';
        clipButton.disabled = false;
      }, 1000); // 显示完成进度条1秒后再隐藏
    } else if (message.action === "downloadError") {
      hideProgress();
      statusMessage.textContent = '下载失败: ' + (message.error || '未知错误');
      clipButton.disabled = false;
    } else if (message.action === "captureProgress") {
      // 处理进度更新消息
      if (message.progress) {
        showProgress(
          message.progress.percentage,
          message.progress.description
        );
      }
    }
  });
  
  // 保存设置到存储
  function saveSettings() {
    const settings = {
      format: formatSelect.value,
      contentType: contentTypeSelect.value,
      activeTab: document.querySelector('.tab-button.active').getAttribute('data-tab'),
      cssFilters: {
        includeInlineStyles: includeInlineStyles.checked,
        includeExternalStyles: includeExternalStyles.checked,
        includeImagesStyles: includeImagesStyles.checked,
        includeLayoutStyles: includeLayoutStyles.checked,
        includeFontStyles: includeFontStyles.checked,
        includeColorStyles: includeColorStyles.checked
      },
      mediaOptions: {
        includeImages: includeImages.checked,
        includeAudioVideo: includeAudioVideo.checked,
        includeIframes: includeIframes.checked,
        convertImagesDataUri: convertImagesDataUri.checked
      },
      contentOptions: {
        removeScripts: removeScripts.checked,
        removeForms: removeForms.checked,
        removeHiddenElements: removeHiddenElements.checked,
        removeAds: removeAds.checked
      },
      exportOptions: {
        addTimestamp: addTimestamp.checked,
        filePrefix: filePrefix.value
      }
    };
    
    try {
      chrome.storage.local.set({ 'webClipperSettings': settings }, function() {
        console.log('设置已保存');
      });
    } catch (err) {
      console.error('保存设置出错:', err);
    }
  }
  
  // 从存储中恢复设置
  function restoreSettings() {
    try {
      chrome.storage.local.get('webClipperSettings', function(result) {
        const settings = result.webClipperSettings;
        if (settings) {
          console.log('加载已保存的设置:', settings);
          
          // 恢复基本设置
          if (settings.format) formatSelect.value = settings.format;
          if (settings.contentType) contentTypeSelect.value = settings.contentType;
          
          // 恢复活动标签页
          if (settings.activeTab) {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            const activeTabBtn = document.querySelector(`.tab-button[data-tab="${settings.activeTab}"]`);
            if (activeTabBtn) {
              activeTabBtn.classList.add('active');
              const tabPanel = document.getElementById(settings.activeTab);
              if (tabPanel) tabPanel.classList.add('active');
            }
          }
          
          // 恢复CSS过滤设置
          if (settings.cssFilters) {
            if (settings.cssFilters.hasOwnProperty('includeInlineStyles'))
              includeInlineStyles.checked = settings.cssFilters.includeInlineStyles;
              
            if (settings.cssFilters.hasOwnProperty('includeExternalStyles'))
              includeExternalStyles.checked = settings.cssFilters.includeExternalStyles;
              
            if (settings.cssFilters.hasOwnProperty('includeImagesStyles'))
              includeImagesStyles.checked = settings.cssFilters.includeImagesStyles;
              
            if (settings.cssFilters.hasOwnProperty('includeLayoutStyles'))
              includeLayoutStyles.checked = settings.cssFilters.includeLayoutStyles;
              
            if (settings.cssFilters.hasOwnProperty('includeFontStyles'))
              includeFontStyles.checked = settings.cssFilters.includeFontStyles;
              
            if (settings.cssFilters.hasOwnProperty('includeColorStyles'))
              includeColorStyles.checked = settings.cssFilters.includeColorStyles;
          }
          
          // 恢复媒体选项
          if (settings.mediaOptions) {
            if (settings.mediaOptions.hasOwnProperty('includeImages'))
              includeImages.checked = settings.mediaOptions.includeImages;
              
            if (settings.mediaOptions.hasOwnProperty('includeAudioVideo'))
              includeAudioVideo.checked = settings.mediaOptions.includeAudioVideo;
              
            if (settings.mediaOptions.hasOwnProperty('includeIframes'))
              includeIframes.checked = settings.mediaOptions.includeIframes;
              
            if (settings.mediaOptions.hasOwnProperty('convertImagesDataUri'))
              convertImagesDataUri.checked = settings.mediaOptions.convertImagesDataUri;
          }
          
          // 恢复内容选项
          if (settings.contentOptions) {
            if (settings.contentOptions.hasOwnProperty('removeScripts'))
              removeScripts.checked = settings.contentOptions.removeScripts;
              
            if (settings.contentOptions.hasOwnProperty('removeForms'))
              removeForms.checked = settings.contentOptions.removeForms;
              
            if (settings.contentOptions.hasOwnProperty('removeHiddenElements'))
              removeHiddenElements.checked = settings.contentOptions.removeHiddenElements;
              
            if (settings.contentOptions.hasOwnProperty('removeAds'))
              removeAds.checked = settings.contentOptions.removeAds;
          }
          
          // 恢复导出选项
          if (settings.exportOptions) {
            if (settings.exportOptions.hasOwnProperty('addTimestamp'))
              addTimestamp.checked = settings.exportOptions.addTimestamp;
              
            if (settings.exportOptions.hasOwnProperty('filePrefix'))
              filePrefix.value = settings.exportOptions.filePrefix;
          }
        }
      });
    } catch (err) {
      console.error('恢复设置出错:', err);
    }
  }
  
  // 监听设置变化，保存设置
  formatSelect.addEventListener('change', saveSettings);
  contentTypeSelect.addEventListener('change', saveSettings);
  
  // CSS过滤选项监听
  includeInlineStyles.addEventListener('change', saveSettings);
  includeExternalStyles.addEventListener('change', saveSettings);
  includeImagesStyles.addEventListener('change', saveSettings);
  includeLayoutStyles.addEventListener('change', saveSettings);
  includeFontStyles.addEventListener('change', saveSettings);
  includeColorStyles.addEventListener('change', saveSettings);
  
  // 媒体选项监听
  includeImages.addEventListener('change', saveSettings);
  includeAudioVideo.addEventListener('change', saveSettings);
  includeIframes.addEventListener('change', saveSettings);
  convertImagesDataUri.addEventListener('change', saveSettings);
  
  // 内容选项监听
  removeScripts.addEventListener('change', saveSettings);
  removeForms.addEventListener('change', saveSettings);
  removeHiddenElements.addEventListener('change', saveSettings);
  removeAds.addEventListener('change', saveSettings);
  
  // 导出选项监听
  addTimestamp.addEventListener('change', saveSettings);
  filePrefix.addEventListener('input', saveSettings);
  
  // 按钮点击事件
  clipButton.addEventListener('click', function() {
    // 获取用户选择的选项
    const format = formatSelect.value;
    const contentType = contentTypeSelect.value;
    
    // 获取CSS过滤选项
    const cssFilters = {
      includeInlineStyles: includeInlineStyles.checked,
      includeExternalStyles: includeExternalStyles.checked,
      includeImagesStyles: includeImagesStyles.checked,
      includeLayoutStyles: includeLayoutStyles.checked,
      includeFontStyles: includeFontStyles.checked,
      includeColorStyles: includeColorStyles.checked
    };
    
    // 获取媒体选项
    const mediaOptions = {
      includeImages: includeImages.checked,
      includeAudioVideo: includeAudioVideo.checked,
      includeIframes: includeIframes.checked,
      convertImagesDataUri: convertImagesDataUri.checked
    };
    
    // 获取内容选项
    const contentOptions = {
      removeScripts: removeScripts.checked,
      removeForms: removeForms.checked,
      removeHiddenElements: removeHiddenElements.checked,
      removeAds: removeAds.checked
    };
    
    // 获取导出选项
    const exportOptions = {
      addTimestamp: addTimestamp.checked,
      filePrefix: filePrefix.value
    };
    
    // 显示抓取中状态
    statusMessage.textContent = '正在抓取内容...';
    clipButton.disabled = true;
    
    // 显示初始进度
    showProgress(0, '准备抓取内容');
    
    console.log("发送抓取请求，格式:", format, "内容类型:", contentType);
    
    // 直接通过background脚本处理抓取
    try {
      chrome.runtime.sendMessage({
        action: "initiateCapture",
        format: format,
        contentType: contentType,
        cssFilters: cssFilters,
        mediaOptions: mediaOptions,
        contentOptions: contentOptions,
        exportOptions: exportOptions
      }, function(response) {
        console.log("收到响应:", response);
        
        if (chrome.runtime.lastError) {
          console.error("通信错误:", chrome.runtime.lastError);
          hideProgress();
          statusMessage.textContent = '通信错误: ' + chrome.runtime.lastError.message;
          clipButton.disabled = false;
          return;
        }
        
        if (!response || !response.success) {
          hideProgress();
          statusMessage.textContent = response && response.error ? 
            response.error : '启动抓取失败，请重试！';
          clipButton.disabled = false;
        } else {
          // 处理是异步的，通过监听消息处理进度和最终结果
          
          // 设置超时，如果20秒内没有完成，则显示错误
          setTimeout(() => {
            if (progressContainer.style.display !== 'none' && 
                parseInt(progressInner.style.width) < 100) {
              hideProgress();
              statusMessage.textContent = '抓取超时，请重试！';
              clipButton.disabled = false;
            }
          }, 20000);
        }
      });
    } catch (err) {
      console.error("发送消息出错:", err);
      hideProgress();
      statusMessage.textContent = '发送请求失败: ' + err.message;
      clipButton.disabled = false;
    }
  });
  
  // 检查当前页面是否可以使用抓取功能
  function checkCurrentPage() {
    console.log("检查当前页面");
    
    statusMessage.textContent = '正在检查页面兼容性...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs.length > 0) {
        const currentUrl = tabs[0].url || '';
        console.log("当前页面URL:", currentUrl);
        
        // 检查是否是Chrome内部页面或其他不能抓取的页面
        if (!currentUrl || currentUrl.startsWith('chrome://') || 
            currentUrl.startsWith('chrome-extension://') ||
            currentUrl.startsWith('about:') ||
            currentUrl.startsWith('file:')) {
          
          console.log("不支持的页面类型");
          statusMessage.textContent = '此页面不支持内容抓取';
          clipButton.disabled = true;
          
          // 更改界面状态，显示不支持信息
          formatSelect.disabled = true;
          contentTypeSelect.disabled = true;
        } else {
          // 正常页面，恢复界面状态
          console.log("支持的页面类型");
          statusMessage.textContent = '';
          clipButton.disabled = false;
          formatSelect.disabled = false;
          contentTypeSelect.disabled = false;
        }
      } else {
        console.log("无法获取当前标签页");
        statusMessage.textContent = '无法获取当前页面信息';
        clipButton.disabled = true;
      }
    });
  }
}); 