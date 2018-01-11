$(function () {
    let name = '';
    action(loadAll);

    let methods = {
        remove: remove,
        save: save,
        use: use,
        update: update,
        clear: clear
    };

    ['remove', 'save', 'use', 'update', 'clear'].map(function (class_name) {
        $(document).on('click', '.' + class_name, function () {
            if (class_name === 'save') {
                name = $(this).siblings('input').val();
            } else {
                name = $(this).siblings('span').html();
            }
            action(methods[class_name]);
        });
    });

    /**
     * 清除当前域名当前tab的所有 cookie
     * @param {object} url
     * @param {boolean} alert
     */
    function clear(url, alert = true) {
        chrome.cookies.getAll({ domain: url.host }, function (cookies) {
            cookies.map(function (cookie) {
                chrome.cookies.remove({url: url.origin, name: cookie.name}, function () {});
            });
            if (alert) alertSuccess('清除成功!');
        });
    }

    /**
     * 提示成功消息
     * @param {string} msg
     */
    function alertSuccess(msg) {
        $('.alert').html(msg).css('opacity', 1).css('color', 'green');
        setTimeout(function () {
            $('.alert').css('opacity', 0);
        }, 1000);
    }

    /**
     * 提示失败信息
     * @param {string} msg
     */
    function alertError(msg) {
        $('.alert').html(msg).css('opacity', 1).css('color', 'red');
        setTimeout(function () {
            $('.alert').css('opacity', 0);
        }, 1000);
    }

    /**
     * 使用历史某一个状态
     * @param {object} url
     */
    function use(url) {
        // 先清空原有的 cookie
        clear(url);

        getCookiesByName(url, function (storage_cookies) {
            if (storage_cookies[name].hasOwnProperty('list')) {
                setHighlight(storage_cookies, name);
                storage_cookies[name]['list'].map(function (cookie) {
                    // 设置 storage 存储的 cookie 到当前 tab 的域名中
                    chrome.cookies.set(cookie, function () {});
                });

                let obj = {};
                obj[url.host] = storage_cookies;
                chrome.storage.local.set(obj, function () {
                    alertSuccess('启用成功!');
                });
            }
        });
    }

    /**
     * 根据 url 中的域名获取当前 name 对应的 cookie 对象
     * @param {object} url
     * @param {function} callback 获取 cookie 之后的回调
     * @return {object}
     *      {
     *          'list': [cookie, ...]
     *          'highlight': 1
     *      }
     */
    function getCookiesByName(url, callback) {
        let domain = url.host;
        chrome.storage.local.get(domain, function (storage_cookies) {
            storage_cookies = storage_cookies || {};
            if (storage_cookies.hasOwnProperty(domain)) {
                storage_cookies = storage_cookies[domain];
            }
            if (storage_cookies.hasOwnProperty(name)) {
                callback(storage_cookies);
            }
        });
    }

    /**
     * 设置当前使用的session高亮, 同时取消其他的高亮状态
     * @param {object} storage_cookies
     * @param {string} name
     */
    function setHighlight(storage_cookies, name) {
        highlightLine(name);
        for (let key in storage_cookies) {
            if (storage_cookies.hasOwnProperty(key)) {
                storage_cookies[key].highlight = (key === name) ? 1 : 0;
            }
        }
    }

    /**
     * 移除session
     * @param {object} url
     */
    function remove(url) {
        if (!name) return;
        let domain = url.host;
        chrome.storage.local.get(domain, function (storage_cookies) {
            storage_cookies = storage_cookies || {};
            if (storage_cookies.hasOwnProperty(domain)) {
                storage_cookies = storage_cookies[domain];
            }
            if (storage_cookies.hasOwnProperty(name)) {
                delete storage_cookies[name]; // variable can not use dot operator
                let obj = {};
                obj[domain] = storage_cookies;
                chrome.storage.local.set(obj, function () {
                    removeLine(name);
                    alertSuccess('删除成功!');
                });
            }
        });
    }

    /**
     * 获取当前页面的所有cookie，保存到高亮的session中
     * @param {string} url
     * @param {function} callback
     */
    function update(url, callback) {
        save(url, function () {
            alertSuccess('更新成功!');
        });
    }

    /**
     * 保存当前页面的所有cookie
     * @param {object} url
     * @param {function} callback
     */
    function save(url, callback = null) {
        if (!name) return;
        let reg = new RegExp('^[\u4e00-\u9fa5_a-zA-Z0-9]+$');
        if (!name.match(reg)) {
            alertError('非法名称!');
            return ;
        }

        let domain = url.host;
        new Promise(function (resolve, reject) {
            chrome.storage.local.get(domain, function (storage_cookies) {
                storage_cookies = storage_cookies || {};
                if (storage_cookies.hasOwnProperty(domain)) {
                    /**
                     * {
                     *  'key1': {
                               list: [],
                               highlight: 1
                     *      }
                     * }
                     */
                    storage_cookies = storage_cookies[domain];
                }

                let cookie_obj = {
                    list: [],
                    highlight: 1,
                };
                // 获取当前 tab 的所有 cookie
                chrome.cookies.getAll({ domain: domain }, function (cookies) {
                    cookies.map(function (cookie) {
                        cookie_obj.list.push({
                            url: url.origin,
                            name: cookie.name,
                            value: cookie.value,
                            domain: url.domain,
                            path: cookie.path,
                            secure: cookie.secure,
                            httpOnly: cookie.httpOnly,
                            expirationDate: cookie.expirationDate,
                            storeId: cookie.storeId
                        });
                    });

                    storage_cookies[name] = cookie_obj;
                    setHighlight(storage_cookies, name);
                    let obj = {};
                    obj[domain] = storage_cookies;
                    chrome.storage.local.set(obj, function () {
                        resolve(storage_cookies);

                        if (typeof callback === 'function') {
                            callback();
                        } else {
                            $('#input').val('');
                            alertSuccess('保存成功!')
                        }
                    });
                });
            });
        }).then(function (storage_cookies) {
            removeLine(name);
            appendLine(name, storage_cookies[name].highlight);
            console.log('save success');
        }, function () {
            alertError('保存失败!');
            console.log('save error');
        });
    }

    /**
     * popup页面加载当前域名保存的所有session名称
     * @param {object} url
     */
    function loadAll(url) {
        let domain = url.host;
        chrome.storage.local.get(domain, function (cookies_obj) {
            if (cookies_obj.hasOwnProperty(domain)) {
                let cookies = cookies_obj[domain] || {};
                for (let name in cookies) {
                    appendLine(name, cookies[name].highlight);
                }
            }
        });
    }

    /**
     * 添加一行
     * @param {string} name session名称
     * @param {boolean} highlight 是否高亮
     */
    function appendLine(name, highlight = false) {
        let $list = $('#list');
        let dd = '<dd data-name="' + name + '">'
            + '<span>' + name + '</span>'
            + '<a class="use">use</a>'
            + '<a class="update">update</a>'
            + '<a class="remove">remove</a>'
            + '</dd>';
        $list.prepend(dd);
        if (highlight) {
            highlightLine(name);
        }
    }

    /**
     * 删除一行（html）
     * @param {string} name
     */
    function removeLine(name) {
        $('dd[data-name="' + name + '"]').remove();
    }

    /**
     * 高亮某一行
     * @param {string} name
     */
    function highlightLine(name) {
        $('dd[data-name="' + name + '"]').css('backgroundColor', '#bbffbb');
        $('dd[data-name!="' + name + '"]').css('backgroundColor', 'transparent');
    }

    /**
     * 获取当前 tab 的 url 信息之后, 执行更新、保存等操作(通过回调)
     * @param {function} callback
     */
    function action(callback) {
        new Promise(function (resolve, reject) {
            chrome.tabs.query({ 'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT }, function (tabs) {
                let tab = tabs[0];
                if (tab) {
                    let url = new URL(tab.url);
                    url ? resolve(url) : reject('no active tab');
                }
            });
        }).then(function (url) {
            callback(url);
        }, function (error) {
            console.log(error);
        });
    }
});
