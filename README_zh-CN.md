# ✔[UptimeFlare](https://github.com/lyc8503/UptimeFlare)

一个更先进、无服务器、免费的正常运行时间监控和状态页面解决方案，由Cloudflare Workers提供支持，具有用户友好的界面。

<div align="right">
  <a title="en" href="README.md"><img src="https://img.shields.io/badge/-English-545759?style=for-the-badge" alt="English"></a>
  <a title="zh-CN" href="README_zh-CN.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-A31F34?style=for-the-badge" alt="简体中文">
</div>

## ⭐特性
- 开源，易于部署(在10分钟内，不需要本地工具)，并且免费
- 监控功能
 - 每隔1分钟最多检查50次
 - 来自全球超过[310个城市]的地理特定检查(https://www.cloudflare.com/network/)
 - 支持HTTP/HTTPS/TCP端口监控
 - 长达90天的正常运行时间历史记录和正常运行时间百分比跟踪
 - 可定制的请求方法，头，和HTTP(s)自定义状态码和HTTP关键字检查
 - 停机通知支持[100+通知通道](https://github.com/caronc/apprise/wiki)
 - 可定制的Webhook
 - 状态页面
 - 支持iframe引用状态页面
 - 所有类型监视器的交互式ping(响应时间)图表
 - 响应UI，适应您的系统主题
 - 可自定义状态页面
 - 使用您自己的CNAME域名

## 👀演示Demo

我的状态页面: https://uptimeflare.pages.dev/

一些截图↓

![](docs/desktop.png)

## ⚡快速入门 / 📄文档

请参考[Wiki](https://github.com/lyc8503/UptimeFlare/wiki)

## 新功能(待办事项)

- [x] 指定监听区域
- [x] 开放 TCP
- [x] 使用apprise支持多种通知渠道
- [x] ~~电报示例~~
- [x] ~~[Bark](https://bark.day.app)示例~~
- [x] ~~通过Cloudflare Email Workers发送邮件通知~~
- [x] 通过提供简单的例子来改进文档
- [x] 通知宽限期
- [ ] SSL证书检查
- [ ]Self-host Dockerfile
- [ ]事件时间线
- [x]删除旧事件
