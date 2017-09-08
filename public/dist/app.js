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

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwicHVibGljL2pzL2FwcC5qcyIsInB1YmxpYy9qcy9jb21wb25lbnRzL2NvbmZpcm0uanMiLCJwdWJsaWMvanMvY29tcG9uZW50cy9tb2RhbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUFvQixTQUFwQjtBQUNILGlCQWZEOztBQWlCQSwrQkFBZSxXQUFmLENBQTJCLFFBQTNCOztBQUVBLHVCQUFPLFFBQVA7QUFDSCxhQWpDRDs7QUFtQ0EsZ0JBQU0sYUFBaUIsU0FBakIsVUFBaUIsR0FBTTtBQUN6QixvQkFBTSxXQUFXLGVBQWUsZ0JBQWYsQ0FBZ0MsVUFBaEMsQ0FBakI7O0FBRUEsb0JBQUcsU0FBUyxNQUFULEtBQW9CLENBQXZCLEVBQXlCO0FBQ3JCLHdCQUFNLFVBQVUsU0FBUyxhQUFULENBQXVCLEtBQXZCLENBQWhCO0FBQ0EsNEJBQVEsU0FBUixDQUFrQixHQUFsQixDQUFzQixTQUF0QjtBQUNBLG1DQUFlLFdBQWYsQ0FBMkIsT0FBM0I7QUFDQSwyQkFBTyxPQUFQO0FBQ0g7O0FBRUQsdUJBQU8sU0FBUyxDQUFULENBQVA7QUFDSCxhQVhEOztBQWFBOztBQUVBLGlCQUFLLFVBQUwsR0FBa0IsWUFBbEI7QUFDQSxpQkFBSyxRQUFMLEdBQWdCLFVBQWhCOztBQUVBLG1CQUFPLElBQVA7QUFDSCxTQXhEUztBQTBEVixZQTFEVSxrQkEwREo7O0FBR0YsaUJBQUssVUFBTCxDQUFnQixTQUFoQixDQUEwQixHQUExQixDQUE4QixRQUE5QjtBQUNBLGlCQUFLLFFBQUwsQ0FBYyxTQUFkLENBQXdCLEdBQXhCLENBQTRCLFFBQTVCOztBQUVBLG1CQUFPLElBQVA7QUFDSCxTQWpFUztBQW1FVixhQW5FVSxtQkFtRUg7QUFDSCxpQkFBSyxVQUFMLENBQWdCLFNBQWhCLENBQTBCLE1BQTFCLENBQWlDLFFBQWpDO0FBQ0EsaUJBQUssUUFBTCxDQUFjLFNBQWQsQ0FBd0IsTUFBeEIsQ0FBK0IsUUFBL0I7O0FBRUEsbUJBQU8sSUFBUDtBQUNIO0FBeEVTLEtBQWQ7QUEwRUEsV0FBTyxNQUFNLElBQU4sRUFBUDtBQUVILENBdkZEOztrQkF5RmUsWSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGhlYWRlcnMpKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGhlYWRlclswXSwgaGVhZGVyWzFdKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLm1hcFtuYW1lXVxuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSsnLCcrdmFsdWUgOiB2YWx1ZVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHRoaXMubWFwKSB7XG4gICAgICBpZiAodGhpcy5tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLm1hcFtuYW1lXSwgbmFtZSwgdGhpcylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChuYW1lKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IGl0ZW1zLnB1c2godmFsdWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2goW25hbWUsIHZhbHVlXSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgdmFyIGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpXG4gICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKVxuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpXG4gICAgICAgIC8vIElFIDEwLTExIGNhbid0IGhhbmRsZSBhIERhdGFWaWV3IGJvZHkuXG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gbmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSkpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZWFkQXJyYXlCdWZmZXJBc1RleHQodGhpcy5fYm9keUFycmF5QnVmZmVyKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG5cbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBSZXF1ZXN0KSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5ICYmIGlucHV0Ll9ib2R5SW5pdCAhPSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gU3RyaW5nKGlucHV0KVxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLCB7IGJvZHk6IHRoaXMuX2JvZHlJbml0IH0pXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycygpXG4gICAgcmF3SGVhZGVycy5zcGxpdCgvXFxyP1xcbi8pLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgdmFyIHBhcnRzID0gbGluZS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gcGFydHMuc2hpZnQoKS50cmltKClcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFydHMuam9pbignOicpLnRyaW0oKVxuICAgICAgICBoZWFkZXJzLmFwcGVuZChrZXksIHZhbHVlKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRlcnNcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSAnc3RhdHVzJyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXMgOiAyMDBcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gJ3N0YXR1c1RleHQnIGluIG9wdGlvbnMgPyBvcHRpb25zLnN0YXR1c1RleHQgOiAnT0snXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IHBhcnNlSGVhZGVycyh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpXG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy51cmwgPSAncmVzcG9uc2VVUkwnIGluIHhociA/IHhoci5yZXNwb25zZVVSTCA6IG9wdGlvbnMuaGVhZGVycy5nZXQoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiaW1wb3J0ICd3aGF0d2ctZmV0Y2gnO1xuaW1wb3J0IGNvbmZpcm1Db21wb25lbnQgZnJvbSAnLi9jb21wb25lbnRzL2NvbmZpcm0uanMnO1xuXG5jb25zdCBraXRlbXMgPSB7fTtcblxuY29uc3Qga2l0ZW1zQ29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmtpdGVtcycpO1xuXG5jb25zdCBnZXRLaXRlbUNvbnRlbnQgPSBpdGVtID0+IHtcbiAgICBsZXQgY29udGVudCAgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRtYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHtpdGVtLnVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW1nIHNyYz1cIiR7aXRlbS5pbWFnZX1cIiBhbHQ9XCIke2l0ZW0ubmFtZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxoMj4ke2l0ZW0ubmFtZX08L2gyPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwid2FyblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJpY29uIGljb24tJHtpdGVtLmV4YWN0ID8gJ2FsZXJ0JyA6ICdnaWZ0J31cIj48L3NwYW4+ICR7aXRlbS5leGFjdCA/ICdNb2TDqGxlIGV4YWN0ZScgOiAnTW9kw6hsZSBsaWJyZSAvIElkw6llIGNhZGVhdSd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cImRlc2NcIj4ke2l0ZW0uZGVzY308L3A+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmljZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHByb2dyZXNzIHZhbHVlPVwiJHtpdGVtLmZ1bmRlZH1cIiBtYXg9XCIke2l0ZW0ucHJpY2V9XCIgdGl0bGU9XCJSZXN0ZSAke2l0ZW0ucHJpY2UgLSBpdGVtLmZ1bmRlZH0g4oKsXCI+PC9wcm9ncmVzcz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYW1vdW50XCI+JHtpdGVtLnByaWNlfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgaWYoaXRlbS5ib29rZWQpe1xuICAgICAgICAgICAgY29udGVudCArPSAnPHN0cm9uZz5BcnRpY2xlIHLDqXNlcnbDqTwvc3Ryb25nPic7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbS5ib3VnaHQpe1xuICAgICAgICAgICAgY29udGVudCArPSAnPHN0cm9uZz5BcnRpY2xlIGFjaGV0w6k8L3N0cm9uZz4nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29udGVudCArPSBgXG4gICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cImFjdGlvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsaT48YSBocmVmPVwiJHtpdGVtLnVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIiA+PHNwYW4gY2xhc3M9XCJpY29uIGljb24tZ2xvYmVcIj48L3NwYW4+IFNpdGUgd2ViPC9hPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIiBjbGFzcz1cImJvb2tcIj48c3BhbiBjbGFzcz1cImljb24gaWNvbi1sb2NrXCI+PC9zcGFuPiBSw6lzZXJ2ZXI8L2E+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsaT48YSBocmVmPVwiI1wiIGNsYXNzPVwiYnV5XCI+PHNwYW4gY2xhc3M9XCJpY29uIGljb24tY3JlZGl0LWNhcmRcIj48L3NwYW4+IEFjaGV0ZXI8L2E+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsaT48YSBocmVmPVwiI1wiIGNsYXNzPVwicGFydGljaXBhdGVcIjovL3d3dy5sZWV0Y2hpLmNvbS9jL25haXNzYW5jZS1kZS1iLWNoZXZyaWVyLWJvcXVldFwiIGNsYXNzPVwicGFydGljaXBhdGVcIj48c3BhbiBjbGFzcz1cImljb24gaWNvbi1zcXVpcnJlbFwiPjwvc3Bhbj4gUGFydGljaXBlcjwvYT48L2xpPlxuICAgICAgICAgICAgICAgICAgICA8L3VsPmA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfTtcblxuICAgIGNvbnN0IGFkZEl0ZW0gPSBpdGVtID0+IHtcbiAgICBjb25zdCBraXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2FydGljbGUnKTtcbiAgICBraXRlbS5jbGFzc0xpc3QuYWRkKCdraXRlbScpO1xuICAgIGtpdGVtLmRhdGFzZXQuaWQgPSBpdGVtLmlkO1xuICAgIGtpdGVtLmlubmVySFRNTCA9IGdldEtpdGVtQ29udGVudChpdGVtKTtcbiAgICBraXRlbXNDb250YWluZXIuYXBwZW5kQ2hpbGQoa2l0ZW0pO1xufTtcbmNvbnN0IHJlbG9hZEl0ZW0gPSBpdGVtID0+IHtcbiAgICBjb25zdCBraXRlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYC5raXRlbVtkYXRhLWlkPScke2l0ZW0uaWR9J11gKTtcbiAgICBraXRlbS5pbm5lckhUTUwgPSBnZXRLaXRlbUNvbnRlbnQoaXRlbSk7XG59O1xuXG5jb25zdCBhZGRLaXRlbXMgPSAoKSA9PiBPYmplY3QudmFsdWVzKGtpdGVtcykuZm9yRWFjaChhZGRJdGVtKTtcblxuY29uc3QgYm9va0l0ZW0gPSBpdGVtSWQgPT4ge1xuICAgIGNvbmZpcm1Db21wb25lbnQoJ1ZldWlsbGVyIGNvbmZpcm1lciBsYSByw6lzZXJ2YXRpb24nLCAnVW5lIGZvaXMgY29uZmlybcOpLCBsXFwnYXJ0aWNsZSBuZSBzZXJhIHBsdXMgYWNjZXNzaWJsZScsICgpID0+IHtcbiAgICAgICAgZmV0Y2goYC9raXRlbS9ib29rP2l0ZW09JHtpdGVtSWR9YCwgeyBtZXRob2QgOiAncG9zdCcgfSlcbiAgICAgICAgICAgIC50aGVuKCByZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgICAgICAgICAgICBraXRlbXNbaXRlbUlkXS5ib29rZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZWxvYWRJdGVtKGtpdGVtc1tpdGVtSWRdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKCBlcnIgPT4gY29uc29sZS5lcnJvcihlcnIpKTtcbiAgICB9KS5vcGVuKCk7XG59O1xuXG5jb25zdCBidXlJdGVtID0gaXRlbUlkID0+IHtcbiAgICBjb25maXJtQ29tcG9uZW50KCdWZXVpbGxlciBjb25maXJtZXIgbFxcJ2FjaGF0JywgJ1VuZSBmb2lzIGNvbmZpcm3DqSwgbFxcJ2FydGljbGUgbmUgc2VyYSBwbHVzIGFjY2Vzc2libGUnLCAoKSA9PiB7XG4gICAgICAgIGZldGNoKGAva2l0ZW0vYnV5P2l0ZW09JHtpdGVtSWR9YCwgeyBtZXRob2QgOiAncG9zdCcgfSlcbiAgICAgICAgICAgIC50aGVuKCByZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgICAgICAgICAgICBraXRlbXNbaXRlbUlkXS5ib3VnaHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZWxvYWRJdGVtKGtpdGVtc1tpdGVtSWRdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goIGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuICAgIH0pLm9wZW4oKTtcbn07XG5cbmNvbnN0IHBhcnRpY2lwYXRlID0gaXRlbUlkID0+IHtcbiAgICBjb25maXJtQ29tcG9uZW50KCdWb3VzIHNvdWhhaXRleiBwYXJ0aWNpcGVyID8nLCAnVm91cyBzZXJleiByZWRpcmlnw6kgc3VyIG5vdHJlIGNhZ25vdHRlIExlZXRjaGkuJywgKCkgPT4ge1xuICAgICAgICB3aW5kb3cub3BlbignaHR0cHM6Ly93d3cubGVldGNoaS5jb20vYy9uYWlzc2FuY2UtZGUtYi1jaGV2cmllci1ib3F1ZXQnLCAnX2JsYW5rJyk7XG4gICAgfSkub3BlbigpO1xufTtcblxuY29uc3Qga2l0ZW1BY3Rpb25zID0gKCkgPT4ge1xuXG4gICAga2l0ZW1zQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XG4gICAgICAgIGlmKGUudGFyZ2V0KXtcbiAgICAgICAgICAgIGlmKGUudGFyZ2V0Lm1hdGNoZXMoJy5ib29rJykpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgYm9va0l0ZW0oZS50YXJnZXQuY2xvc2VzdCgnLmtpdGVtJykuZGF0YXNldC5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihlLnRhcmdldC5tYXRjaGVzKCcuYnV5JykpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgYnV5SXRlbShlLnRhcmdldC5jbG9zZXN0KCcua2l0ZW0nKS5kYXRhc2V0LmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGUudGFyZ2V0Lm1hdGNoZXMoJy5wYXJ0aWNpcGF0ZScpKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHBhcnRpY2lwYXRlKGUudGFyZ2V0LmNsb3Nlc3QoJy5raXRlbScpLmRhdGFzZXQuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5jb25zdCBsaXN0RGV0YWlscyA9IGxpc3QgPT4ge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHkgPiBoZWFkZXIgPiBoMScpLnRleHRDb250ZW50ID0gbGlzdC50aXRsZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdtYWluIC5kZXRhaWxzJykudGV4dENvbnRlbnQgPSBsaXN0LmRlc2M7XG59O1xuXG5jb25zdCBnZXRMaXN0TmFtZSA9ICgpID0+IHtcbiAgICBjb25zdCAgcGF0aHMgPVxuICAgICAgICBkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZVxuICAgICAgICAgICAgLnNwbGl0KCcvJylcbiAgICAgICAgICAgIC5maWx0ZXIoIHAgPT4gcCAmJiBwLnRyaW0oKS5sZW5ndGggKTtcbiAgICBpZihwYXRocyAmJiBwYXRocy5sZW5ndGggPiAwKXtcbiAgICAgICAgcmV0dXJuIHBhdGhzWzBdO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5jb25zdCBsb2FkTGlzdCA9ICgpID0+IHtcbiAgICBjb25zdCBuYW1lID0gZ2V0TGlzdE5hbWUoKTtcbiAgICBpZihuYW1lKXtcbiAgICAgICAgZmV0Y2goYC9rbGlzdC8ke25hbWV9YClcbiAgICAgICAgICAgIC50aGVuKCByZXN1bHQgPT4gcmVzdWx0Lmpzb24oKSlcbiAgICAgICAgICAgIC50aGVuKCBsaXN0ID0+IHtcbiAgICAgICAgICAgICAgICBpZihsaXN0ICYmIGxpc3QuaWQpe1xuICAgICAgICAgICAgICAgICAgICBsaXN0RGV0YWlscyhsaXN0KTtcbiAgICAgICAgICAgICAgICAgICAga2l0ZW1BY3Rpb25zKGxpc3QuaWQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmV0Y2goYC9raXRlbXM/bGlzdD0ke2xpc3QuaWR9YCkudGhlbiggcmVzdWx0ID0+IHJlc3VsdC5qc29uKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbiggaXRlbXMgPT4ge1xuICAgICAgICAgICAgICAgIGlmKGl0ZW1zLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLmZvckVhY2goIGl0ZW0gPT4ga2l0ZW1zW2l0ZW0uaWRdID0gaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIGFkZEtpdGVtcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goIGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuICAgIH1cbn07XG5cbmxvYWRMaXN0KCk7XG4iLCJpbXBvcnQgbW9kYWwgZnJvbSAnLi9tb2RhbC5qcyc7XG5cbmNvbnN0IGNvbmZpcm1GYWN0b3J5ID0gZnVuY3Rpb24gKHRpdGxlID0gJ1BsZWFzZSBjb25maXJtJywgbWVzc2FnZSA9ICcnLCBkb25lKXtcblxuICAgIHJldHVybiBtb2RhbCh0aXRsZSwgbWVzc2FnZSwgW3tcbiAgICAgICAgbGFiZWwgOiAnQW5udWxlcicsXG4gICAgICAgIGNsb3NlIDogdHJ1ZSxcbiAgICB9LCB7XG4gICAgICAgIGxhYmVsIDogJ0NvbmZpcm1lcicsXG4gICAgICAgIGNsb3NlIDogdHJ1ZSxcbiAgICAgICAgYWN0aW9uIDogZG9uZVxuICAgIH1dKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNvbmZpcm1GYWN0b3J5O1xuIiwiXG5cbmNvbnN0IG1vZGFsRmFjdG9yeSA9IGZ1bmN0aW9uICh0aXRsZSA9ICcnLCBjb250ZW50ID0gJycsIGJ1dHRvbnMgPSBbeyBsYWJlbCA6ICdPaycsIGNsb3NlIDogdHJ1ZSwgYWN0aW9uIDogKCkgPT4ge30gfV0pe1xuXG4gICAgY29uc3QgbW9kYWxDb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk7XG5cbiAgICBjb25zdCByZW1vdmVQcmV2aW91c01vZGFscyA9ICgpID0+IHtcbiAgICAgICAgY29uc3QgcHJldmlvdXNNb2RhbHMgPSBtb2RhbENvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcubW9kYWwnKTtcbiAgICAgICAgaWYocHJldmlvdXNNb2RhbHMubGVuZ3RoKXtcbiAgICAgICAgICAgIC8vW10uZm9yRWFjaC5jYWxsKHByZXZpb3VzTW9kYWxzLCBtb2RhbCA9PiBtb2RhbENvbnRhaW5lci5yZW1vdmVDaGlsZChtb2RhbCkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IG1vZGFsID0ge1xuICAgICAgICBpbml0KCkge1xuICAgICAgICAgICAgY29uc3QgYWRkTW9kYWwgPSAoKSA9PiB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtb2RhbEVsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgIG1vZGFsRWx0LmNsYXNzTGlzdC5hZGQoJ21vZGFsJyk7XG4gICAgICAgICAgICAgICAgbW9kYWxFbHQuaW5uZXJIVE1MID0gYFxuICAgICAgICAgICAgICAgICAgICA8aDE+JHt0aXRsZX08L2gxPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtjb250ZW50fVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjdGlvbnNcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9ucyA9IG1vZGFsRWx0LnF1ZXJ5U2VsZWN0b3IoJy5hY3Rpb25zJyk7XG4gICAgICAgICAgICAgICAgYnV0dG9ucy5mb3JFYWNoKCBidXR0b24gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBidXR0b25FbHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uRWx0LnRleHRDb250ZW50ID0gYnV0dG9uLmxhYmVsO1xuICAgICAgICAgICAgICAgICAgICBpZihidXR0b24uY2xvc2UgfHwgYnV0dG9uLmFjdGlvbil7XG4gICAgICAgICAgICAgICAgICAgICAgICBidXR0b25FbHQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYnV0dG9uLmNsb3NlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgYnV0dG9uLmFjdGlvbiA9PT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbi5hY3Rpb24uY2FsbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnMuYXBwZW5kQ2hpbGQoYnV0dG9uRWx0KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIG1vZGFsQ29udGFpbmVyLmFwcGVuZENoaWxkKG1vZGFsRWx0KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBtb2RhbEVsdDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IGFkZE92ZXJsYXkgICAgID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG92ZXJsYXlzID0gbW9kYWxDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLm92ZXJsYXknKTtcblxuICAgICAgICAgICAgICAgIGlmKG92ZXJsYXlzLmxlbmd0aCA9PT0gMCl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcmxheS5jbGFzc0xpc3QuYWRkKCdvdmVybGF5Jyk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGFsQ29udGFpbmVyLmFwcGVuZENoaWxkKG92ZXJsYXkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3ZlcmxheTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gb3ZlcmxheXNbMF07XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZW1vdmVQcmV2aW91c01vZGFscygpO1xuXG4gICAgICAgICAgICB0aGlzLm92ZXJsYXlFbHQgPSBhZGRPdmVybGF5KCk7XG4gICAgICAgICAgICB0aGlzLm1vZGFsRWx0ID0gYWRkTW9kYWwoKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb3Blbigpe1xuXG5cbiAgICAgICAgICAgIHRoaXMub3ZlcmxheUVsdC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIHRoaXMubW9kYWxFbHQuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsb3NlKCl7XG4gICAgICAgICAgICB0aGlzLm92ZXJsYXlFbHQuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICAgICAgICB0aGlzLm1vZGFsRWx0LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIG1vZGFsLmluaXQoKTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgbW9kYWxGYWN0b3J5O1xuIl19
