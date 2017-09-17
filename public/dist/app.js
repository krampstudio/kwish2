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
    console.log(item);
    var content = '\n                <div class="headmage">\n                        <a href="' + item.url + '" target="_blank">\n                            <img src="' + item.image + '" alt="' + item.name + '">\n                        </a>\n                    </div>\n                    <h2>' + item.name + '</h2>\n                    <div class="warn">\n                        <span class="icon icon-' + (item.exact ? 'alert' : 'gift') + '"></span> ' + (item.exact ? 'Modèle exacte' : 'Modèle libre / Idée cadeau') + '\n                    </div>\n                    <p class="desc">' + item.desc + '</p>\n                    <div class="price">\n                        <progress value="' + item.funded + '" max="' + item.price + '" title="Reste ' + (item.price - item.funded) + ' \u20AC"></progress>\n                        <span class="amount">' + item.price + '</span>\n                    </div>';
    if (item.booked) {
        content += '<strong>Article réservé</strong>';
    } else if (item.bought) {
        content += '<strong>Article acheté</strong>';
    } else {
        content += '\n                    <ul class="actions">\n                        <li><a href="' + item.url + '" target="_blank" ><span class="icon icon-globe"></span> Site web</a></li>';
        if (!item.fundOnly) {
            content += '\n                        <li><a href="#" class="book"><span class="icon icon-lock"></span> R\xE9server</a></li>\n                        <li><a href="#" class="buy"><span class="icon icon-credit-card"></span> Acheter</a></li>';
        }
        content += '<li><a href="#" class="participate"://www.leetchi.com/c/naissance-de-b-chevrier-boquet" class="participate"><span class="icon icon-squirrel"></span> Participer</a></li>\n                    </ul>';
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
            return console.error(err);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwicHVibGljL2pzL2FwcC5qcyIsInB1YmxpYy9qcy9jb21wb25lbnRzL2NvbmZpcm0uanMiLCJwdWJsaWMvanMvY29tcG9uZW50cy9tb2RhbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdjQTs7QUFDQTs7Ozs7O0FBRUEsSUFBTSxTQUFTLEVBQWY7O0FBRUEsSUFBTSxrQkFBa0IsU0FBUyxhQUFULENBQXVCLFNBQXZCLENBQXhCOztBQUVBLElBQU0sa0JBQWtCLFNBQWxCLGVBQWtCLE9BQVE7QUFDNUIsWUFBUSxHQUFSLENBQVksSUFBWjtBQUNBLFFBQUksMEZBRTJCLEtBQUssR0FGaEMs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Q0EsaUJBQUssUUFBTCxHQUFnQixVQUFoQjs7QUFFQSxtQkFBTyxJQUFQO0FBQ0gsU0EzRFM7QUE2RFYsWUE3RFUsa0JBNkRKOztBQUdGLGlCQUFLLFVBQUwsQ0FBZ0IsU0FBaEIsQ0FBMEIsR0FBMUIsQ0FBOEIsUUFBOUI7QUFDQSxpQkFBSyxRQUFMLENBQWMsU0FBZCxDQUF3QixHQUF4QixDQUE0QixRQUE1Qjs7QUFFQSxtQkFBTyxJQUFQO0FBQ0gsU0FwRVM7QUFzRVYsYUF0RVUsbUJBc0VIO0FBQ0gsaUJBQUssVUFBTCxDQUFnQixTQUFoQixDQUEwQixNQUExQixDQUFpQyxRQUFqQztBQUNBLGlCQUFLLFFBQUwsQ0FBYyxTQUFkLENBQXdCLE1BQXhCLENBQStCLFFBQS9COztBQUVBLG1CQUFPLElBQVA7QUFDSDtBQTNFUyxLQUFkO0FBNkVBLFdBQU8sTUFBTSxJQUFOLEVBQVA7QUFFSCxDQTFGRDs7a0JBNEZlLFkiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlcikge1xuICAgIHZhciB2aWV3Q2xhc3NlcyA9IFtcbiAgICAgICdbb2JqZWN0IEludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDY0QXJyYXldJ1xuICAgIF1cblxuICAgIHZhciBpc0RhdGFWaWV3ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIERhdGFWaWV3LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iailcbiAgICB9XG5cbiAgICB2YXIgaXNBcnJheUJ1ZmZlclZpZXcgPSBBcnJheUJ1ZmZlci5pc1ZpZXcgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIHZpZXdDbGFzc2VzLmluZGV4T2YoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikpID4gLTFcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiB7ZG9uZTogdmFsdWUgPT09IHVuZGVmaW5lZCwgdmFsdWU6IHZhbHVlfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShoZWFkZXJzKSkge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgICB0aGlzLmFwcGVuZChoZWFkZXJbMF0sIGhlYWRlclsxXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIG9sZFZhbHVlID0gdGhpcy5tYXBbbmFtZV1cbiAgICB0aGlzLm1hcFtuYW1lXSA9IG9sZFZhbHVlID8gb2xkVmFsdWUrJywnK3ZhbHVlIDogdmFsdWVcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHJldHVybiB0aGlzLmhhcyhuYW1lKSA/IHRoaXMubWFwW25hbWVdIDogbnVsbFxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShub3JtYWxpemVOYW1lKG5hbWUpKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLm1hcCkge1xuICAgICAgaWYgKHRoaXMubWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5tYXBbbmFtZV0sIG5hbWUsIHRoaXMpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2gobmFtZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkgeyBpdGVtcy5wdXNoKHZhbHVlKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKFtuYW1lLCB2YWx1ZV0pIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICBIZWFkZXJzLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID0gSGVhZGVycy5wcm90b3R5cGUuZW50cmllc1xuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEFycmF5QnVmZmVyQXNUZXh0KGJ1Zikge1xuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIHZhciBjaGFycyA9IG5ldyBBcnJheSh2aWV3Lmxlbmd0aClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hhcnNbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHZpZXdbaV0pXG4gICAgfVxuICAgIHJldHVybiBjaGFycy5qb2luKCcnKVxuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyQ2xvbmUoYnVmKSB7XG4gICAgaWYgKGJ1Zi5zbGljZSkge1xuICAgICAgcmV0dXJuIGJ1Zi5zbGljZSgwKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zi5ieXRlTGVuZ3RoKVxuICAgICAgdmlldy5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmKSlcbiAgICAgIHJldHVybiB2aWV3LmJ1ZmZlclxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHkudG9TdHJpbmcoKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIHN1cHBvcnQuYmxvYiAmJiBpc0RhdGFWaWV3KGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkuYnVmZmVyKVxuICAgICAgICAvLyBJRSAxMC0xMSBjYW4ndCBoYW5kbGUgYSBEYXRhVmlldyBib2R5LlxuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIChBcnJheUJ1ZmZlci5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSB8fCBpc0FycmF5QnVmZmVyVmlldyhib2R5KSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlCbG9iICYmIHRoaXMuX2JvZHlCbG9iLnR5cGUpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCB0aGlzLl9ib2R5QmxvYi50eXBlKVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5ibG9iKSB7XG4gICAgICB0aGlzLmJsb2IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyBibG9iJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5VGV4dF0pKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYXJyYXlCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBjb25zdW1lZCh0aGlzKSB8fCBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUFycmF5QnVmZmVyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVhZEFycmF5QnVmZmVyQXNUZXh0KHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmZvcm1EYXRhKSB7XG4gICAgICB0aGlzLmZvcm1EYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKGRlY29kZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKEpTT04ucGFyc2UpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8vIEhUVFAgbWV0aG9kcyB3aG9zZSBjYXBpdGFsaXphdGlvbiBzaG91bGQgYmUgbm9ybWFsaXplZFxuICB2YXIgbWV0aG9kcyA9IFsnREVMRVRFJywgJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnXVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldGhvZChtZXRob2QpIHtcbiAgICB2YXIgdXBjYXNlZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpXG4gICAgcmV0dXJuIChtZXRob2RzLmluZGV4T2YodXBjYXNlZCkgPiAtMSkgPyB1cGNhc2VkIDogbWV0aG9kXG4gIH1cblxuICBmdW5jdGlvbiBSZXF1ZXN0KGlucHV0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB2YXIgYm9keSA9IG9wdGlvbnMuYm9keVxuXG4gICAgaWYgKGlucHV0IGluc3RhbmNlb2YgUmVxdWVzdCkge1xuICAgICAgaWYgKGlucHV0LmJvZHlVc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpXG4gICAgICB9XG4gICAgICB0aGlzLnVybCA9IGlucHV0LnVybFxuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IGlucHV0LmNyZWRlbnRpYWxzXG4gICAgICBpZiAoIW9wdGlvbnMuaGVhZGVycykge1xuICAgICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhpbnB1dC5oZWFkZXJzKVxuICAgICAgfVxuICAgICAgdGhpcy5tZXRob2QgPSBpbnB1dC5tZXRob2RcbiAgICAgIHRoaXMubW9kZSA9IGlucHV0Lm1vZGVcbiAgICAgIGlmICghYm9keSAmJiBpbnB1dC5fYm9keUluaXQgIT0gbnVsbCkge1xuICAgICAgICBib2R5ID0gaW5wdXQuX2JvZHlJbml0XG4gICAgICAgIGlucHV0LmJvZHlVc2VkID0gdHJ1ZVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVybCA9IFN0cmluZyhpbnB1dClcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcywgeyBib2R5OiB0aGlzLl9ib2R5SW5pdCB9KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUhlYWRlcnMocmF3SGVhZGVycykge1xuICAgIHZhciBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKVxuICAgIHJhd0hlYWRlcnMuc3BsaXQoL1xccj9cXG4vKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnRzLmpvaW4oJzonKS50cmltKClcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBoZWFkZXJzXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMuc3RhdHVzID0gJ3N0YXR1cycgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzIDogMjAwXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9ICdzdGF0dXNUZXh0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXNUZXh0IDogJ09LJ1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIFJlc3BvbnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UodGhpcy5fYm9keUluaXQsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiB0aGlzLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBuZXcgSGVhZGVycyh0aGlzLmhlYWRlcnMpLFxuICAgICAgdXJsOiB0aGlzLnVybFxuICAgIH0pXG4gIH1cblxuICBSZXNwb25zZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiAwLCBzdGF0dXNUZXh0OiAnJ30pXG4gICAgcmVzcG9uc2UudHlwZSA9ICdlcnJvcidcbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfVxuXG4gIHZhciByZWRpcmVjdFN0YXR1c2VzID0gWzMwMSwgMzAyLCAzMDMsIDMwNywgMzA4XVxuXG4gIFJlc3BvbnNlLnJlZGlyZWN0ID0gZnVuY3Rpb24odXJsLCBzdGF0dXMpIHtcbiAgICBpZiAocmVkaXJlY3RTdGF0dXNlcy5pbmRleE9mKHN0YXR1cykgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBzdGF0dXMgY29kZScpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiBzdGF0dXMsIGhlYWRlcnM6IHtsb2NhdGlvbjogdXJsfX0pXG4gIH1cblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzXG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3RcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlXG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChpbnB1dCwgaW5pdClcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBwYXJzZUhlYWRlcnMoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKVxuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMudXJsID0gJ3Jlc3BvbnNlVVJMJyBpbiB4aHIgPyB4aHIucmVzcG9uc2VVUkwgOiBvcHRpb25zLmhlYWRlcnMuZ2V0KCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbiIsImltcG9ydCAnd2hhdHdnLWZldGNoJztcbmltcG9ydCBjb25maXJtQ29tcG9uZW50IGZyb20gJy4vY29tcG9uZW50cy9jb25maXJtLmpzJztcblxuY29uc3Qga2l0ZW1zID0ge307XG5cbmNvbnN0IGtpdGVtc0NvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5raXRlbXMnKTtcblxuY29uc3QgZ2V0S2l0ZW1Db250ZW50ID0gaXRlbSA9PiB7XG4gICAgY29uc29sZS5sb2coaXRlbSk7XG4gICAgbGV0IGNvbnRlbnQgID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkbWFnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7aXRlbS51cmx9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGltZyBzcmM9XCIke2l0ZW0uaW1hZ2V9XCIgYWx0PVwiJHtpdGVtLm5hbWV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDI+JHtpdGVtLm5hbWV9PC9oMj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIndhcm5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiaWNvbiBpY29uLSR7aXRlbS5leGFjdCA/ICdhbGVydCcgOiAnZ2lmdCd9XCI+PC9zcGFuPiAke2l0ZW0uZXhhY3QgPyAnTW9kw6hsZSBleGFjdGUnIDogJ01vZMOobGUgbGlicmUgLyBJZMOpZSBjYWRlYXUnfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XCJkZXNjXCI+JHtpdGVtLmRlc2N9PC9wPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJpY2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwcm9ncmVzcyB2YWx1ZT1cIiR7aXRlbS5mdW5kZWR9XCIgbWF4PVwiJHtpdGVtLnByaWNlfVwiIHRpdGxlPVwiUmVzdGUgJHtpdGVtLnByaWNlIC0gaXRlbS5mdW5kZWR9IOKCrFwiPjwvcHJvZ3Jlc3M+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImFtb3VudFwiPiR7aXRlbS5wcmljZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgIGlmKGl0ZW0uYm9va2VkKXtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxzdHJvbmc+QXJ0aWNsZSByw6lzZXJ2w6k8L3N0cm9uZz4nO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0uYm91Z2h0KXtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxzdHJvbmc+QXJ0aWNsZSBhY2hldMOpPC9zdHJvbmc+JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJhY3Rpb25zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGk+PGEgaHJlZj1cIiR7aXRlbS51cmx9XCIgdGFyZ2V0PVwiX2JsYW5rXCIgPjxzcGFuIGNsYXNzPVwiaWNvbiBpY29uLWdsb2JlXCI+PC9zcGFuPiBTaXRlIHdlYjwvYT48L2xpPmA7XG4gICAgICAgICAgICBpZighaXRlbS5mdW5kT25seSl7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIiBjbGFzcz1cImJvb2tcIj48c3BhbiBjbGFzcz1cImljb24gaWNvbi1sb2NrXCI+PC9zcGFuPiBSw6lzZXJ2ZXI8L2E+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsaT48YSBocmVmPVwiI1wiIGNsYXNzPVwiYnV5XCI+PHNwYW4gY2xhc3M9XCJpY29uIGljb24tY3JlZGl0LWNhcmRcIj48L3NwYW4+IEFjaGV0ZXI8L2E+PC9saT5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxsaT48YSBocmVmPVwiI1wiIGNsYXNzPVwicGFydGljaXBhdGVcIjovL3d3dy5sZWV0Y2hpLmNvbS9jL25haXNzYW5jZS1kZS1iLWNoZXZyaWVyLWJvcXVldFwiIGNsYXNzPVwicGFydGljaXBhdGVcIj48c3BhbiBjbGFzcz1cImljb24gaWNvbi1zcXVpcnJlbFwiPjwvc3Bhbj4gUGFydGljaXBlcjwvYT48L2xpPlxuICAgICAgICAgICAgICAgICAgICA8L3VsPmA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfTtcblxuICAgIGNvbnN0IGFkZEl0ZW0gPSBpdGVtID0+IHtcbiAgICBjb25zdCBraXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2FydGljbGUnKTtcbiAgICBraXRlbS5jbGFzc0xpc3QuYWRkKCdraXRlbScpO1xuICAgIGtpdGVtLmRhdGFzZXQuaWQgPSBpdGVtLmlkO1xuICAgIGtpdGVtLmlubmVySFRNTCA9IGdldEtpdGVtQ29udGVudChpdGVtKTtcbiAgICBraXRlbXNDb250YWluZXIuYXBwZW5kQ2hpbGQoa2l0ZW0pO1xufTtcbmNvbnN0IHJlbG9hZEl0ZW0gPSBpdGVtID0+IHtcbiAgICBjb25zdCBraXRlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYC5raXRlbVtkYXRhLWlkPScke2l0ZW0uaWR9J11gKTtcbiAgICBraXRlbS5pbm5lckhUTUwgPSBnZXRLaXRlbUNvbnRlbnQoaXRlbSk7XG59O1xuXG5jb25zdCBhZGRLaXRlbXMgPSAoKSA9PiBPYmplY3QudmFsdWVzKGtpdGVtcykuZm9yRWFjaChhZGRJdGVtKTtcblxuY29uc3QgYm9va0l0ZW0gPSBpdGVtSWQgPT4ge1xuICAgIGNvbmZpcm1Db21wb25lbnQoJ1ZldWlsbGVyIGNvbmZpcm1lciBsYSByw6lzZXJ2YXRpb24nLCAnVW5lIGZvaXMgY29uZmlybcOpLCBsXFwnYXJ0aWNsZSBuZSBzZXJhIHBsdXMgYWNjZXNzaWJsZScsIG1vZGFsRWx0ID0+IHtcbiAgICAgICAgY29uc3QgY29tbWVudCA9IG1vZGFsRWx0LnF1ZXJ5U2VsZWN0b3IoJ3RleHRhcmVhW25hbWU9Y29tbWVudF0nKTtcbiAgICAgICAgZmV0Y2goYC9raXRlbS9ib29rP2l0ZW09JHtpdGVtSWR9YCwge1xuICAgICAgICAgICAgbWV0aG9kIDogJ1BPU1QnLFxuICAgICAgICAgICAgYm9keSA6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBjb21tZW50IDogY29tbWVudC52YWx1ZVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAudGhlbiggcmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgaWYocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgICAgICAgIGtpdGVtc1tpdGVtSWRdLmJvb2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVsb2FkSXRlbShraXRlbXNbaXRlbUlkXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCggZXJyID0+IGNvbnNvbGUuZXJyb3IoZXJyKSk7XG4gICAgfSkub3BlbigpO1xufTtcblxuY29uc3QgYnV5SXRlbSA9IGl0ZW1JZCA9PiB7XG4gICAgY29uZmlybUNvbXBvbmVudCgnVmV1aWxsZXIgY29uZmlybWVyIGxcXCdhY2hhdCcsICdVbmUgZm9pcyBjb25maXJtw6ksIGxcXCdhcnRpY2xlIG5lIHNlcmEgcGx1cyBhY2Nlc3NpYmxlJywgbW9kYWxFbHQgPT4ge1xuICAgICAgICBjb25zdCBjb21tZW50ID0gbW9kYWxFbHQucXVlcnlTZWxlY3RvcigndGV4dGFyZWFbbmFtZT1jb21tZW50XScpO1xuICAgICAgICBmZXRjaChgL2tpdGVtL2J1eT9pdGVtPSR7aXRlbUlkfWAsIHtcbiAgICAgICAgICAgIG1ldGhvZCA6ICdQT1NUJyxcbiAgICAgICAgICAgIGJvZHkgOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgY29tbWVudCA6IGNvbW1lbnQudmFsdWVcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oIHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgIGlmKHJlc3BvbnNlLnN0YXR1cyA9PT0gMjAwKXtcbiAgICAgICAgICAgICAgICBraXRlbXNbaXRlbUlkXS5ib3VnaHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlbG9hZEl0ZW0oa2l0ZW1zW2l0ZW1JZF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goIGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuICAgIH0pLm9wZW4oKTtcbn07XG5cbmNvbnN0IHBhcnRpY2lwYXRlID0gaXRlbUlkID0+IHtcbiAgICBjb25maXJtQ29tcG9uZW50KCdWb3VzIHNvdWhhaXRleiBwYXJ0aWNpcGVyID8nLCAnVm91cyBzZXJleiByZWRpcmlnw6kgc3VyIG5vdHJlIGNhZ25vdHRlIExlZXRjaGkuJywgKCkgPT4ge1xuICAgICAgICB3aW5kb3cub3BlbignaHR0cHM6Ly93d3cubGVldGNoaS5jb20vYy9uYWlzc2FuY2UtZGUtYi1jaGV2cmllci1ib3F1ZXQnLCAnX2JsYW5rJyk7XG4gICAgfSkub3BlbigpO1xufTtcblxuY29uc3Qga2l0ZW1BY3Rpb25zID0gKCkgPT4ge1xuXG4gICAga2l0ZW1zQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XG4gICAgICAgIGlmKGUudGFyZ2V0KXtcbiAgICAgICAgICAgIGlmKGUudGFyZ2V0Lm1hdGNoZXMoJy5ib29rJykpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgYm9va0l0ZW0oZS50YXJnZXQuY2xvc2VzdCgnLmtpdGVtJykuZGF0YXNldC5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihlLnRhcmdldC5tYXRjaGVzKCcuYnV5JykpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgYnV5SXRlbShlLnRhcmdldC5jbG9zZXN0KCcua2l0ZW0nKS5kYXRhc2V0LmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGUudGFyZ2V0Lm1hdGNoZXMoJy5wYXJ0aWNpcGF0ZScpKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHBhcnRpY2lwYXRlKGUudGFyZ2V0LmNsb3Nlc3QoJy5raXRlbScpLmRhdGFzZXQuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5jb25zdCBsaXN0RGV0YWlscyA9IGxpc3QgPT4ge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHkgPiBoZWFkZXIgPiBoMScpLnRleHRDb250ZW50ID0gbGlzdC50aXRsZTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdtYWluIC5kZXRhaWxzJykudGV4dENvbnRlbnQgPSBsaXN0LmRlc2M7XG59O1xuXG5jb25zdCBnZXRMaXN0TmFtZSA9ICgpID0+IHtcbiAgICBjb25zdCAgcGF0aHMgPVxuICAgICAgICBkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZVxuICAgICAgICAgICAgLnNwbGl0KCcvJylcbiAgICAgICAgICAgIC5maWx0ZXIoIHAgPT4gcCAmJiBwLnRyaW0oKS5sZW5ndGggKTtcbiAgICBpZihwYXRocyAmJiBwYXRocy5sZW5ndGggPiAwKXtcbiAgICAgICAgcmV0dXJuIHBhdGhzWzBdO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5jb25zdCBsb2FkTGlzdCA9ICgpID0+IHtcbiAgICBjb25zdCBuYW1lID0gZ2V0TGlzdE5hbWUoKSB8fCAnYmVyZW0yJztcbiAgICBpZihuYW1lKXtcbiAgICAgICAgZmV0Y2goYC9rbGlzdC8ke25hbWV9YClcbiAgICAgICAgICAgIC50aGVuKCByZXN1bHQgPT4gcmVzdWx0Lmpzb24oKSlcbiAgICAgICAgICAgIC50aGVuKCBsaXN0ID0+IHtcbiAgICAgICAgICAgICAgICBpZihsaXN0ICYmIGxpc3QuaWQpe1xuICAgICAgICAgICAgICAgICAgICBsaXN0RGV0YWlscyhsaXN0KTtcbiAgICAgICAgICAgICAgICAgICAga2l0ZW1BY3Rpb25zKGxpc3QuaWQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmV0Y2goYC9raXRlbXM/bGlzdD0ke2xpc3QuaWR9YCkudGhlbiggcmVzdWx0ID0+IHJlc3VsdC5qc29uKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbiggaXRlbXMgPT4ge1xuICAgICAgICAgICAgICAgIGlmKGl0ZW1zLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLmZvckVhY2goIGl0ZW0gPT4ga2l0ZW1zW2l0ZW0uaWRdID0gaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIGFkZEtpdGVtcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goIGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuICAgIH1cbn07XG5cbmxvYWRMaXN0KCk7XG4iLCJpbXBvcnQgbW9kYWwgZnJvbSAnLi9tb2RhbC5qcyc7XG5cbmNvbnN0IGNvbmZpcm1GYWN0b3J5ID0gZnVuY3Rpb24gKHRpdGxlID0gJ1BsZWFzZSBjb25maXJtJywgbWVzc2FnZSA9ICcnLCBkb25lKXtcblxuICAgIHJldHVybiBtb2RhbCh0aXRsZSwgbWVzc2FnZSwgW3tcbiAgICAgICAgbGFiZWwgOiAnQW5udWxlcicsXG4gICAgICAgIGNsb3NlIDogdHJ1ZSxcbiAgICB9LCB7XG4gICAgICAgIGxhYmVsIDogJ0NvbmZpcm1lcicsXG4gICAgICAgIGNsb3NlIDogdHJ1ZSxcbiAgICAgICAgYWN0aW9uIDogZG9uZVxuICAgIH1dKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNvbmZpcm1GYWN0b3J5O1xuIiwiXG5cbmNvbnN0IG1vZGFsRmFjdG9yeSA9IGZ1bmN0aW9uICh0aXRsZSA9ICcnLCBjb250ZW50ID0gJycsIGJ1dHRvbnMgPSBbeyBsYWJlbCA6ICdPaycsIGNsb3NlIDogdHJ1ZSwgYWN0aW9uIDogKCkgPT4ge30gfV0pe1xuXG4gICAgY29uc3QgbW9kYWxDb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk7XG5cbiAgICBjb25zdCByZW1vdmVQcmV2aW91c01vZGFscyA9ICgpID0+IHtcbiAgICAgICAgY29uc3QgcHJldmlvdXNNb2RhbHMgPSBtb2RhbENvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcubW9kYWwnKTtcbiAgICAgICAgaWYocHJldmlvdXNNb2RhbHMubGVuZ3RoKXtcbiAgICAgICAgICAgIFtdLmZvckVhY2guY2FsbChwcmV2aW91c01vZGFscywgbW9kYWwgPT4gbW9kYWxDb250YWluZXIucmVtb3ZlQ2hpbGQobW9kYWwpKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBtb2RhbCA9IHtcbiAgICAgICAgaW5pdCgpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZE1vZGFsID0gKCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgY29uc3QgbW9kYWxFbHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBtb2RhbEVsdC5jbGFzc0xpc3QuYWRkKCdtb2RhbCcpO1xuICAgICAgICAgICAgICAgIG1vZGFsRWx0LmlubmVySFRNTCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGgxPiR7dGl0bGV9PC9oMT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Y29udGVudH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxmb3JtPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIG5hbWU9XCJjb21tZW50XCIgcGxhY2Vob2xkZXI9XCJVbiBwZXRpdCBtb3QsIHVuIGNvbW1lbnRhaXJlLCBtZXJjaVwiPjwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjdGlvbnNcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9ucyA9IG1vZGFsRWx0LnF1ZXJ5U2VsZWN0b3IoJy5hY3Rpb25zJyk7XG4gICAgICAgICAgICAgICAgYnV0dG9ucy5mb3JFYWNoKCBidXR0b24gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBidXR0b25FbHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uRWx0LnRleHRDb250ZW50ID0gYnV0dG9uLmxhYmVsO1xuICAgICAgICAgICAgICAgICAgICBpZihidXR0b24uY2xvc2UgfHwgYnV0dG9uLmFjdGlvbil7XG4gICAgICAgICAgICAgICAgICAgICAgICBidXR0b25FbHQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYnV0dG9uLmNsb3NlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgYnV0dG9uLmFjdGlvbiA9PT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbi5hY3Rpb24uY2FsbChudWxsLCBtb2RhbEVsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYWN0aW9ucy5hcHBlbmRDaGlsZChidXR0b25FbHQpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbW9kYWxDb250YWluZXIuYXBwZW5kQ2hpbGQobW9kYWxFbHQpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vZGFsRWx0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgYWRkT3ZlcmxheSAgICAgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3ZlcmxheXMgPSBtb2RhbENvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcub3ZlcmxheScpO1xuXG4gICAgICAgICAgICAgICAgaWYob3ZlcmxheXMubGVuZ3RoID09PSAwKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3ZlcmxheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgICAgICBvdmVybGF5LmNsYXNzTGlzdC5hZGQoJ292ZXJsYXknKTtcbiAgICAgICAgICAgICAgICAgICAgbW9kYWxDb250YWluZXIuYXBwZW5kQ2hpbGQob3ZlcmxheSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvdmVybGF5O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBvdmVybGF5c1swXTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlbW92ZVByZXZpb3VzTW9kYWxzKCk7XG5cbiAgICAgICAgICAgIHRoaXMub3ZlcmxheUVsdCA9IGFkZE92ZXJsYXkoKTtcbiAgICAgICAgICAgIHRoaXMubW9kYWxFbHQgPSBhZGRNb2RhbCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBvcGVuKCl7XG5cblxuICAgICAgICAgICAgdGhpcy5vdmVybGF5RWx0LmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgdGhpcy5tb2RhbEVsdC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xvc2UoKXtcbiAgICAgICAgICAgIHRoaXMub3ZlcmxheUVsdC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIHRoaXMubW9kYWxFbHQuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gbW9kYWwuaW5pdCgpO1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBtb2RhbEZhY3Rvcnk7XG4iXX0=
