/// <reference path ="jquery.d.ts"/>

interface Cookie {
    expirationDate: number;
    httpOnly: boolean;
    name: string;
    path: string;
    secure: boolean;
    // storeId: string;
    url: string;
    value: string;
}

interface ItemObject {
    [name : string]: Item;
}

interface Item {
    highlight: boolean;
    list: Cookie[];
}

interface StorageObject {
    [host : string]: ItemObject;
}

interface ProcessItem {
    (item: Item): void;
}

interface ProcessItems {
    (itemObject: ItemObject): void;
}

class SessionManager {
    _name: string;
    _url: URL;
    _storageObject: StorageObject;

    setUrl(url: URL) {
        this._url = url;
        return this;
    }

    setName(name: string) {
        this._name = name;
        return this;
    }

    setStorageObject(storageObject: StorageObject) {
        this._storageObject = storageObject;
        return this;
    }

    /**
     * 根据 url 中的域名获取当前 name 对应的 cookie 对象
     * @param  {function} callback 获取 cookie 之后的回调
     */
    getItem(callback: ProcessItem) {
        let domain = this._url.host;
        let that = this;
        chrome.storage.local.get(domain, function (storageObj: StorageObject) {
            that._storageObject = storageObj;
            if (storageObj.hasOwnProperty(domain)) {
                if (storageObj[domain].hasOwnProperty(this._name)) {
                    callback(storageObj[domain][this._name]);
                }
            }
        });
    }

    /**
     * 根据 url 中的域名获取当前 name 对应的 cookie 对象
     * @param  {function} callback 获取 cookie 之后的回调
     */
    getItemObject(callback: ProcessItems) {
        let domain = this._url.host;
        let that = this;
        chrome.storage.local.get(domain, function (storageObj: StorageObject) {
            that._storageObject = storageObj;
            if (!storageObj.hasOwnProperty(domain)) {
                storageObj[domain] = {};
            }
            callback(storageObj[domain]);
        });
    }

    /**
     * 获取当前 tab 的 url 信息之后, 执行更新、保存等操作(通过回调)
     * @param {function} callback
     */
    action(callback) {
        let that = this;
        if (this._url) {
            callback();
        } else {
            new Promise(function (resolve, reject) {
                chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT}, function (tabs) {
                    let tab = tabs[0];
                    if (tab) {
                        that._url = new URL(tab.url);
                        that._url ? resolve() : reject('no active tab');
                    }
                });
            }).then(function () {
                callback();
            }, function (error) {
                console.log(error);
            });
        }
    }

    /**
     * popup页面加载当前域名保存的所有session名称
     */
    loadAll() {
        let that = this;
        this.action(function () {
            that.getItemObject(function (itemObject: ItemObject) {
                for (let name in itemObject) {
                    if (itemObject.hasOwnProperty(name)) {
                        appendLine(name, itemObject[name].highlight);
                    }
                }
            });
        });
    }

    /**
     * 设置当前使用的session高亮, 同时取消其他的高亮状态
     */
    setHighlight() {
        let that = this;
        highlightLine(this._name);
        // name 对应行高亮，其他取消高亮
        if (this._storageObject.hasOwnProperty(this._url.host)) {
            for (let item_key in this._storageObject[this._url.host]) {
                this._storageObject[this._url.host][item_key].highlight = (item_key === that._name);
            }
        }
    }

    afterUseSession() {
        this.setHighlight();
        removeLine(this._name);
        appendLine(this._name, true);
    }

    /**
     * 保存当前页面的所有cookie
     */
    save() {
        let that = this;
        if (!that._name) return;
        let reg = new RegExp('^[\u4e00-\u9fa5_a-zA-Z0-9]+$');
        if (!that._name.match(reg)) {
            alertError('非法名称!');
            return ;
        }

        let domain: string = that._url.host;
        new Promise(function (resolve, reject) {
            that.getItemObject(function (itemObject: ItemObject) {
                let cookie_obj = {
                    list: [],
                    highlight: true,
                };
                // 获取当前 tab 的所有 cookie
                chrome.cookies.getAll({ domain: domain }, function (cookies) {
                    cookies.map(function (cookie) {
                        cookie_obj.list.push({
                            // url: that._url.origin,
                            name: cookie.name,
                            value: cookie.value,
                            // domain: domain,
                            path: cookie.path,
                            secure: cookie.secure,
                            httpOnly: cookie.httpOnly,
                            expirationDate: cookie.expirationDate,
                            // storeId: cookie.storeId
                        });
                    });

                    that._storageObject[domain][that._name] = cookie_obj;

                    that.setHighlight();
                    that.storage(function () {
                        $('#input').val('');
                        resolve();
                    });
                });
            })
        }).then(function () {
            that.afterUseSession();
            alertSuccess('保存成功');
        }, function () {
            alertError('保存失败!');
        });
    }

    /**
     * 获取当前页面的所有cookie，保存到高亮的session中
     */
    update() {
        this.save();
        alertSuccess('更新成功!');
    }

    /**
     * 清除当前域名当前tab的所有 cookie
     * @param {boolean} alert
     */
    clear(alert = true) {
        let that = this;
        that.action(function () {
            chrome.cookies.getAll({ domain: that._url.host }, function (cookies) {
                cookies.map(function (cookie) {
                    chrome.cookies.remove({url: that._url.origin, name: cookie.name}, function () {});
                });
                if (alert) alertSuccess('清除成功!');
            });
        });
    }

    /**
     * 使用历史某一个状态
     */
    use() {
        let that = this;
        this.action(function () {
            // 先清空原有的 cookie
            that.clear();

            that.getItemObject(function (itemObject: ItemObject) {
                that.setHighlight();
                if (itemObject.hasOwnProperty(that._name)) {
                    itemObject[that._name]['list'].map(function (cookie: Cookie) {
                        // 设置 storage 存储的 cookie 到当前 tab 的域名中
                        let new_cookie = {
                            url: that._url.origin,
                            name: cookie.name,
                            value: cookie.value,
                            path: cookie.path,
                            secure: cookie.secure,
                            httpOnly: cookie.httpOnly,
                            expirationDate: cookie.expirationDate,
                        };
                        if (Number.isNaN(new_cookie.expirationDate) || new_cookie.expirationDate === undefined) {
                            new_cookie.expirationDate = (new Date().getTime()/1000) + 3600 * 24 * 365;
                        }
                        chrome.cookies.set(new_cookie, function () {});
                    });
                }

                // 高亮属性改变了，需要重新保存
                that.storage();
                alertSuccess('启用成功!');
            });
        })
    }

    /**
     * 移除session
     */
    remove() {
        let that = this;
        that.action(function () {
            that.getItemObject(function () {
                if (that._storageObject[that._url.host].hasOwnProperty(that._name)) {
                    delete that._storageObject[that._url.host][that._name];
                    that.storage(function () {
                        removeLine(that._name);
                        alertSuccess('删除成功!');
                    });
                }
            });
        });
    }

    /**
     * 保存storageObject到storage
     */
    storage(callback = null) {
        chrome.storage.local.set(this._storageObject, function () {
            if (typeof callback === 'function') {
                callback();
            }
        });
    }
}

$(function () {
    let sessionManager = new SessionManager();
    sessionManager.loadAll();

    ['remove', 'save', 'use', 'update', 'clear'].map(function (class_name) {
        $(document).on('click', '.' + class_name, function () {
            if (class_name === 'clear') {
                sessionManager.clear();
            } else {
                let name = (class_name === 'save')
                    ? $(this).siblings('input').val()
                    : $(this).siblings('span').html();
                if (!name) {
                    alertError("非法操作");
                } else {
                    sessionManager.setName(name);
                    if (typeof sessionManager[class_name] === 'function') {
                        sessionManager[class_name]();
                    }
                }
            }
        });
    });
});


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