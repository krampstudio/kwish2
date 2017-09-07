(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    rawHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = 'status' in options ? options.status : 200
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],2:[function(require,module,exports){
'use strict';

require('whatwg-fetch');

var _confirm = require('./components/confirm.js');

var _confirm2 = _interopRequireDefault(_confirm);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var kitems = {};

var kitemsContainer = document.querySelector('.kitems');

var getKitemContent = function getKitemContent(item) {
    var content = '\n                <div class="headmage">\n                        <a href="' + item.url + '" target="_blank">\n                            <img src="' + item.image + '" alt="' + item.name + '">\n                        </a>\n                    </div>\n                    <h2>' + item.name + '</h2>\n                    <div class="warn">\n                        <span class="icon icon-' + (item.exact ? 'alert' : 'gift') + '"></span> ' + (item.exact ? 'Modèle exacte' : 'Modèle libre / Idée cadeau') + '\n                    </div>\n                    <p class="desc">' + item.desc + '</p>\n                    <div class="price">\n                        <progress value="' + item.funded + '" max="' + item.price + '" title="Reste ' + (item.price - item.funded) + ' \u20AC"></progress>\n                        <span class="amount">' + item.price + '</span>\n                    </div>';
    if (item.booked) {
        content += '<strong>Article réservé</strong>';
    } else if (item.bought) {
        content += '<strong>Article acheté</strong>';
    } else {
        content += '\n                    <ul class="actions">\n                        <li><a href="' + item.url + '" target="_blank" ><span class="icon icon-globe"></span> Site web</a></li>\n                        <li><a href="#" class="book"><span class="icon icon-lock"></span> R\xE9server</a></li>\n                        <li><a href="#" class="buy"><span class="icon icon-credit-card"></span> Acheter</a></li>\n                        <li><a href="#" class="participate"://www.leetchi.com/c/naissance-de-b-chevrier-boquet" class="participate"><span class="icon icon-squirrel"></span> Participer</a></li>\n                    </ul>';
    }
    return content;
};

var addItem = function addItem(item) {
    var kitem = document.createElement('article');
    kitem.classList.add('kitem');
    kitem.dataset.id = item.id;
    kitem.innerHTML = getKitemContent(item);
    kitemsContainer.appendChild(kitem);
};
var reloadItem = function reloadItem(item) {
    var kitem = document.querySelector('.kitem[data-id=\'' + item.id + '\']');
    kitem.innerHTML = getKitemContent(item);
};

var addKitems = function addKitems() {
    return Object.values(kitems).forEach(addItem);
};

var bookItem = function bookItem(itemId) {
    (0, _confirm2.default)('Veuiller confirmer la réservation', 'Une fois confirmé, l\'article ne sera plus accessible', function () {
        fetch('/kitem/book?item=' + itemId, { method: 'post' }).then(function (response) {
            if (response.status === 200) {
                kitems[itemId].booked = true;
                reloadItem(kitems[itemId]);
            }
        }).catch(function (err) {
            return console.error(err);
        });
    }).open();
};

var buyItem = function buyItem(itemId) {
    (0, _confirm2.default)('Veuiller confirmer l\'achat', 'Une fois confirmé, l\'article ne sera plus accessible', function () {
        fetch('/kitem/buy?item=' + itemId, { method: 'post' }).then(function (response) {
            if (response.status === 200) {
                kitems[itemId].bought = true;
                reloadItem(kitems[itemId]);
            }
        }).catch(function (err) {
            return console.error(err);
        });
    }).open();
};

var participate = function participate(itemId) {
    (0, _confirm2.default)('Vous souhaitez participer ?', 'Vous serez redirigé sur notre cagnotte Leetchi.', function () {
        window.open('https://www.leetchi.com/c/naissance-de-b-chevrier-boquet', '_blank');
    }).open();
};

var kitemActions = function kitemActions() {

    kitemsContainer.addEventListener('click', function (e) {
        if (e.target) {
            if (e.target.matches('.book')) {
                e.preventDefault();
                bookItem(e.target.closest('.kitem').dataset.id);
            }
            if (e.target.matches('.buy')) {
                e.preventDefault();
                buyItem(e.target.closest('.kitem').dataset.id);
            }
            if (e.target.matches('.participate')) {
                e.preventDefault();
                participate(e.target.closest('.kitem').dataset.id);
            }
        }
    });
};

var listDetails = function listDetails(list) {
    document.querySelector('body > header > h1').textContent = list.title;
    document.querySelector('main .details').textContent = list.desc;
};

var getListName = function getListName() {
    var paths = document.location.pathname.split('/').filter(function (p) {
        return p && p.trim().length;
    });
    if (paths && paths.length > 0) {
        return paths[0];
    }
    return false;
};

var loadList = function loadList() {
    var name = getListName();
    if (name) {
        fetch('/klist/' + name).then(function (result) {
            return result.json();
        }).then(function (list) {
            if (list && list.id) {
                listDetails(list);
                kitemActions(list.id);
                return fetch('/kitems?list=' + list.id).then(function (result) {
                    return result.json();
                });
            }
        }).then(function (items) {
            if (items.length) {
                items.forEach(function (item) {
                    return kitems[item.id] = item;
                });
                addKitems();
            }
        }).catch(function (err) {
            return console.error(err);
        });
    }
};

loadList();

},{"./components/confirm.js":3,"whatwg-fetch":1}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _modal = require('./modal.js');

var _modal2 = _interopRequireDefault(_modal);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var confirmFactory = function confirmFactory() {
    var title = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Please confirm';
    var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var done = arguments[2];


    return (0, _modal2.default)(title, message, [{
        label: 'Annuler',
        close: true
    }, {
        label: 'Confirmer',
        close: true,
        action: done
    }]);
};

exports.default = confirmFactory;

},{"./modal.js":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});


var modalFactory = function modalFactory() {
    var title = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var content = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var buttons = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [{ label: 'Ok', close: true, action: function action() {} }];


    var modalContainer = document.querySelector('body');

    var removePreviousModals = function removePreviousModals() {
        var previousModals = modalContainer.querySelectorAll('.modal');
        if (previousModals.length) {
            //[].forEach.call(previousModals, modal => modalContainer.removeChild(modal));
        }
    };

    var modal = {
        init: function init() {
            var _this = this;

            var addModal = function addModal() {

                var modalElt = document.createElement('div');
                modalElt.classList.add('modal');
                modalElt.innerHTML = '\n                    <h1>' + title + '</h1>\n                    <div>\n                        ' + content + '\n                    </div>\n                    <div class="actions"></div>\n                ';

                var actions = modalElt.querySelector('.actions');
                buttons.forEach(function (button) {
                    var buttonElt = document.createElement('button');
                    buttonElt.textContent = button.label;
                    if (button.close || button.action) {
                        buttonElt.addEventListener('click', function (e) {
                            e.preventDefault();
                            if (button.close) {
                                _this.close();
                            }
                            if (typeof button.action === 'function') {
                                button.action.call();
                            }
                        });
                    }
                    actions.appendChild(buttonElt);
                });

                modalContainer.appendChild(modalElt);

                return modalElt;
            };

            var addOverlay = function addOverlay() {
                var overlays = modalContainer.querySelectorAll('.overlay');

                if (overlays.length === 0) {
                    var overlay = document.createElement('div');
                    overlay.classList.add('overlay');
                    modalContainer.appendChild(overlay);
                    return overlay;
                }

                return overlays[0];
            };

            removePreviousModals();

            this.overlayElt = addOverlay();
            this.modalElt = addModal();

            return this;
        },
        open: function open() {

            this.overlayElt.classList.add('active');
            this.modalElt.classList.add('active');

            return this;
        },
        close: function close() {
            this.overlayElt.classList.remove('active');
            this.modalElt.classList.remove('active');

            return this;
        }
    };
    return modal.init();
};

exports.default = modalFactory;

},{}]},{},[2]);
