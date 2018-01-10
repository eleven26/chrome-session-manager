$(function () {
    let name;
    action(loadAll);

    let methods = {
        remove: remove,
        save: save,
        use: use,
        update: update
    };

    ['remove', 'save', 'use', 'update'].map(function (class_name) {
        $(document).on('click', '.' + class_name, function () {
            if (class_name === 'save') {
                name = $(this).siblings('input').val();
            } else {
                name = $(this).siblings('span').html();
            }
            action(methods[class_name]);
        });
    });

    function use(url) {
        let domain = url.host;
        chrome.storage.local.get(domain, function (storage_cookies) {
            storage_cookies = storage_cookies || {};
            if (storage_cookies.hasOwnProperty(domain)) {
                storage_cookies = storage_cookies[domain];
            }
            if (storage_cookies.hasOwnProperty(name)) {
                let cookies = storage_cookies[name];
                cookies.map(function (cookie) {
                    // 设置 storage 存储的 cookie 到当前 tab 的域名中
                    chrome.cookies.set(cookie, function () {
                        console.log(cookie);
                    });
                });
            }
        })
    }

    function remove(url) {
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
                });
            }
        })
    }

    function update(url) {
        save(url);
    }

    function save(url) {
        let domain = url.host;
        new Promise(function (resolve, reject) {
            chrome.storage.local.get(domain, function (storage_cookies) {
                storage_cookies = storage_cookies || {};
                if (storage_cookies.hasOwnProperty(domain)) {
                    storage_cookies = storage_cookies[domain];
                }

                chrome.cookies.getAll({ domain: domain }, function (cookies) {
                    let new_cookies = [];
                    cookies.map(function (cookie) {
                        new_cookies.push({
                            url: url.origin,
                            name: cookie.name,
                            value: cookie.value,
                            domain: url.domain,
                            path: cookie.path,
                            secure: cookie.secure,
                            httpOnly: cookie.httpOnly,
                            expirationDate: cookie.expirationDate,
                            storeId: cookie.storeId
                        })
                    });
                    storage_cookies[name] = new_cookies;

                    let obj = {};
                    obj[domain] = storage_cookies;
                    chrome.storage.local.set(obj, function () {
                        resolve();
                    });
                });
            })
        }).then(function () {
            removeLine(name);
            appendLine(name);
            console.log('save success')
        }, function () {
            console.log('save error')
        });
    }

    function loadAll(url) {
        let domain = url.host;
        chrome.storage.local.get(domain, function (cookies_obj) {
            if (cookies_obj.hasOwnProperty(domain)) {
                let cookies = cookies_obj[domain] || {};
                for (let name in cookies) {
                    appendLine(name);
                }
            }
        })
    }

    function appendLine(name) {
        let $list = $('#list');
        let dd = '<dd data-name="' + name + '">'
            + '<span>' + name + '</span>'
            + '<a class="use">use</a>'
            + '<a class="update">update</a>'
            + '<a class="remove">remove</a>'
            + '</dd>';
        $list.prepend(dd);
    }

    function removeLine(name) {
        $('dd[data-name=' + name + ']').remove();
    }

    function action(callback) {
        new Promise(function (resolve, reject) {
            chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT}, function (tabs) {
                let tab = tabs[0];
                if (tab) {
                    let url = new URL(tab.url);
                    if (url) {
                        resolve(url);
                    } else {
                        reject('no active tab');
                    }
                }
            });
        }).then(function (url) {
            callback(url);
        }, function (error) {
            console.log(error);
        })
    }
});
