# chrome-session-manager
chrome插件，保存当前tab的当前状态的所有cookie，可以保存多个状态，并且可以还原，后续可以恢复到某一个状态。

### 主要用处
* 保存同一个网站的多个 session, 比如一个管理后台, 需要在不同角色之间切换。

### 原理说明
* 0. 正常情况下, 浏览器保存 cookie 都是和域名关联的, 在不同的 tab 之间访问同一个域名, cookie 的修改都会互相影响。
* 1. 一般情况下，session id 都是通过 cookie 保存
* 2. 这样，我们就可以使用插件保存当前 cookie; 手动清空 cookie，然后再登录，再保存当前 cookie 状态
* 3. 使用插件清空当前的cookie, 使用之前保存的 cookie, 就可以回到上一个状态

### 使用说明
* 0. 点击插件图标, 在弹出的框的输入框输入当前session名称(好比如用某种角色名称、或者用户名), 点击 `save` 按钮
* 1. 通过上一步, 已经保存了当前的所有 cookie, 并且现在可以在列表看到我们保存的状态名称
* 2. 我们点击右上角的 "清除当前页面所有cookie" 按钮, 清空 cookie, 注意: 不要点击退出, 否则之前保存的 session(php、java这些的session) 会失效
* 3. 这时候再刷新, 会提示登陆, 再次登陆(使用不同账号), 并且输入新的名称, 最后保存
* 4. 这时候列表保存了两个状态, 我们可以通过点击 `use` 来启用不同的状态

### 其他说明
* 0. 绿色背景表示当前正在使用的
* 1. `use`: 启用某一个历史状态
* 2. `update`: 更新当前 tab 的 cookie 到对应的状态中
* 3. `remove`: 移除某个历史状态

### 效果图
* ![主界面](https://github.com/eleven26/chrome-session-manager/blob/master/images/main.png)
* ![session列表](https://github.com/eleven26/chrome-session-manager/blob/master/images/save.png)
* ![启用状态](https://github.com/eleven26/chrome-session-manager/blob/master/images/use.png)
