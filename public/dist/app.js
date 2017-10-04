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
        content += '<li><a href="#" class="participate"><span class="icon icon-squirrel"></span> Participer</a></li>\n            </ul>';
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

var participate = function participate() {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwicHVibGljL2pzL2FwcC5qcyIsInB1YmxpYy9qcy9jb21wb25lbnRzL2NvbmZpcm0uanMiLCJwdWJsaWMvanMvY29tcG9uZW50cy9tb2RhbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdjQTs7QUFDQTs7Ozs7O0FBRUEsSUFBTSxTQUFTLEVBQWY7O0FBRUEsSUFBTSxrQkFBa0IsU0FBUyxhQUFULENBQXVCLFNBQXZCLENBQXhCOztBQUVBLElBQU0sa0JBQWtCLFNBQWxCLGVBQWtCLE9BQVE7QUFDNUIsUUFBRyxLQUFLLE1BQVIsRUFBZTtBQUNYLGFBQUssTUFBTCxHQUFjLEtBQUssS0FB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QUNIOztBQUVELHVCQUFPLFNBQVMsQ0FBVCxDQUFQO0FBQ0gsYUFYRDs7QUFhQTs7QUFFQSxpQkFBSyxVQUFMLEdBQWtCLFlBQWxCO0FBQ0EsaUJBQUssUUFBTCxHQUFnQixVQUFoQjs7QUFFQSxtQkFBTyxJQUFQO0FBQ0gsU0EzRFM7QUE2RFYsWUE3RFUsa0JBNkRKOztBQUdGLGlCQUFLLFVBQUwsQ0FBZ0IsU0FBaEIsQ0FBMEIsR0FBMUIsQ0FBOEIsUUFBOUI7QUFDQSxpQkFBSyxRQUFMLENBQWMsU0FBZCxDQUF3QixHQUF4QixDQUE0QixRQUE1Qjs7QUFFQSxtQkFBTyxJQUFQO0FBQ0gsU0FwRVM7QUFzRVYsYUF0RVUsbUJBc0VIO0FBQ0gsaUJBQUssVUFBTCxDQUFnQixTQUFoQixDQUEwQixNQUExQixDQUFpQyxRQUFqQztBQUNBLGlCQUFLLFFBQUwsQ0FBYyxTQUFkLENBQXdCLE1BQXhCLENBQStCLFFBQS9COztBQUVBLG1CQUFPLElBQVA7QUFDSDtBQTNFUyxLQUFkO0FBNkVBLFdBQU8sTUFBTSxJQUFOLEVBQVA7QUFFSCxDQTFGRDs7a0JBNEZlLFkiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlcikge1xuICAgIHZhciB2aWV3Q2xhc3NlcyA9IFtcbiAgICAgICdbb2JqZWN0IEludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDY0QXJyYXldJ1xuICAgIF1cblxuICAgIHZhciBpc0RhdGFWaWV3ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIERhdGFWaWV3LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iailcbiAgICB9XG5cbiAgICB2YXIgaXNBcnJheUJ1ZmZlclZpZXcgPSBBcnJheUJ1ZmZlci5pc1ZpZXcgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIHZpZXdDbGFzc2VzLmluZGV4T2YoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikpID4gLTFcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiB7ZG9uZTogdmFsdWUgPT09IHVuZGVmaW5lZCwgdmFsdWU6IHZhbHVlfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShoZWFkZXJzKSkge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgICB0aGlzLmFwcGVuZChoZWFkZXJbMF0sIGhlYWRlclsxXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIG9sZFZhbHVlID0gdGhpcy5tYXBbbmFtZV1cbiAgICB0aGlzLm1hcFtuYW1lXSA9IG9sZFZhbHVlID8gb2xkVmFsdWUrJywnK3ZhbHVlIDogdmFsdWVcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHJldHVybiB0aGlzLmhhcyhuYW1lKSA/IHRoaXMubWFwW25hbWVdIDogbnVsbFxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShub3JtYWxpemVOYW1lKG5hbWUpKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLm1hcCkge1xuICAgICAgaWYgKHRoaXMubWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5tYXBbbmFtZV0sIG5hbWUsIHRoaXMpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2gobmFtZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkgeyBpdGVtcy5wdXNoKHZhbHVlKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKFtuYW1lLCB2YWx1ZV0pIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICBIZWFkZXJzLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID0gSGVhZGVycy5wcm90b3R5cGUuZW50cmllc1xuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEFycmF5QnVmZmVyQXNUZXh0KGJ1Zikge1xuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIHZhciBjaGFycyA9IG5ldyBBcnJheSh2aWV3Lmxlbmd0aClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hhcnNbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHZpZXdbaV0pXG4gICAgfVxuICAgIHJldHVybiBjaGFycy5qb2luKCcnKVxuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyQ2xvbmUoYnVmKSB7XG4gICAgaWYgKGJ1Zi5zbGljZSkge1xuICAgICAgcmV0dXJuIGJ1Zi5zbGljZSgwKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zi5ieXRlTGVuZ3RoKVxuICAgICAgdmlldy5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmKSlcbiAgICAgIHJldHVybiB2aWV3LmJ1ZmZlclxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHkudG9TdHJpbmcoKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIHN1cHBvcnQuYmxvYiAmJiBpc0RhdGFWaWV3KGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkuYnVmZmVyKVxuICAgICAgICAvLyBJRSAxMC0xMSBjYW4ndCBoYW5kbGUgYSBEYXRhVmlldyBib2R5LlxuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIChBcnJheUJ1ZmZlci5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSB8fCBpc0FycmF5QnVmZmVyVmlldyhib2R5KSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlCbG9iICYmIHRoaXMuX2JvZHlCbG9iLnR5cGUpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCB0aGlzLl9ib2R5QmxvYi50eXBlKVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5ibG9iKSB7XG4gICAgICB0aGlzLmJsb2IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyBibG9iJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5VGV4dF0pKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYXJyYXlCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBjb25zdW1lZCh0aGlzKSB8fCBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUFycmF5QnVmZmVyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVhZEFycmF5QnVmZmVyQXNUZXh0KHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmZvcm1EYXRhKSB7XG4gICAgICB0aGlzLmZvcm1EYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKGRlY29kZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKEpTT04ucGFyc2UpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8vIEhUVFAgbWV0aG9kcyB3aG9zZSBjYXBpdGFsaXphdGlvbiBzaG91bGQgYmUgbm9ybWFsaXplZFxuICB2YXIgbWV0aG9kcyA9IFsnREVMRVRFJywgJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnXVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldGhvZChtZXRob2QpIHtcbiAgICB2YXIgdXBjYXNlZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpXG4gICAgcmV0dXJuIChtZXRob2RzLmluZGV4T2YodXBjYXNlZCkgPiAtMSkgPyB1cGNhc2VkIDogbWV0aG9kXG4gIH1cblxuICBmdW5jdGlvbiBSZXF1ZXN0KGlucHV0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB2YXIgYm9keSA9IG9wdGlvbnMuYm9keVxuXG4gICAgaWYgKGlucHV0IGluc3RhbmNlb2YgUmVxdWVzdCkge1xuICAgICAgaWYgKGlucHV0LmJvZHlVc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpXG4gICAgICB9XG4gICAgICB0aGlzLnVybCA9IGlucHV0LnVybFxuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IGlucHV0LmNyZWRlbnRpYWxzXG4gICAgICBpZiAoIW9wdGlvbnMuaGVhZGVycykge1xuICAgICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhpbnB1dC5oZWFkZXJzKVxuICAgICAgfVxuICAgICAgdGhpcy5tZXRob2QgPSBpbnB1dC5tZXRob2RcbiAgICAgIHRoaXMubW9kZSA9IGlucHV0Lm1vZGVcbiAgICAgIGlmICghYm9keSAmJiBpbnB1dC5fYm9keUluaXQgIT0gbnVsbCkge1xuICAgICAgICBib2R5ID0gaW5wdXQuX2JvZHlJbml0XG4gICAgICAgIGlucHV0LmJvZHlVc2VkID0gdHJ1ZVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVybCA9IFN0cmluZyhpbnB1dClcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcywgeyBib2R5OiB0aGlzLl9ib2R5SW5pdCB9KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUhlYWRlcnMocmF3SGVhZGVycykge1xuICAgIHZhciBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKVxuICAgIHJhd0hlYWRlcnMuc3BsaXQoL1xccj9cXG4vKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnRzLmpvaW4oJzonKS50cmltKClcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBoZWFkZXJzXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMuc3RhdHVzID0gJ3N0YXR1cycgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzIDogMjAwXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9ICdzdGF0dXNUZXh0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXNUZXh0IDogJ09LJ1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIFJlc3BvbnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UodGhpcy5fYm9keUluaXQsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiB0aGlzLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBuZXcgSGVhZGVycyh0aGlzLmhlYWRlcnMpLFxuICAgICAgdXJsOiB0aGlzLnVybFxuICAgIH0pXG4gIH1cblxuICBSZXNwb25zZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiAwLCBzdGF0dXNUZXh0OiAnJ30pXG4gICAgcmVzcG9uc2UudHlwZSA9ICdlcnJvcidcbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfVxuXG4gIHZhciByZWRpcmVjdFN0YXR1c2VzID0gWzMwMSwgMzAyLCAzMDMsIDMwNywgMzA4XVxuXG4gIFJlc3BvbnNlLnJlZGlyZWN0ID0gZnVuY3Rpb24odXJsLCBzdGF0dXMpIHtcbiAgICBpZiAocmVkaXJlY3RTdGF0dXNlcy5pbmRleE9mKHN0YXR1cykgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBzdGF0dXMgY29kZScpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiBzdGF0dXMsIGhlYWRlcnM6IHtsb2NhdGlvbjogdXJsfX0pXG4gIH1cblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzXG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3RcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlXG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChpbnB1dCwgaW5pdClcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBwYXJzZUhlYWRlcnMoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKVxuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMudXJsID0gJ3Jlc3BvbnNlVVJMJyBpbiB4aHIgPyB4aHIucmVzcG9uc2VVUkwgOiBvcHRpb25zLmhlYWRlcnMuZ2V0KCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbiIsImltcG9ydCAnd2hhdHdnLWZldGNoJztcbmltcG9ydCBjb25maXJtQ29tcG9uZW50IGZyb20gJy4vY29tcG9uZW50cy9jb25maXJtLmpzJztcblxuY29uc3Qga2l0ZW1zID0ge307XG5cbmNvbnN0IGtpdGVtc0NvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5raXRlbXMnKTtcblxuY29uc3QgZ2V0S2l0ZW1Db250ZW50ID0gaXRlbSA9PiB7XG4gICAgaWYoaXRlbS5ib3VnaHQpe1xuICAgICAgICBpdGVtLmZ1bmRlZCA9IGl0ZW0ucHJpY2U7XG4gICAgfVxuICAgIGxldCBjb250ZW50ICA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZG1hZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2l0ZW0udXJsfVwiIHRhcmdldD1cIl9ibGFua1wiIHJlbD1cIm5vb3BlbmVyIG5vcmVmZXJyZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW1nIHNyYz1cIiR7aXRlbS5pbWFnZX1cIiBhbHQ9XCIke2l0ZW0ubmFtZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxoMj4ke2l0ZW0ubmFtZX08L2gyPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwid2FyblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJpY29uIGljb24tJHtpdGVtLmV4YWN0ID8gJ2FsZXJ0JyA6ICdnaWZ0J31cIj48L3NwYW4+ICR7aXRlbS5leGFjdCA/ICdNb2TDqGxlIGV4YWN0ZScgOiAnTW9kw6hsZSBsaWJyZSAvIElkw6llIGNhZGVhdSd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cImRlc2NcIj4ke2l0ZW0uZGVzY308L3A+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmljZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHByb2dyZXNzIHZhbHVlPVwiJHtpdGVtLmZ1bmRlZH1cIiBtYXg9XCIke2l0ZW0ucHJpY2V9XCIgdGl0bGU9XCJSZXN0ZSAke2l0ZW0ucHJpY2UgLSBpdGVtLmZ1bmRlZH0g4oKsXCI+PC9wcm9ncmVzcz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYW1vdW50XCI+JHtpdGVtLnByaWNlfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICBpZiAoaXRlbS5ib3VnaHQpe1xuICAgICAgICBjb250ZW50ICs9ICc8c3Ryb25nPkFydGljbGUgYWNoZXTDqTwvc3Ryb25nPic7XG4gICAgfSBlbHNlIGlmKGl0ZW0uYm9va2VkKXtcbiAgICAgICAgY29udGVudCArPSBgPHN0cm9uZz5BcnRpY2xlIHLDqXNlcnbDqTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJhY3Rpb25zXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsaT48YSBocmVmPVwiJHtpdGVtLnVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIiByZWw9XCJub29wZW5lciBub3JlZmVycmVyXCI+PHNwYW4gY2xhc3M9XCJpY29uIGljb24tZ2xvYmVcIj48L3NwYW4+IFNpdGUgd2ViPC9hPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgIDxsaT48YSBocmVmPVwiI1wiIGNsYXNzPVwiYnV5XCI+PHNwYW4gY2xhc3M9XCJpY29uIGljb24tY3JlZGl0LWNhcmRcIj48L3NwYW4+IEFjaGV0ZXI8L2E+PC9saT5cbiAgICAgICAgICAgICAgICA8L3VsPmA7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb250ZW50ICs9IGBcbiAgICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJhY3Rpb25zXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsaT48YSBocmVmPVwiJHtpdGVtLnVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIiByZWw9XCJub29wZW5lciBub3JlZmVycmVyXCI+PHNwYW4gY2xhc3M9XCJpY29uIGljb24tZ2xvYmVcIj48L3NwYW4+IFNpdGUgd2ViPC9hPjwvbGk+YDtcbiAgICAgICAgaWYoIWl0ZW0uZnVuZE9ubHkpe1xuICAgICAgICAgICAgY29udGVudCArPSBgXG4gICAgICAgICAgICAgICAgICAgIDxsaT48YSBocmVmPVwiI1wiIGNsYXNzPVwiYm9va1wiPjxzcGFuIGNsYXNzPVwiaWNvbiBpY29uLWxvY2tcIj48L3NwYW4+IFLDqXNlcnZlcjwvYT48L2xpPlxuICAgICAgICAgICAgICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIiBjbGFzcz1cImJ1eVwiPjxzcGFuIGNsYXNzPVwiaWNvbiBpY29uLWNyZWRpdC1jYXJkXCI+PC9zcGFuPiBBY2hldGVyPC9hPjwvbGk+YDtcbiAgICAgICAgfVxuICAgICAgICBjb250ZW50ICs9IGA8bGk+PGEgaHJlZj1cIiNcIiBjbGFzcz1cInBhcnRpY2lwYXRlXCI+PHNwYW4gY2xhc3M9XCJpY29uIGljb24tc3F1aXJyZWxcIj48L3NwYW4+IFBhcnRpY2lwZXI8L2E+PC9saT5cbiAgICAgICAgICAgIDwvdWw+YDtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG59O1xuXG5jb25zdCBhZGRJdGVtID0gaXRlbSA9PiB7XG4gICAgY29uc3Qga2l0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhcnRpY2xlJyk7XG4gICAga2l0ZW0uY2xhc3NMaXN0LmFkZCgna2l0ZW0nKTtcbiAgICBraXRlbS5kYXRhc2V0LmlkID0gaXRlbS5pZDtcbiAgICBraXRlbS5pbm5lckhUTUwgPSBnZXRLaXRlbUNvbnRlbnQoaXRlbSk7XG4gICAga2l0ZW1zQ29udGFpbmVyLmFwcGVuZENoaWxkKGtpdGVtKTtcbn07XG5jb25zdCByZWxvYWRJdGVtID0gaXRlbSA9PiB7XG4gICAgY29uc3Qga2l0ZW0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAua2l0ZW1bZGF0YS1pZD0nJHtpdGVtLmlkfSddYCk7XG4gICAga2l0ZW0uaW5uZXJIVE1MID0gZ2V0S2l0ZW1Db250ZW50KGl0ZW0pO1xufTtcblxuY29uc3QgYWRkS2l0ZW1zID0gKCkgPT4gT2JqZWN0LnZhbHVlcyhraXRlbXMpLmZvckVhY2goYWRkSXRlbSk7XG5cbmNvbnN0IGJvb2tJdGVtID0gaXRlbUlkID0+IHtcbiAgICBjb25maXJtQ29tcG9uZW50KCdWZXVpbGxlciBjb25maXJtZXIgbGEgcsOpc2VydmF0aW9uJywgJ1VuZSBmb2lzIGNvbmZpcm3DqSwgbFxcJ2FydGljbGUgbmUgc2VyYSBwbHVzIGFjY2Vzc2libGUnLCBtb2RhbEVsdCA9PiB7XG4gICAgICAgIGNvbnN0IGNvbW1lbnQgPSBtb2RhbEVsdC5xdWVyeVNlbGVjdG9yKCd0ZXh0YXJlYVtuYW1lPWNvbW1lbnRdJyk7XG4gICAgICAgIGZldGNoKGAva2l0ZW0vYm9vaz9pdGVtPSR7aXRlbUlkfWAsIHtcbiAgICAgICAgICAgIG1ldGhvZCA6ICdQT1NUJyxcbiAgICAgICAgICAgIGJvZHkgOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgY29tbWVudCA6IGNvbW1lbnQudmFsdWVcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudGhlbiggcmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgaWYocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgICAgICAgIGtpdGVtc1tpdGVtSWRdLmJvb2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVsb2FkSXRlbShraXRlbXNbaXRlbUlkXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKCBlcnIgPT4gd2luZG93LmNvbnNvbGUuZXJyb3IoZXJyKSk7XG4gICAgfSkub3BlbigpO1xufTtcblxuY29uc3QgYnV5SXRlbSA9IGl0ZW1JZCA9PiB7XG4gICAgY29uZmlybUNvbXBvbmVudCgnVmV1aWxsZXIgY29uZmlybWVyIGxcXCdhY2hhdCcsICdVbmUgZm9pcyBjb25maXJtw6ksIGxcXCdhcnRpY2xlIG5lIHNlcmEgcGx1cyBhY2Nlc3NpYmxlJywgbW9kYWxFbHQgPT4ge1xuICAgICAgICBjb25zdCBjb21tZW50ID0gbW9kYWxFbHQucXVlcnlTZWxlY3RvcigndGV4dGFyZWFbbmFtZT1jb21tZW50XScpO1xuICAgICAgICBmZXRjaChgL2tpdGVtL2J1eT9pdGVtPSR7aXRlbUlkfWAsIHtcbiAgICAgICAgICAgIG1ldGhvZCA6ICdQT1NUJyxcbiAgICAgICAgICAgIGJvZHkgOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgY29tbWVudCA6IGNvbW1lbnQudmFsdWVcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudGhlbiggcmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgaWYocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgICAgICAgIGtpdGVtc1tpdGVtSWRdLmJvdWdodCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVsb2FkSXRlbShraXRlbXNbaXRlbUlkXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKCBlcnIgPT4gd2luZG93LmNvbnNvbGUuZXJyb3IoZXJyKSk7XG4gICAgfSkub3BlbigpO1xufTtcblxuY29uc3QgcGFydGljaXBhdGUgPSAoKSA9PiB7XG4gICAgY29uZmlybUNvbXBvbmVudCgnVm91cyBzb3VoYWl0ZXogcGFydGljaXBlciA/JywgJ1ZvdXMgc2VyZXogcmVkaXJpZ8OpIHN1ciBub3RyZSBjYWdub3R0ZSBMZWV0Y2hpLicsICgpID0+IHtcbiAgICAgICAgd2luZG93Lm9wZW4oJ2h0dHBzOi8vd3d3LmxlZXRjaGkuY29tL2MvbmFpc3NhbmNlLWRlLWItY2hldnJpZXItYm9xdWV0JywgJ19ibGFuaycpO1xuICAgIH0pLm9wZW4oKTtcbn07XG5cbmNvbnN0IGtpdGVtQWN0aW9ucyA9ICgpID0+IHtcblxuICAgIGtpdGVtc0NvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuICAgICAgICBpZihlLnRhcmdldCl7XG4gICAgICAgICAgICBpZihlLnRhcmdldC5tYXRjaGVzKCcuYm9vaycpKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGJvb2tJdGVtKGUudGFyZ2V0LmNsb3Nlc3QoJy5raXRlbScpLmRhdGFzZXQuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoZS50YXJnZXQubWF0Y2hlcygnLmJ1eScpKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGJ1eUl0ZW0oZS50YXJnZXQuY2xvc2VzdCgnLmtpdGVtJykuZGF0YXNldC5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihlLnRhcmdldC5tYXRjaGVzKCcucGFydGljaXBhdGUnKSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBwYXJ0aWNpcGF0ZShlLnRhcmdldC5jbG9zZXN0KCcua2l0ZW0nKS5kYXRhc2V0LmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuY29uc3QgbGlzdERldGFpbHMgPSBsaXN0ID0+IHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5ID4gaGVhZGVyID4gaDEnKS50ZXh0Q29udGVudCA9IGxpc3QudGl0bGU7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignbWFpbiAuZGV0YWlscycpLnRleHRDb250ZW50ID0gbGlzdC5kZXNjO1xufTtcblxuY29uc3QgZ2V0TGlzdE5hbWUgPSAoKSA9PiB7XG4gICAgY29uc3QgIHBhdGhzID1cbiAgICAgICAgZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWVcbiAgICAgICAgICAgIC5zcGxpdCgnLycpXG4gICAgICAgICAgICAuZmlsdGVyKCBwID0+IHAgJiYgcC50cmltKCkubGVuZ3RoICk7XG4gICAgaWYocGF0aHMgJiYgcGF0aHMubGVuZ3RoID4gMCl7XG4gICAgICAgIHJldHVybiBwYXRoc1swXTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuY29uc3QgbG9hZExpc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgbmFtZSA9IGdldExpc3ROYW1lKCkgfHwgJ2JlcmVtMic7XG4gICAgaWYobmFtZSl7XG4gICAgICAgIGZldGNoKGAva2xpc3QvJHtuYW1lfWApXG4gICAgICAgICAgICAudGhlbiggcmVzdWx0ID0+IHJlc3VsdC5qc29uKCkpXG4gICAgICAgICAgICAudGhlbiggbGlzdCA9PiB7XG4gICAgICAgICAgICAgICAgaWYobGlzdCAmJiBsaXN0LmlkKXtcbiAgICAgICAgICAgICAgICAgICAgbGlzdERldGFpbHMobGlzdCk7XG4gICAgICAgICAgICAgICAgICAgIGtpdGVtQWN0aW9ucyhsaXN0LmlkKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZldGNoKGAva2l0ZW1zP2xpc3Q9JHtsaXN0LmlkfWApLnRoZW4oIHJlc3VsdCA9PiByZXN1bHQuanNvbigpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oIGl0ZW1zID0+IHtcbiAgICAgICAgICAgICAgICBpZihpdGVtcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICBpdGVtcy5mb3JFYWNoKCBpdGVtID0+IGtpdGVtc1tpdGVtLmlkXSA9IGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICBhZGRLaXRlbXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKCBlcnIgPT4gd2luZG93LmNvbnNvbGUuZXJyb3IoZXJyKSk7XG4gICAgfVxufTtcblxubG9hZExpc3QoKTtcbiIsImltcG9ydCBtb2RhbCBmcm9tICcuL21vZGFsLmpzJztcblxuY29uc3QgY29uZmlybUZhY3RvcnkgPSBmdW5jdGlvbiAodGl0bGUgPSAnUGxlYXNlIGNvbmZpcm0nLCBtZXNzYWdlID0gJycsIGRvbmUpe1xuXG4gICAgcmV0dXJuIG1vZGFsKHRpdGxlLCBtZXNzYWdlLCBbe1xuICAgICAgICBsYWJlbCA6ICdBbm51bGVyJyxcbiAgICAgICAgY2xvc2UgOiB0cnVlLFxuICAgIH0sIHtcbiAgICAgICAgbGFiZWwgOiAnQ29uZmlybWVyJyxcbiAgICAgICAgY2xvc2UgOiB0cnVlLFxuICAgICAgICBhY3Rpb24gOiBkb25lXG4gICAgfV0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY29uZmlybUZhY3Rvcnk7XG4iLCJcblxuY29uc3QgbW9kYWxGYWN0b3J5ID0gZnVuY3Rpb24gKHRpdGxlID0gJycsIGNvbnRlbnQgPSAnJywgYnV0dG9ucyA9IFt7IGxhYmVsIDogJ09rJywgY2xvc2UgOiB0cnVlLCBhY3Rpb24gOiAoKSA9PiB7fSB9XSl7XG5cbiAgICBjb25zdCBtb2RhbENvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHknKTtcblxuICAgIGNvbnN0IHJlbW92ZVByZXZpb3VzTW9kYWxzID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBwcmV2aW91c01vZGFscyA9IG1vZGFsQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5tb2RhbCcpO1xuICAgICAgICBpZihwcmV2aW91c01vZGFscy5sZW5ndGgpe1xuICAgICAgICAgICAgW10uZm9yRWFjaC5jYWxsKHByZXZpb3VzTW9kYWxzLCBtb2RhbCA9PiBtb2RhbENvbnRhaW5lci5yZW1vdmVDaGlsZChtb2RhbCkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IG1vZGFsID0ge1xuICAgICAgICBpbml0KCkge1xuICAgICAgICAgICAgY29uc3QgYWRkTW9kYWwgPSAoKSA9PiB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtb2RhbEVsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgIG1vZGFsRWx0LmNsYXNzTGlzdC5hZGQoJ21vZGFsJyk7XG4gICAgICAgICAgICAgICAgbW9kYWxFbHQuaW5uZXJIVE1MID0gYFxuICAgICAgICAgICAgICAgICAgICA8aDE+JHt0aXRsZX08L2gxPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtjb250ZW50fVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGZvcm0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgbmFtZT1cImNvbW1lbnRcIiBwbGFjZWhvbGRlcj1cIlVuIHBldGl0IG1vdCwgdW4gY29tbWVudGFpcmUsIG1lcmNpXCI+PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICAgICAgPC9mb3JtPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWN0aW9uc1wiPjwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb25zID0gbW9kYWxFbHQucXVlcnlTZWxlY3RvcignLmFjdGlvbnMnKTtcbiAgICAgICAgICAgICAgICBidXR0b25zLmZvckVhY2goIGJ1dHRvbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJ1dHRvbkVsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICAgICAgICAgICAgICBidXR0b25FbHQudGV4dENvbnRlbnQgPSBidXR0b24ubGFiZWw7XG4gICAgICAgICAgICAgICAgICAgIGlmKGJ1dHRvbi5jbG9zZSB8fCBidXR0b24uYWN0aW9uKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbkVsdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihidXR0b24uY2xvc2Upe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBidXR0b24uYWN0aW9uID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9uLmFjdGlvbi5jYWxsKG51bGwsIG1vZGFsRWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zLmFwcGVuZENoaWxkKGJ1dHRvbkVsdCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBtb2RhbENvbnRhaW5lci5hcHBlbmRDaGlsZChtb2RhbEVsdCk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gbW9kYWxFbHQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCBhZGRPdmVybGF5ICAgICA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvdmVybGF5cyA9IG1vZGFsQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5vdmVybGF5Jyk7XG5cbiAgICAgICAgICAgICAgICBpZihvdmVybGF5cy5sZW5ndGggPT09IDApe1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvdmVybGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJsYXkuY2xhc3NMaXN0LmFkZCgnb3ZlcmxheScpO1xuICAgICAgICAgICAgICAgICAgICBtb2RhbENvbnRhaW5lci5hcHBlbmRDaGlsZChvdmVybGF5KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG92ZXJsYXk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG92ZXJsYXlzWzBdO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmVtb3ZlUHJldmlvdXNNb2RhbHMoKTtcblxuICAgICAgICAgICAgdGhpcy5vdmVybGF5RWx0ID0gYWRkT3ZlcmxheSgpO1xuICAgICAgICAgICAgdGhpcy5tb2RhbEVsdCA9IGFkZE1vZGFsKCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9wZW4oKXtcblxuXG4gICAgICAgICAgICB0aGlzLm92ZXJsYXlFbHQuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgICAgICAgICB0aGlzLm1vZGFsRWx0LmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBjbG9zZSgpe1xuICAgICAgICAgICAgdGhpcy5vdmVybGF5RWx0LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgdGhpcy5tb2RhbEVsdC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBtb2RhbC5pbml0KCk7XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1vZGFsRmFjdG9yeTtcbiJdfQ==
