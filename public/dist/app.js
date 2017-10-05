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
    if (item.bought) {
        item.funded = item.price;
    }
    var content = '\n                <div class="headmage">\n                        <a href="' + item.url + '" target="_blank" rel="noopener noreferrer">\n                            <img src="' + item.image + '" alt="' + item.name + '">\n                        </a>\n                    </div>\n                    <h2>' + item.name + '</h2>\n                    <div class="warn">\n                        <span class="icon icon-' + (item.exact ? 'alert' : 'gift') + '"></span> ' + (item.exact ? 'Modèle exacte' : 'Modèle libre / Idée cadeau') + '\n                    </div>\n                    <p class="desc">' + item.desc + '</p>\n                    <div class="price">\n                        <progress value="' + item.funded + '" max="' + item.price + '" title="Reste ' + (item.price - item.funded) + ' \u20AC"></progress>\n                        <span class="amount">' + item.price + '</span>\n                    </div>';
    if (item.bought) {
        content += '<strong>Article acheté</strong>';
    } else if (item.booked) {
        content += '<strong>Article r\xE9serv\xE9</strong>\n                    <ul class="actions">\n                    <li><a href="' + item.url + '" target="_blank" rel="noopener noreferrer"><span class="icon icon-globe"></span> Site web</a></li>\n                    <li><a href="#" class="buy"><span class="icon icon-credit-card"></span> Acheter</a></li>\n                </ul>';
    } else {
        content += '\n                <ul class="actions">\n                    <li><a href="' + item.url + '" target="_blank" rel="noopener noreferrer"><span class="icon icon-globe"></span> Site web</a></li>';
        if (!item.fundOnly) {
            content += '\n                    <li><a href="#" class="book"><span class="icon icon-lock"></span> R\xE9server</a></li>\n                    <li><a href="#" class="buy"><span class="icon icon-credit-card"></span> Acheter</a></li>';
        }
        content += '<li><a href="https://www.leetchi.com/c/naissance-de-b-chevrier-boquet"><span class="icon icon-squirrel"></span> Participer</a></li>\n            </ul>';
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
    (0, _confirm2.default)('Veuiller confirmer la réservation', 'Une fois confirmé, l\'article ne sera plus accessible', function (modalElt) {
        var comment = modalElt.querySelector('textarea[name=comment]');
        fetch('/kitem/book?item=' + itemId, {
            method: 'POST',
            body: JSON.stringify({
                comment: comment.value
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(function (response) {
            if (response.status === 200) {
                kitems[itemId].booked = true;
                reloadItem(kitems[itemId]);
            }
        }).catch(function (err) {
            return window.console.error(err);
        });
    }).open();
};

var buyItem = function buyItem(itemId) {
    (0, _confirm2.default)('Veuiller confirmer l\'achat', 'Une fois confirmé, l\'article ne sera plus accessible', function (modalElt) {
        var comment = modalElt.querySelector('textarea[name=comment]');
        fetch('/kitem/buy?item=' + itemId, {
            method: 'POST',
            body: JSON.stringify({
                comment: comment.value
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(function (response) {
            if (response.status === 200) {
                kitems[itemId].bought = true;
                reloadItem(kitems[itemId]);
            }
        }).catch(function (err) {
            return window.console.error(err);
        });
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
    var name = getListName() || 'berem2';
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
            return window.console.error(err);
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
            [].forEach.call(previousModals, function (modal) {
                return modalContainer.removeChild(modal);
            });
        }
    };

    var modal = {
        init: function init() {
            var _this = this;

            var addModal = function addModal() {

                var modalElt = document.createElement('div');
                modalElt.classList.add('modal');
                modalElt.innerHTML = '\n                    <h1>' + title + '</h1>\n                    <div>\n                        ' + content + '\n                    </div>\n                    <form>\n                        <textarea name="comment" placeholder="Un petit mot, un commentaire, merci"></textarea>\n                    </form>\n                    <div class="actions"></div>\n                ';

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
                                button.action.call(null, modalElt);
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

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwicHVibGljL2pzL2FwcC5qcyIsInB1YmxpYy9qcy9jb21wb25lbnRzL2NvbmZpcm0uanMiLCJwdWJsaWMvanMvY29tcG9uZW50cy9tb2RhbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdjQTs7QUFDQTs7Ozs7O0FBRUEsSUFBTSxTQUFTLEVBQWY7O0FBRUEsSUFBTSxrQkFBa0IsU0FBUyxhQUFULENBQXVCLFNBQXZCLENBQXhCOztBQUVBLElBQU0sa0JBQWtCLFNBQWxCLGVBQWtCLE9BQVE7QUFDNUIsUUFBRyxLQUFLLE1BQVIsRUFBZTtBQUNYLGFBQUssTUFBTCxHQUFjLEtBQUssS0FBbkI7QUFDSDtBQUNELFFBQUksMEZBRTJCLEtBQUssR0FGaEMsNEZBR2dDLEtBQUssS0FIckMsZUFHb0QsS0FBSyxJQUh6RCw4RkFNa0IsS0FBSyxJQU52Qix1R0FReUMsS0FBSyxLQUFMLEdBQWEsT0FBYixHQUF1QixNQVJoRSxvQkFRbUYsS0FBSyxLQUFMLEdBQWEsZUFBYixHQUErQiw0QkFSbEgsMkVBVThCLEtBQUssSUFWbkMsZ0dBWW1DLEtBQUssTUFaeEMsZUFZd0QsS0FBSyxLQVo3RCx3QkFZb0YsS0FBSyxLQUFMLEdBQWEsS0FBSyxNQVp0Ryw0RUFhdUMsS0FBSyxLQWI1Qyx3Q0FBSjtBQWVBLFFBQUksS0FBSyxNQUFULEVBQWdCO0FBQ1osbUJBQVcsaUNBQVg7QUFDSCxLQUZELE1BRU8sSUFBRyxLQUFLLE1BQVIsRUFBZTtBQUNsQiwySUFFMkIsS0FBSyxHQUZoQztBQU1ILEtBUE0sTUFPQTtBQUNILGlHQUUyQixLQUFLLEdBRmhDO0FBR0EsWUFBRyxDQUFDLEtBQUssUUFBVCxFQUFrQjtBQUNkO0FBR0g7QUFDRDtBQUVIO0FBQ0QsV0FBTyxPQUFQO0FBQ0gsQ0F6Q0Q7O0FBMkNBLElBQU0sVUFBVSxTQUFWLE9BQVUsT0FBUTtBQUNwQixRQUFNLFFBQVEsU0FBUyxhQUFULENBQXVCLFNBQXZCLENBQWQ7QUFDQSxVQUFNLFNBQU4sQ0FBZ0IsR0FBaEIsQ0FBb0IsT0FBcEI7QUFDQSxVQUFNLE9BQU4sQ0FBYyxFQUFkLEdBQW1CLEtBQUssRUFBeEI7QUFDQSxVQUFNLFNBQU4sR0FBa0IsZ0JBQWdCLElBQWhCLENBQWxCO0FBQ0Esb0JBQWdCLFdBQWhCLENBQTRCLEtBQTVCO0FBQ0gsQ0FORDtBQU9BLElBQU0sYUFBYSxTQUFiLFVBQWEsT0FBUTtBQUN2QixRQUFNLFFBQVEsU0FBUyxhQUFULHVCQUEwQyxLQUFLLEVBQS9DLFNBQWQ7QUFDQSxVQUFNLFNBQU4sR0FBa0IsZ0JBQWdCLElBQWhCLENBQWxCO0FBQ0gsQ0FIRDs7QUFLQSxJQUFNLFlBQVksU0FBWixTQUFZO0FBQUEsV0FBTSxPQUFPLE1BQVAsQ0FBYyxNQUFkLEVBQXNCLE9BQXRCLENBQThCLE9BQTlCLENBQU47QUFBQSxDQUFsQjs7QUFFQSxJQUFNLFdBQVcsU0FBWCxRQUFXLFNBQVU7QUFDdkIsMkJBQWlCLG1DQUFqQixFQUFzRCx1REFBdEQsRUFBK0csb0JBQVk7QUFDdkgsWUFBTSxVQUFVLFNBQVMsYUFBVCxDQUF1Qix3QkFBdkIsQ0FBaEI7QUFDQSxvQ0FBMEIsTUFBMUIsRUFBb0M7QUFDaEMsb0JBQVMsTUFEdUI7QUFFaEMsa0JBQU8sS0FBSyxTQUFMLENBQWU7QUFDbEIseUJBQVUsUUFBUTtBQURBLGFBQWYsQ0FGeUI7QUFLaEMscUJBQVM7QUFDTCxnQ0FBZ0I7QUFEWDtBQUx1QixTQUFwQyxFQVFHLElBUkgsQ0FRUyxvQkFBWTtBQUNqQixnQkFBRyxTQUFTLE1BQVQsS0FBb0IsR0FBdkIsRUFBMkI7QUFDdkIsdUJBQU8sTUFBUCxFQUFlLE1BQWYsR0FBd0IsSUFBeEI7QUFDQSwyQkFBVyxPQUFPLE1BQVAsQ0FBWDtBQUNIO0FBQ0osU0FiRCxFQWFHLEtBYkgsQ0FhVTtBQUFBLG1CQUFPLE9BQU8sT0FBUCxDQUFlLEtBQWYsQ0FBcUIsR0FBckIsQ0FBUDtBQUFBLFNBYlY7QUFjSCxLQWhCRCxFQWdCRyxJQWhCSDtBQWlCSCxDQWxCRDs7QUFvQkEsSUFBTSxVQUFVLFNBQVYsT0FBVSxTQUFVO0FBQ3RCLDJCQUFpQiw2QkFBakIsRUFBZ0QsdURBQWhELEVBQXlHLG9CQUFZO0FBQ2pILFlBQU0sVUFBVSxTQUFTLGFBQVQsQ0FBdUIsd0JBQXZCLENBQWhCO0FBQ0EsbUNBQXlCLE1BQXpCLEVBQW1DO0FBQy9CLG9CQUFTLE1BRHNCO0FBRS9CLGtCQUFPLEtBQUssU0FBTCxDQUFlO0FBQ2xCLHlCQUFVLFFBQVE7QUFEQSxhQUFmLENBRndCO0FBSy9CLHFCQUFTO0FBQ0wsZ0NBQWdCO0FBRFg7QUFMc0IsU0FBbkMsRUFRRyxJQVJILENBUVMsb0JBQVk7QUFDakIsZ0JBQUcsU0FBUyxNQUFULEtBQW9CLEdBQXZCLEVBQTJCO0FBQ3ZCLHVCQUFPLE1BQVAsRUFBZSxNQUFmLEdBQXdCLElBQXhCO0FBQ0EsMkJBQVcsT0FBTyxNQUFQLENBQVg7QUFDSDtBQUNKLFNBYkQsRUFhRyxLQWJILENBYVU7QUFBQSxtQkFBTyxPQUFPLE9BQVAsQ0FBZSxLQUFmLENBQXFCLEdBQXJCLENBQVA7QUFBQSxTQWJWO0FBY0gsS0FoQkQsRUFnQkcsSUFoQkg7QUFpQkgsQ0FsQkQ7O0FBb0JBLElBQU0sZUFBZSxTQUFmLFlBQWUsR0FBTTs7QUFFdkIsb0JBQWdCLGdCQUFoQixDQUFpQyxPQUFqQyxFQUEwQyxhQUFLO0FBQzNDLFlBQUcsRUFBRSxNQUFMLEVBQVk7QUFDUixnQkFBRyxFQUFFLE1BQUYsQ0FBUyxPQUFULENBQWlCLE9BQWpCLENBQUgsRUFBOEI7QUFDMUIsa0JBQUUsY0FBRjtBQUNBLHlCQUFTLEVBQUUsTUFBRixDQUFTLE9BQVQsQ0FBaUIsUUFBakIsRUFBMkIsT0FBM0IsQ0FBbUMsRUFBNUM7QUFDSDtBQUNELGdCQUFHLEVBQUUsTUFBRixDQUFTLE9BQVQsQ0FBaUIsTUFBakIsQ0FBSCxFQUE2QjtBQUN6QixrQkFBRSxjQUFGO0FBQ0Esd0JBQVEsRUFBRSxNQUFGLENBQVMsT0FBVCxDQUFpQixRQUFqQixFQUEyQixPQUEzQixDQUFtQyxFQUEzQztBQUNIO0FBQ0o7QUFDSixLQVhEO0FBWUgsQ0FkRDs7QUFnQkEsSUFBTSxjQUFjLFNBQWQsV0FBYyxPQUFRO0FBQ3hCLGFBQVMsYUFBVCxDQUF1QixvQkFBdkIsRUFBNkMsV0FBN0MsR0FBMkQsS0FBSyxLQUFoRTtBQUNBLGFBQVMsYUFBVCxDQUF1QixlQUF2QixFQUF3QyxXQUF4QyxHQUFzRCxLQUFLLElBQTNEO0FBQ0gsQ0FIRDs7QUFLQSxJQUFNLGNBQWMsU0FBZCxXQUFjLEdBQU07QUFDdEIsUUFBTyxRQUNILFNBQVMsUUFBVCxDQUFrQixRQUFsQixDQUNLLEtBREwsQ0FDVyxHQURYLEVBRUssTUFGTCxDQUVhO0FBQUEsZUFBSyxLQUFLLEVBQUUsSUFBRixHQUFTLE1BQW5CO0FBQUEsS0FGYixDQURKO0FBSUEsUUFBRyxTQUFTLE1BQU0sTUFBTixHQUFlLENBQTNCLEVBQTZCO0FBQ3pCLGVBQU8sTUFBTSxDQUFOLENBQVA7QUFDSDtBQUNELFdBQU8sS0FBUDtBQUNILENBVEQ7O0FBV0EsSUFBTSxXQUFXLFNBQVgsUUFBVyxHQUFNO0FBQ25CLFFBQU0sT0FBTyxpQkFBaUIsUUFBOUI7QUFDQSxRQUFHLElBQUgsRUFBUTtBQUNKLDBCQUFnQixJQUFoQixFQUNLLElBREwsQ0FDVztBQUFBLG1CQUFVLE9BQU8sSUFBUCxFQUFWO0FBQUEsU0FEWCxFQUVLLElBRkwsQ0FFVyxnQkFBUTtBQUNYLGdCQUFHLFFBQVEsS0FBSyxFQUFoQixFQUFtQjtBQUNmLDRCQUFZLElBQVo7QUFDQSw2QkFBYSxLQUFLLEVBQWxCO0FBQ0EsdUJBQU8sd0JBQXNCLEtBQUssRUFBM0IsRUFBaUMsSUFBakMsQ0FBdUM7QUFBQSwyQkFBVSxPQUFPLElBQVAsRUFBVjtBQUFBLGlCQUF2QyxDQUFQO0FBQ0g7QUFDSixTQVJMLEVBU0ssSUFUTCxDQVNXLGlCQUFTO0FBQ1osZ0JBQUcsTUFBTSxNQUFULEVBQWdCO0FBQ1osc0JBQU0sT0FBTixDQUFlO0FBQUEsMkJBQVEsT0FBTyxLQUFLLEVBQVosSUFBa0IsSUFBMUI7QUFBQSxpQkFBZjtBQUNBO0FBQ0g7QUFDSixTQWRMLEVBZUssS0FmTCxDQWVZO0FBQUEsbUJBQU8sT0FBTyxPQUFQLENBQWUsS0FBZixDQUFxQixHQUFyQixDQUFQO0FBQUEsU0FmWjtBQWdCSDtBQUNKLENBcEJEOztBQXNCQTs7Ozs7Ozs7O0FDOUpBOzs7Ozs7QUFFQSxJQUFNLGlCQUFpQixTQUFqQixjQUFpQixHQUF1RDtBQUFBLFFBQTdDLEtBQTZDLHVFQUFyQyxnQkFBcUM7QUFBQSxRQUFuQixPQUFtQix1RUFBVCxFQUFTO0FBQUEsUUFBTCxJQUFLOzs7QUFFMUUsV0FBTyxxQkFBTSxLQUFOLEVBQWEsT0FBYixFQUFzQixDQUFDO0FBQzFCLGVBQVEsU0FEa0I7QUFFMUIsZUFBUTtBQUZrQixLQUFELEVBRzFCO0FBQ0MsZUFBUSxXQURUO0FBRUMsZUFBUSxJQUZUO0FBR0MsZ0JBQVM7QUFIVixLQUgwQixDQUF0QixDQUFQO0FBUUgsQ0FWRDs7a0JBWWUsYzs7Ozs7Ozs7OztBQ1pmLElBQU0sZUFBZSxTQUFmLFlBQWUsR0FBa0c7QUFBQSxRQUF4RixLQUF3Rix1RUFBaEYsRUFBZ0Y7QUFBQSxRQUE1RSxPQUE0RSx1RUFBbEUsRUFBa0U7QUFBQSxRQUE5RCxPQUE4RCx1RUFBcEQsQ0FBQyxFQUFFLE9BQVEsSUFBVixFQUFnQixPQUFRLElBQXhCLEVBQThCLFFBQVMsa0JBQU0sQ0FBRSxDQUEvQyxFQUFELENBQW9EOzs7QUFFbkgsUUFBTSxpQkFBaUIsU0FBUyxhQUFULENBQXVCLE1BQXZCLENBQXZCOztBQUVBLFFBQU0sdUJBQXVCLFNBQXZCLG9CQUF1QixHQUFNO0FBQy9CLFlBQU0saUJBQWlCLGVBQWUsZ0JBQWYsQ0FBZ0MsUUFBaEMsQ0FBdkI7QUFDQSxZQUFHLGVBQWUsTUFBbEIsRUFBeUI7QUFDckIsZUFBRyxPQUFILENBQVcsSUFBWCxDQUFnQixjQUFoQixFQUFnQztBQUFBLHVCQUFTLGVBQWUsV0FBZixDQUEyQixLQUEzQixDQUFUO0FBQUEsYUFBaEM7QUFDSDtBQUNKLEtBTEQ7O0FBT0EsUUFBTSxRQUFRO0FBQ1YsWUFEVSxrQkFDSDtBQUFBOztBQUNILGdCQUFNLFdBQVcsU0FBWCxRQUFXLEdBQU07O0FBRW5CLG9CQUFNLFdBQVcsU0FBUyxhQUFULENBQXVCLEtBQXZCLENBQWpCO0FBQ0EseUJBQVMsU0FBVCxDQUFtQixHQUFuQixDQUF1QixPQUF2QjtBQUNBLHlCQUFTLFNBQVQsa0NBQ1UsS0FEVixrRUFHVSxPQUhWOztBQVdBLG9CQUFNLFVBQVUsU0FBUyxhQUFULENBQXVCLFVBQXZCLENBQWhCO0FBQ0Esd0JBQVEsT0FBUixDQUFpQixrQkFBVTtBQUN2Qix3QkFBTSxZQUFZLFNBQVMsYUFBVCxDQUF1QixRQUF2QixDQUFsQjtBQUNBLDhCQUFVLFdBQVYsR0FBd0IsT0FBTyxLQUEvQjtBQUNBLHdCQUFHLE9BQU8sS0FBUCxJQUFnQixPQUFPLE1BQTFCLEVBQWlDO0FBQzdCLGtDQUFVLGdCQUFWLENBQTJCLE9BQTNCLEVBQW9DLGFBQUs7QUFDckMsOEJBQUUsY0FBRjtBQUNBLGdDQUFHLE9BQU8sS0FBVixFQUFnQjtBQUNaLHNDQUFLLEtBQUw7QUFDSDtBQUNELGdDQUFHLE9BQU8sT0FBTyxNQUFkLEtBQXlCLFVBQTVCLEVBQXVDO0FBQ25DLHVDQUFPLE1BQVAsQ0FBYyxJQUFkLENBQW1CLElBQW5CLEVBQXlCLFFBQXpCO0FBQ0g7QUFDSix5QkFSRDtBQVNIO0FBQ0QsNEJBQVEsV0FBUixDQUFvQixTQUFwQjtBQUNILGlCQWZEOztBQWlCQSwrQkFBZSxXQUFmLENBQTJCLFFBQTNCOztBQUVBLHVCQUFPLFFBQVA7QUFDSCxhQXBDRDs7QUFzQ0EsZ0JBQU0sYUFBaUIsU0FBakIsVUFBaUIsR0FBTTtBQUN6QixvQkFBTSxXQUFXLGVBQWUsZ0JBQWYsQ0FBZ0MsVUFBaEMsQ0FBakI7O0FBRUEsb0JBQUcsU0FBUyxNQUFULEtBQW9CLENBQXZCLEVBQXlCO0FBQ3JCLHdCQUFNLFVBQVUsU0FBUyxhQUFULENBQXVCLEtBQXZCLENBQWhCO0FBQ0EsNEJBQVEsU0FBUixDQUFrQixHQUFsQixDQUFzQixTQUF0QjtBQUNBLG1DQUFlLFdBQWYsQ0FBMkIsT0FBM0I7QUFDQSwyQkFBTyxPQUFQO0FBQ0g7O0FBRUQsdUJBQU8sU0FBUyxDQUFULENBQVA7QUFDSCxhQVhEOztBQWFBOztBQUVBLGlCQUFLLFVBQUwsR0FBa0IsWUFBbEI7QUFDQSxpQkFBSyxRQUFMLEdBQWdCLFVBQWhCOztBQUVBLG1CQUFPLElBQVA7QUFDSCxTQTNEUztBQTZEVixZQTdEVSxrQkE2REo7O0FBR0YsaUJBQUssVUFBTCxDQUFnQixTQUFoQixDQUEwQixHQUExQixDQUE4QixRQUE5QjtBQUNBLGlCQUFLLFFBQUwsQ0FBYyxTQUFkLENBQXdCLEdBQXhCLENBQTRCLFFBQTVCOztBQUVBLG1CQUFPLElBQVA7QUFDSCxTQXBFUztBQXNFVixhQXRFVSxtQkFzRUg7QUFDSCxpQkFBSyxVQUFMLENBQWdCLFNBQWhCLENBQTBCLE1BQTFCLENBQWlDLFFBQWpDO0FBQ0EsaUJBQUssUUFBTCxDQUFjLFNBQWQsQ0FBd0IsTUFBeEIsQ0FBK0IsUUFBL0I7O0FBRUEsbUJBQU8sSUFBUDtBQUNIO0FBM0VTLEtBQWQ7QUE2RUEsV0FBTyxNQUFNLElBQU4sRUFBUDtBQUVILENBMUZEOztrQkE0RmUsWSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGhlYWRlcnMpKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGhlYWRlclswXSwgaGVhZGVyWzFdKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLm1hcFtuYW1lXVxuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSsnLCcrdmFsdWUgOiB2YWx1ZVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHRoaXMubWFwKSB7XG4gICAgICBpZiAodGhpcy5tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLm1hcFtuYW1lXSwgbmFtZSwgdGhpcylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChuYW1lKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IGl0ZW1zLnB1c2godmFsdWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2goW25hbWUsIHZhbHVlXSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgdmFyIGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpXG4gICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKVxuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpXG4gICAgICAgIC8vIElFIDEwLTExIGNhbid0IGhhbmRsZSBhIERhdGFWaWV3IGJvZHkuXG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gbmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSkpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZWFkQXJyYXlCdWZmZXJBc1RleHQodGhpcy5fYm9keUFycmF5QnVmZmVyKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG5cbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBSZXF1ZXN0KSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5ICYmIGlucHV0Ll9ib2R5SW5pdCAhPSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gU3RyaW5nKGlucHV0KVxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLCB7IGJvZHk6IHRoaXMuX2JvZHlJbml0IH0pXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycygpXG4gICAgcmF3SGVhZGVycy5zcGxpdCgvXFxyP1xcbi8pLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgdmFyIHBhcnRzID0gbGluZS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gcGFydHMuc2hpZnQoKS50cmltKClcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFydHMuam9pbignOicpLnRyaW0oKVxuICAgICAgICBoZWFkZXJzLmFwcGVuZChrZXksIHZhbHVlKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRlcnNcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSAnc3RhdHVzJyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXMgOiAyMDBcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gJ3N0YXR1c1RleHQnIGluIG9wdGlvbnMgPyBvcHRpb25zLnN0YXR1c1RleHQgOiAnT0snXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IHBhcnNlSGVhZGVycyh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpXG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy51cmwgPSAncmVzcG9uc2VVUkwnIGluIHhociA/IHhoci5yZXNwb25zZVVSTCA6IG9wdGlvbnMuaGVhZGVycy5nZXQoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiaW1wb3J0ICd3aGF0d2ctZmV0Y2gnO1xuaW1wb3J0IGNvbmZpcm1Db21wb25lbnQgZnJvbSAnLi9jb21wb25lbnRzL2NvbmZpcm0uanMnO1xuXG5jb25zdCBraXRlbXMgPSB7fTtcblxuY29uc3Qga2l0ZW1zQ29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmtpdGVtcycpO1xuXG5jb25zdCBnZXRLaXRlbUNvbnRlbnQgPSBpdGVtID0+IHtcbiAgICBpZihpdGVtLmJvdWdodCl7XG4gICAgICAgIGl0ZW0uZnVuZGVkID0gaXRlbS5wcmljZTtcbiAgICB9XG4gICAgbGV0IGNvbnRlbnQgID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkbWFnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7aXRlbS51cmx9XCIgdGFyZ2V0PVwiX2JsYW5rXCIgcmVsPVwibm9vcGVuZXIgbm9yZWZlcnJlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbWcgc3JjPVwiJHtpdGVtLmltYWdlfVwiIGFsdD1cIiR7aXRlbS5uYW1lfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGgyPiR7aXRlbS5uYW1lfTwvaDI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ3YXJuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImljb24gaWNvbi0ke2l0ZW0uZXhhY3QgPyAnYWxlcnQnIDogJ2dpZnQnfVwiPjwvc3Bhbj4gJHtpdGVtLmV4YWN0ID8gJ01vZMOobGUgZXhhY3RlJyA6ICdNb2TDqGxlIGxpYnJlIC8gSWTDqWUgY2FkZWF1J31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVwiZGVzY1wiPiR7aXRlbS5kZXNjfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByaWNlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cHJvZ3Jlc3MgdmFsdWU9XCIke2l0ZW0uZnVuZGVkfVwiIG1heD1cIiR7aXRlbS5wcmljZX1cIiB0aXRsZT1cIlJlc3RlICR7aXRlbS5wcmljZSAtIGl0ZW0uZnVuZGVkfSDigqxcIj48L3Byb2dyZXNzPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJhbW91bnRcIj4ke2l0ZW0ucHJpY2V9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgIGlmIChpdGVtLmJvdWdodCl7XG4gICAgICAgIGNvbnRlbnQgKz0gJzxzdHJvbmc+QXJ0aWNsZSBhY2hldMOpPC9zdHJvbmc+JztcbiAgICB9IGVsc2UgaWYoaXRlbS5ib29rZWQpe1xuICAgICAgICBjb250ZW50ICs9IGA8c3Ryb25nPkFydGljbGUgcsOpc2VydsOpPC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cImFjdGlvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxpPjxhIGhyZWY9XCIke2l0ZW0udXJsfVwiIHRhcmdldD1cIl9ibGFua1wiIHJlbD1cIm5vb3BlbmVyIG5vcmVmZXJyZXJcIj48c3BhbiBjbGFzcz1cImljb24gaWNvbi1nbG9iZVwiPjwvc3Bhbj4gU2l0ZSB3ZWI8L2E+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgPGxpPjxhIGhyZWY9XCIjXCIgY2xhc3M9XCJidXlcIj48c3BhbiBjbGFzcz1cImljb24gaWNvbi1jcmVkaXQtY2FyZFwiPjwvc3Bhbj4gQWNoZXRlcjwvYT48L2xpPlxuICAgICAgICAgICAgICAgIDwvdWw+YDtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRlbnQgKz0gYFxuICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cImFjdGlvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxpPjxhIGhyZWY9XCIke2l0ZW0udXJsfVwiIHRhcmdldD1cIl9ibGFua1wiIHJlbD1cIm5vb3BlbmVyIG5vcmVmZXJyZXJcIj48c3BhbiBjbGFzcz1cImljb24gaWNvbi1nbG9iZVwiPjwvc3Bhbj4gU2l0ZSB3ZWI8L2E+PC9saT5gO1xuICAgICAgICBpZighaXRlbS5mdW5kT25seSl7XG4gICAgICAgICAgICBjb250ZW50ICs9IGBcbiAgICAgICAgICAgICAgICAgICAgPGxpPjxhIGhyZWY9XCIjXCIgY2xhc3M9XCJib29rXCI+PHNwYW4gY2xhc3M9XCJpY29uIGljb24tbG9ja1wiPjwvc3Bhbj4gUsOpc2VydmVyPC9hPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgIDxsaT48YSBocmVmPVwiI1wiIGNsYXNzPVwiYnV5XCI+PHNwYW4gY2xhc3M9XCJpY29uIGljb24tY3JlZGl0LWNhcmRcIj48L3NwYW4+IEFjaGV0ZXI8L2E+PC9saT5gO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRlbnQgKz0gYDxsaT48YSBocmVmPVwiaHR0cHM6Ly93d3cubGVldGNoaS5jb20vYy9uYWlzc2FuY2UtZGUtYi1jaGV2cmllci1ib3F1ZXRcIj48c3BhbiBjbGFzcz1cImljb24gaWNvbi1zcXVpcnJlbFwiPjwvc3Bhbj4gUGFydGljaXBlcjwvYT48L2xpPlxuICAgICAgICAgICAgPC91bD5gO1xuICAgIH1cbiAgICByZXR1cm4gY29udGVudDtcbn07XG5cbmNvbnN0IGFkZEl0ZW0gPSBpdGVtID0+IHtcbiAgICBjb25zdCBraXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2FydGljbGUnKTtcbiAgICBraXRlbS5jbGFzc0xpc3QuYWRkKCdraXRlbScpO1xuICAgIGtpdGVtLmRhdGFzZXQuaWQgPSBpdGVtLmlkO1xuICAgIGtpdGVtLmlubmVySFRNTCA9IGdldEtpdGVtQ29udGVudChpdGVtKTtcbiAgICBraXRlbXNDb250YWluZXIuYXBwZW5kQ2hpbGQoa2l0ZW0pO1xufTtcbmNvbnN0IHJlbG9hZEl0ZW0gPSBpdGVtID0+IHtcbiAgICBjb25zdCBraXRlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYC5raXRlbVtkYXRhLWlkPScke2l0ZW0uaWR9J11gKTtcbiAgICBraXRlbS5pbm5lckhUTUwgPSBnZXRLaXRlbUNvbnRlbnQoaXRlbSk7XG59O1xuXG5jb25zdCBhZGRLaXRlbXMgPSAoKSA9PiBPYmplY3QudmFsdWVzKGtpdGVtcykuZm9yRWFjaChhZGRJdGVtKTtcblxuY29uc3QgYm9va0l0ZW0gPSBpdGVtSWQgPT4ge1xuICAgIGNvbmZpcm1Db21wb25lbnQoJ1ZldWlsbGVyIGNvbmZpcm1lciBsYSByw6lzZXJ2YXRpb24nLCAnVW5lIGZvaXMgY29uZmlybcOpLCBsXFwnYXJ0aWNsZSBuZSBzZXJhIHBsdXMgYWNjZXNzaWJsZScsIG1vZGFsRWx0ID0+IHtcbiAgICAgICAgY29uc3QgY29tbWVudCA9IG1vZGFsRWx0LnF1ZXJ5U2VsZWN0b3IoJ3RleHRhcmVhW25hbWU9Y29tbWVudF0nKTtcbiAgICAgICAgZmV0Y2goYC9raXRlbS9ib29rP2l0ZW09JHtpdGVtSWR9YCwge1xuICAgICAgICAgICAgbWV0aG9kIDogJ1BPU1QnLFxuICAgICAgICAgICAgYm9keSA6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBjb21tZW50IDogY29tbWVudC52YWx1ZVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS50aGVuKCByZXNwb25zZSA9PiB7XG4gICAgICAgICAgICBpZihyZXNwb25zZS5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgICAgICAga2l0ZW1zW2l0ZW1JZF0uYm9va2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZWxvYWRJdGVtKGtpdGVtc1tpdGVtSWRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuY2F0Y2goIGVyciA9PiB3aW5kb3cuY29uc29sZS5lcnJvcihlcnIpKTtcbiAgICB9KS5vcGVuKCk7XG59O1xuXG5jb25zdCBidXlJdGVtID0gaXRlbUlkID0+IHtcbiAgICBjb25maXJtQ29tcG9uZW50KCdWZXVpbGxlciBjb25maXJtZXIgbFxcJ2FjaGF0JywgJ1VuZSBmb2lzIGNvbmZpcm3DqSwgbFxcJ2FydGljbGUgbmUgc2VyYSBwbHVzIGFjY2Vzc2libGUnLCBtb2RhbEVsdCA9PiB7XG4gICAgICAgIGNvbnN0IGNvbW1lbnQgPSBtb2RhbEVsdC5xdWVyeVNlbGVjdG9yKCd0ZXh0YXJlYVtuYW1lPWNvbW1lbnRdJyk7XG4gICAgICAgIGZldGNoKGAva2l0ZW0vYnV5P2l0ZW09JHtpdGVtSWR9YCwge1xuICAgICAgICAgICAgbWV0aG9kIDogJ1BPU1QnLFxuICAgICAgICAgICAgYm9keSA6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBjb21tZW50IDogY29tbWVudC52YWx1ZVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS50aGVuKCByZXNwb25zZSA9PiB7XG4gICAgICAgICAgICBpZihyZXNwb25zZS5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgICAgICAga2l0ZW1zW2l0ZW1JZF0uYm91Z2h0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZWxvYWRJdGVtKGtpdGVtc1tpdGVtSWRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuY2F0Y2goIGVyciA9PiB3aW5kb3cuY29uc29sZS5lcnJvcihlcnIpKTtcbiAgICB9KS5vcGVuKCk7XG59O1xuXG5jb25zdCBraXRlbUFjdGlvbnMgPSAoKSA9PiB7XG5cbiAgICBraXRlbXNDb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcbiAgICAgICAgaWYoZS50YXJnZXQpe1xuICAgICAgICAgICAgaWYoZS50YXJnZXQubWF0Y2hlcygnLmJvb2snKSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBib29rSXRlbShlLnRhcmdldC5jbG9zZXN0KCcua2l0ZW0nKS5kYXRhc2V0LmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGUudGFyZ2V0Lm1hdGNoZXMoJy5idXknKSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBidXlJdGVtKGUudGFyZ2V0LmNsb3Nlc3QoJy5raXRlbScpLmRhdGFzZXQuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5jb25zdCBsaXN0RGV0YWlscyA9IGxpc3QgPT4ge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHkgPiBoZWFkZXIgPiBoMScpLnRleHRDb250ZW50ID0gbGlzdC50aXRsZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdtYWluIC5kZXRhaWxzJykudGV4dENvbnRlbnQgPSBsaXN0LmRlc2M7XG59O1xuXG5jb25zdCBnZXRMaXN0TmFtZSA9ICgpID0+IHtcbiAgICBjb25zdCAgcGF0aHMgPVxuICAgICAgICBkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZVxuICAgICAgICAgICAgLnNwbGl0KCcvJylcbiAgICAgICAgICAgIC5maWx0ZXIoIHAgPT4gcCAmJiBwLnRyaW0oKS5sZW5ndGggKTtcbiAgICBpZihwYXRocyAmJiBwYXRocy5sZW5ndGggPiAwKXtcbiAgICAgICAgcmV0dXJuIHBhdGhzWzBdO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5jb25zdCBsb2FkTGlzdCA9ICgpID0+IHtcbiAgICBjb25zdCBuYW1lID0gZ2V0TGlzdE5hbWUoKSB8fCAnYmVyZW0yJztcbiAgICBpZihuYW1lKXtcbiAgICAgICAgZmV0Y2goYC9rbGlzdC8ke25hbWV9YClcbiAgICAgICAgICAgIC50aGVuKCByZXN1bHQgPT4gcmVzdWx0Lmpzb24oKSlcbiAgICAgICAgICAgIC50aGVuKCBsaXN0ID0+IHtcbiAgICAgICAgICAgICAgICBpZihsaXN0ICYmIGxpc3QuaWQpe1xuICAgICAgICAgICAgICAgICAgICBsaXN0RGV0YWlscyhsaXN0KTtcbiAgICAgICAgICAgICAgICAgICAga2l0ZW1BY3Rpb25zKGxpc3QuaWQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmV0Y2goYC9raXRlbXM/bGlzdD0ke2xpc3QuaWR9YCkudGhlbiggcmVzdWx0ID0+IHJlc3VsdC5qc29uKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbiggaXRlbXMgPT4ge1xuICAgICAgICAgICAgICAgIGlmKGl0ZW1zLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLmZvckVhY2goIGl0ZW0gPT4ga2l0ZW1zW2l0ZW0uaWRdID0gaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIGFkZEtpdGVtcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goIGVyciA9PiB3aW5kb3cuY29uc29sZS5lcnJvcihlcnIpKTtcbiAgICB9XG59O1xuXG5sb2FkTGlzdCgpO1xuIiwiaW1wb3J0IG1vZGFsIGZyb20gJy4vbW9kYWwuanMnO1xuXG5jb25zdCBjb25maXJtRmFjdG9yeSA9IGZ1bmN0aW9uICh0aXRsZSA9ICdQbGVhc2UgY29uZmlybScsIG1lc3NhZ2UgPSAnJywgZG9uZSl7XG5cbiAgICByZXR1cm4gbW9kYWwodGl0bGUsIG1lc3NhZ2UsIFt7XG4gICAgICAgIGxhYmVsIDogJ0FubnVsZXInLFxuICAgICAgICBjbG9zZSA6IHRydWUsXG4gICAgfSwge1xuICAgICAgICBsYWJlbCA6ICdDb25maXJtZXInLFxuICAgICAgICBjbG9zZSA6IHRydWUsXG4gICAgICAgIGFjdGlvbiA6IGRvbmVcbiAgICB9XSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjb25maXJtRmFjdG9yeTtcbiIsIlxuXG5jb25zdCBtb2RhbEZhY3RvcnkgPSBmdW5jdGlvbiAodGl0bGUgPSAnJywgY29udGVudCA9ICcnLCBidXR0b25zID0gW3sgbGFiZWwgOiAnT2snLCBjbG9zZSA6IHRydWUsIGFjdGlvbiA6ICgpID0+IHt9IH1dKXtcblxuICAgIGNvbnN0IG1vZGFsQ29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYm9keScpO1xuXG4gICAgY29uc3QgcmVtb3ZlUHJldmlvdXNNb2RhbHMgPSAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHByZXZpb3VzTW9kYWxzID0gbW9kYWxDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLm1vZGFsJyk7XG4gICAgICAgIGlmKHByZXZpb3VzTW9kYWxzLmxlbmd0aCl7XG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocHJldmlvdXNNb2RhbHMsIG1vZGFsID0+IG1vZGFsQ29udGFpbmVyLnJlbW92ZUNoaWxkKG1vZGFsKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgbW9kYWwgPSB7XG4gICAgICAgIGluaXQoKSB7XG4gICAgICAgICAgICBjb25zdCBhZGRNb2RhbCA9ICgpID0+IHtcblxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsRWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgbW9kYWxFbHQuY2xhc3NMaXN0LmFkZCgnbW9kYWwnKTtcbiAgICAgICAgICAgICAgICBtb2RhbEVsdC5pbm5lckhUTUwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxoMT4ke3RpdGxlfTwvaDE+XG4gICAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2NvbnRlbnR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8Zm9ybT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBuYW1lPVwiY29tbWVudFwiIHBsYWNlaG9sZGVyPVwiVW4gcGV0aXQgbW90LCB1biBjb21tZW50YWlyZSwgbWVyY2lcIj48L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgICAgICA8L2Zvcm0+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhY3Rpb25zXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbnMgPSBtb2RhbEVsdC5xdWVyeVNlbGVjdG9yKCcuYWN0aW9ucycpO1xuICAgICAgICAgICAgICAgIGJ1dHRvbnMuZm9yRWFjaCggYnV0dG9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYnV0dG9uRWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbkVsdC50ZXh0Q29udGVudCA9IGJ1dHRvbi5sYWJlbDtcbiAgICAgICAgICAgICAgICAgICAgaWYoYnV0dG9uLmNsb3NlIHx8IGJ1dHRvbi5hY3Rpb24pe1xuICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9uRWx0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGJ1dHRvbi5jbG9zZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIGJ1dHRvbi5hY3Rpb24gPT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidXR0b24uYWN0aW9uLmNhbGwobnVsbCwgbW9kYWxFbHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnMuYXBwZW5kQ2hpbGQoYnV0dG9uRWx0KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIG1vZGFsQ29udGFpbmVyLmFwcGVuZENoaWxkKG1vZGFsRWx0KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBtb2RhbEVsdDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IGFkZE92ZXJsYXkgICAgID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG92ZXJsYXlzID0gbW9kYWxDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLm92ZXJsYXknKTtcblxuICAgICAgICAgICAgICAgIGlmKG92ZXJsYXlzLmxlbmd0aCA9PT0gMCl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcmxheS5jbGFzc0xpc3QuYWRkKCdvdmVybGF5Jyk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGFsQ29udGFpbmVyLmFwcGVuZENoaWxkKG92ZXJsYXkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3ZlcmxheTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gb3ZlcmxheXNbMF07XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZW1vdmVQcmV2aW91c01vZGFscygpO1xuXG4gICAgICAgICAgICB0aGlzLm92ZXJsYXlFbHQgPSBhZGRPdmVybGF5KCk7XG4gICAgICAgICAgICB0aGlzLm1vZGFsRWx0ID0gYWRkTW9kYWwoKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb3Blbigpe1xuXG5cbiAgICAgICAgICAgIHRoaXMub3ZlcmxheUVsdC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIHRoaXMubW9kYWxFbHQuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsb3NlKCl7XG4gICAgICAgICAgICB0aGlzLm92ZXJsYXlFbHQuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICAgICAgICB0aGlzLm1vZGFsRWx0LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIG1vZGFsLmluaXQoKTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgbW9kYWxGYWN0b3J5O1xuIl19
