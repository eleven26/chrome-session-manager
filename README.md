# chrome-session-manager
chrome插件，保存当前tab的当前状态的所有cookie，可以保存多个状态，并且可以还原，后续可以恢复到某一个状态。

### 初衷
为了保存同一个网站的多个 session。

* 一般情况下，session id 都是通过 cookie 保存
* 这样，我们就可以使用插件保存当前 cookie; 手动清空 cookie，然后再登录，再保存当前 cookie
* 清空 cookie, 使用插件切回到上一次清空前的状态

### 问题
* 写完之后发现框架(laravel)的 session id 是加密的，并且在每次请求之后都会变化，而且上一次的 session id 会失效。所以目前看来是用不上了。
