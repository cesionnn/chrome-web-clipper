# 网页内容抓取器 - 用户使用指南

<div align="center">
  <img src="../icons/icon128.png" alt="网页内容抓取器图标" width="80" />
  <p>让网页内容收藏变得简单而高效</p>
</div>

## 📖 目录

- [简介](#简介)
- [安装指南](#安装指南)
- [快速开始](#快速开始)
- [详细功能说明](#详细功能说明)
  - [导出格式](#导出格式)
  - [内容范围选项](#内容范围选项)
  - [自定义选项](#自定义选项)
- [使用场景](#使用场景)
- [高级技巧](#高级技巧)
- [常见问题解答](#常见问题解答)
- [故障排除](#故障排除)

## 🌟 简介

网页内容抓取器是一款强大的Chrome浏览器扩展，专为研究人员、学生、内容创作者和网络信息收集者设计。它能够智能地识别并保存网页内容，保留原始格式和样式，同时提供多种自定义选项，让您完全控制需要保存的内容。

本插件的核心优势在于：
- 智能识别主要内容，过滤无关元素
- 多种导出格式支持不同使用场景
- 高度自定义的内容过滤选项
- 简单直观的操作界面

无论您是需要保存研究资料、收集写作素材、存档重要信息，还是整理学习资源，这款工具都能满足您的需求。

## 💻 安装指南

### 从Chrome网上应用店安装（推荐）
*(即将上线)*

### 开发者模式安装

1. 下载最新版本的插件文件
   - 访问[项目发布页](https://github.com/yourusername/chrome-web-clipper/releases)
   - 下载最新版本的zip文件

2. 解压文件
   - 右键点击下载的zip文件
   - 选择"解压到当前文件夹"或"提取全部"
   - 记住解压后的文件夹位置

3. 在Chrome中安装
   - 打开Chrome浏览器
   - 在地址栏输入：`chrome://extensions/`
   - 开启右上角的"开发者模式"开关
   - 点击"加载已解压的扩展程序"按钮
   - 选择之前解压的文件夹
   - 成功安装后，浏览器工具栏将显示插件图标

## 🚀 快速开始

### 方法一：使用插件图标（推荐）

1. 访问您想要保存的网页
2. 点击浏览器右上角的插件图标<img src="../icons/icon16.png" width="16" style="vertical-align: middle;">
3. 在弹出的面板中选择：
   - **导出格式**：HTML、Markdown或纯文本
   - **内容范围**：智能识别、整个页面或选中内容
4. 点击"抓取当前页面"按钮
5. 在弹出的对话框中选择保存位置

### 方法二：使用右键菜单

1. 在网页任意位置右键点击
2. 从菜单中选择"抓取此页面"
3. 文件将使用默认设置保存到您的下载文件夹

## 📋 详细功能说明

### 导出格式

插件支持三种主要导出格式，每种格式适用于不同场景：

#### HTML格式 (.html)
- **特点**：最完整地保留原始网页的样式和布局
- **适用场景**：需要离线但保持原样查看网页、存档重要网页
- **优势**：支持完整的样式、图片和布局
- **注意事项**：文件可能较大，包含样式和媒体资源

#### Markdown格式 (.md)
- **特点**：结构化文本格式，易于编辑和进一步处理
- **适用场景**：需要将内容整理到笔记软件、写作素材收集
- **优势**：轻量级、易于编辑、兼容大多数笔记和写作工具
- **注意事项**：部分复杂布局可能无法完全保留

#### 纯文本格式 (.txt)
- **特点**：仅保留文字内容，去除所有格式
- **适用场景**：只需要内容文字、需要进行文本分析
- **优势**：文件最小、兼容性最好
- **注意事项**：丢失所有格式和媒体内容

### 内容范围选项

#### 智能识别
- **工作原理**：自动分析网页结构，识别主要内容区域
- **适用场景**：新闻文章、博客文章、教程等有明确主体内容的页面
- **优势**：过滤掉导航栏、侧边栏、广告等无关内容

#### 整个页面
- **工作原理**：保存完整网页，包括所有可见元素
- **适用场景**：需要完整保存整个页面布局、智能识别不准确时
- **优势**：不会遗漏任何内容

#### 选中内容
- **工作原理**：仅保存用户手动选中的内容
- **适用场景**：只需要保存页面的特定部分
- **使用方法**：先用鼠标选中需要的内容，再点击插件图标并选择"选中内容"

### 自定义选项

#### CSS样式选项
控制保留哪些样式元素：

- **包含内联样式**：保留直接在HTML元素上定义的样式
- **包含外部样式表**：加载并应用页面引用的CSS文件
- **保留图片样式**：保留图片的大小、边框等样式属性
- **保留布局样式**：保留影响页面排版的样式（如边距、填充等）
- **保留字体样式**：保留文本的字体、大小、粗细等属性
- **保留颜色样式**：保留文本颜色、背景色等颜色相关属性

#### 媒体内容选项
控制媒体元素的处理方式：

- **保留图片内容**：保存页面中的图像
- **保留音频/视频**：保留媒体播放元素
- **保留iframe内容**：保留嵌入的框架内容（如YouTube视频）
- **图片转为Data URI**：将图片转换为内嵌格式，便于离线查看

#### 内容清理选项
控制移除哪些元素：

- **移除JavaScript脚本**：删除可能影响性能或安全的脚本
- **移除表单元素**：删除输入框、按钮等交互元素
- **移除隐藏元素**：删除原页面中不可见的内容
- **移除广告和评论**：尝试识别并删除广告区域和评论区

#### 文件导出选项
自定义保存文件的命名方式：

- **添加时间戳**：在文件名中添加保存时间（格式：YYYYMMDD-HHMMSS）
- **文件名前缀**：添加自定义文本前缀到所有保存的文件名

## 📚 使用场景

### 学术研究
研究人员可以保存研究论文、数据集描述和参考资料，便于离线阅读和引用。
- **推荐设置**：Markdown格式、智能识别内容、保留图片

### 学习资料收集
学生可以保存教程、课程材料和学习资源。
- **推荐设置**：HTML格式、整个页面、启用所有CSS样式选项

### 内容创作
作家和内容创作者可以收集灵感素材和参考资料。
- **推荐设置**：Markdown格式、智能识别或选中内容

### 网页存档
保存重要网页内容，防止原网页变更或删除。
- **推荐设置**：HTML格式、整个页面、图片转为Data URI

### 数据收集
收集需要进一步处理的文本数据。
- **推荐设置**：纯文本格式、智能识别内容、移除所有非必要元素

## 🔍 高级技巧

### 捕获网页特定部分
对于结构复杂的网页，您可以先手动选择关键区域，然后使用"选中内容"选项进行精确捕获。

### 批量保存类似页面
1. 使用右键菜单快速保存多个页面
2. 将默认设置配置为最常用的选项，提高效率

### 优化保存的内容
* 对于需要编辑的内容，选择Markdown格式
* 对于需要完整保存的重要内容，选择HTML并启用"图片转为Data URI"

### 处理困难网页
某些网页可能难以正确抓取，尝试以下方法：
1. 从"智能识别"切换到"整个页面"
2. 禁用部分CSS选项，减少样式冲突
3. 使用选中内容模式手动选择重要部分

## ❓ 常见问题解答

### Q: 为什么有些网页无法正确抓取内容？
A: 复杂的动态网页（如使用大量JavaScript渲染的页面）可能难以完全捕获。尝试使用"整个页面"模式，或等待页面完全加载后再抓取。

### Q: 保存的HTML文件打开后样式丢失怎么办？
A: 确保在保存时启用了"包含内联样式"和"包含外部样式表"选项。对于某些网站，可能需要启用"图片转为Data URI"选项以保留图片。

### Q: 如何在不同设备间同步保存的内容？
A: 本插件不提供云同步功能，但您可以：
- 将保存的文件存储在云存储服务中（如Google Drive、Dropbox）
- 使用笔记软件导入保存的Markdown文件并同步

### Q: 插件会收集我的浏览数据吗？
A: 不会。本插件完全在本地运行，不会收集或上传任何用户数据。所有操作和保存的内容都只存在于您的计算机上。

## 🛠️ 故障排除

### 内容识别不准确
- **问题**：智能识别模式没有正确识别主要内容
- **解决方法**：
  - 切换到"整个页面"模式
  - 使用"选中内容"模式手动选择内容
  - 等待页面完全加载后再尝试抓取

### 样式问题
- **问题**：保存的内容丢失样式或布局混乱
- **解决方法**：
  - 确保启用了所有CSS样式选项
  - 尝试禁用"包含外部样式表"，仅保留内联样式
  - 对于复杂页面，尝试只保留必要的样式选项

### 图片无法显示
- **问题**：保存的HTML文件中图片不显示
- **解决方法**：
  - 确保"保留图片内容"选项已启用
  - 启用"图片转为Data URI"选项
  - 检查网络连接，某些图片可能需要在线加载

### 扩展无响应
- **问题**：点击插件图标或右键菜单无反应
- **解决方法**：
  - 刷新当前页面
  - 重启浏览器
  - 在扩展管理页面禁用并重新启用插件
  - 如果问题持续，尝试重新安装插件

---

## 📞 获取支持

如果您遇到本指南未涵盖的问题，或有功能建议，请通过以下方式联系我们：

- [提交问题报告](https://github.com/yourusername/chrome-web-clipper/issues)
- [项目讨论区](https://github.com/yourusername/chrome-web-clipper/discussions)

---

*最后更新日期：2025年04月01日* 