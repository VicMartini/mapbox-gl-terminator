"use strict";
(() => {
  var __accessCheck = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet = (obj, member, getter) => {
    __accessCheck(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet = (obj, member, value, setter) => {
    __accessCheck(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };

  // node_modules/lru-cache/dist/esm/index.js
  var perf = typeof performance === "object" && performance && typeof performance.now === "function" ? performance : Date;
  var warned = /* @__PURE__ */ new Set();
  var PROCESS = typeof process === "object" && !!process ? process : {};
  var emitWarning = (msg, type, code, fn) => {
    typeof PROCESS.emitWarning === "function" ? PROCESS.emitWarning(msg, type, code, fn) : console.error(`[${code}] ${type}: ${msg}`);
  };
  var AC = globalThis.AbortController;
  var AS = globalThis.AbortSignal;
  if (typeof AC === "undefined") {
    AS = class AbortSignal {
      onabort;
      _onabort = [];
      reason;
      aborted = false;
      addEventListener(_, fn) {
        this._onabort.push(fn);
      }
    };
    AC = class AbortController {
      constructor() {
        warnACPolyfill();
      }
      signal = new AS();
      abort(reason) {
        if (this.signal.aborted)
          return;
        this.signal.reason = reason;
        this.signal.aborted = true;
        for (const fn of this.signal._onabort) {
          fn(reason);
        }
        this.signal.onabort?.(reason);
      }
    };
    let printACPolyfillWarning = PROCESS.env?.LRU_CACHE_IGNORE_AC_WARNING !== "1";
    const warnACPolyfill = () => {
      if (!printACPolyfillWarning)
        return;
      printACPolyfillWarning = false;
      emitWarning("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", warnACPolyfill);
    };
  }
  var shouldWarn = (code) => !warned.has(code);
  var TYPE = Symbol("type");
  var isPosInt = (n) => n && n === Math.floor(n) && n > 0 && isFinite(n);
  var getUintArray = (max) => !isPosInt(max) ? null : max <= Math.pow(2, 8) ? Uint8Array : max <= Math.pow(2, 16) ? Uint16Array : max <= Math.pow(2, 32) ? Uint32Array : max <= Number.MAX_SAFE_INTEGER ? ZeroArray : null;
  var ZeroArray = class extends Array {
    constructor(size) {
      super(size);
      this.fill(0);
    }
  };
  var _constructing;
  var _Stack = class {
    heap;
    length;
    static create(max) {
      const HeapCls = getUintArray(max);
      if (!HeapCls)
        return [];
      __privateSet(_Stack, _constructing, true);
      const s = new _Stack(max, HeapCls);
      __privateSet(_Stack, _constructing, false);
      return s;
    }
    constructor(max, HeapCls) {
      if (!__privateGet(_Stack, _constructing)) {
        throw new TypeError("instantiate Stack using Stack.create(n)");
      }
      this.heap = new HeapCls(max);
      this.length = 0;
    }
    push(n) {
      this.heap[this.length++] = n;
    }
    pop() {
      return this.heap[--this.length];
    }
  };
  var Stack = _Stack;
  _constructing = new WeakMap();
  // private constructor
  __privateAdd(Stack, _constructing, false);
  var LRUCache = class {
    // properties coming in from the options of these, only max and maxSize
    // really *need* to be protected. The rest can be modified, as they just
    // set defaults for various methods.
    #max;
    #maxSize;
    #dispose;
    #disposeAfter;
    #fetchMethod;
    /**
     * {@link LRUCache.OptionsBase.ttl}
     */
    ttl;
    /**
     * {@link LRUCache.OptionsBase.ttlResolution}
     */
    ttlResolution;
    /**
     * {@link LRUCache.OptionsBase.ttlAutopurge}
     */
    ttlAutopurge;
    /**
     * {@link LRUCache.OptionsBase.updateAgeOnGet}
     */
    updateAgeOnGet;
    /**
     * {@link LRUCache.OptionsBase.updateAgeOnHas}
     */
    updateAgeOnHas;
    /**
     * {@link LRUCache.OptionsBase.allowStale}
     */
    allowStale;
    /**
     * {@link LRUCache.OptionsBase.noDisposeOnSet}
     */
    noDisposeOnSet;
    /**
     * {@link LRUCache.OptionsBase.noUpdateTTL}
     */
    noUpdateTTL;
    /**
     * {@link LRUCache.OptionsBase.maxEntrySize}
     */
    maxEntrySize;
    /**
     * {@link LRUCache.OptionsBase.sizeCalculation}
     */
    sizeCalculation;
    /**
     * {@link LRUCache.OptionsBase.noDeleteOnFetchRejection}
     */
    noDeleteOnFetchRejection;
    /**
     * {@link LRUCache.OptionsBase.noDeleteOnStaleGet}
     */
    noDeleteOnStaleGet;
    /**
     * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort}
     */
    allowStaleOnFetchAbort;
    /**
     * {@link LRUCache.OptionsBase.allowStaleOnFetchRejection}
     */
    allowStaleOnFetchRejection;
    /**
     * {@link LRUCache.OptionsBase.ignoreFetchAbort}
     */
    ignoreFetchAbort;
    // computed properties
    #size;
    #calculatedSize;
    #keyMap;
    #keyList;
    #valList;
    #next;
    #prev;
    #head;
    #tail;
    #free;
    #disposed;
    #sizes;
    #starts;
    #ttls;
    #hasDispose;
    #hasFetchMethod;
    #hasDisposeAfter;
    /**
     * Do not call this method unless you need to inspect the
     * inner workings of the cache.  If anything returned by this
     * object is modified in any way, strange breakage may occur.
     *
     * These fields are private for a reason!
     *
     * @internal
     */
    static unsafeExposeInternals(c) {
      return {
        // properties
        starts: c.#starts,
        ttls: c.#ttls,
        sizes: c.#sizes,
        keyMap: c.#keyMap,
        keyList: c.#keyList,
        valList: c.#valList,
        next: c.#next,
        prev: c.#prev,
        get head() {
          return c.#head;
        },
        get tail() {
          return c.#tail;
        },
        free: c.#free,
        // methods
        isBackgroundFetch: (p) => c.#isBackgroundFetch(p),
        backgroundFetch: (k, index, options, context) => c.#backgroundFetch(k, index, options, context),
        moveToTail: (index) => c.#moveToTail(index),
        indexes: (options) => c.#indexes(options),
        rindexes: (options) => c.#rindexes(options),
        isStale: (index) => c.#isStale(index)
      };
    }
    // Protected read-only members
    /**
     * {@link LRUCache.OptionsBase.max} (read-only)
     */
    get max() {
      return this.#max;
    }
    /**
     * {@link LRUCache.OptionsBase.maxSize} (read-only)
     */
    get maxSize() {
      return this.#maxSize;
    }
    /**
     * The total computed size of items in the cache (read-only)
     */
    get calculatedSize() {
      return this.#calculatedSize;
    }
    /**
     * The number of items stored in the cache (read-only)
     */
    get size() {
      return this.#size;
    }
    /**
     * {@link LRUCache.OptionsBase.fetchMethod} (read-only)
     */
    get fetchMethod() {
      return this.#fetchMethod;
    }
    /**
     * {@link LRUCache.OptionsBase.dispose} (read-only)
     */
    get dispose() {
      return this.#dispose;
    }
    /**
     * {@link LRUCache.OptionsBase.disposeAfter} (read-only)
     */
    get disposeAfter() {
      return this.#disposeAfter;
    }
    constructor(options) {
      const { max = 0, ttl, ttlResolution = 1, ttlAutopurge, updateAgeOnGet, updateAgeOnHas, allowStale, dispose, disposeAfter, noDisposeOnSet, noUpdateTTL, maxSize = 0, maxEntrySize = 0, sizeCalculation, fetchMethod, noDeleteOnFetchRejection, noDeleteOnStaleGet, allowStaleOnFetchRejection, allowStaleOnFetchAbort, ignoreFetchAbort } = options;
      if (max !== 0 && !isPosInt(max)) {
        throw new TypeError("max option must be a nonnegative integer");
      }
      const UintArray = max ? getUintArray(max) : Array;
      if (!UintArray) {
        throw new Error("invalid max value: " + max);
      }
      this.#max = max;
      this.#maxSize = maxSize;
      this.maxEntrySize = maxEntrySize || this.#maxSize;
      this.sizeCalculation = sizeCalculation;
      if (this.sizeCalculation) {
        if (!this.#maxSize && !this.maxEntrySize) {
          throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
        }
        if (typeof this.sizeCalculation !== "function") {
          throw new TypeError("sizeCalculation set to non-function");
        }
      }
      if (fetchMethod !== void 0 && typeof fetchMethod !== "function") {
        throw new TypeError("fetchMethod must be a function if specified");
      }
      this.#fetchMethod = fetchMethod;
      this.#hasFetchMethod = !!fetchMethod;
      this.#keyMap = /* @__PURE__ */ new Map();
      this.#keyList = new Array(max).fill(void 0);
      this.#valList = new Array(max).fill(void 0);
      this.#next = new UintArray(max);
      this.#prev = new UintArray(max);
      this.#head = 0;
      this.#tail = 0;
      this.#free = Stack.create(max);
      this.#size = 0;
      this.#calculatedSize = 0;
      if (typeof dispose === "function") {
        this.#dispose = dispose;
      }
      if (typeof disposeAfter === "function") {
        this.#disposeAfter = disposeAfter;
        this.#disposed = [];
      } else {
        this.#disposeAfter = void 0;
        this.#disposed = void 0;
      }
      this.#hasDispose = !!this.#dispose;
      this.#hasDisposeAfter = !!this.#disposeAfter;
      this.noDisposeOnSet = !!noDisposeOnSet;
      this.noUpdateTTL = !!noUpdateTTL;
      this.noDeleteOnFetchRejection = !!noDeleteOnFetchRejection;
      this.allowStaleOnFetchRejection = !!allowStaleOnFetchRejection;
      this.allowStaleOnFetchAbort = !!allowStaleOnFetchAbort;
      this.ignoreFetchAbort = !!ignoreFetchAbort;
      if (this.maxEntrySize !== 0) {
        if (this.#maxSize !== 0) {
          if (!isPosInt(this.#maxSize)) {
            throw new TypeError("maxSize must be a positive integer if specified");
          }
        }
        if (!isPosInt(this.maxEntrySize)) {
          throw new TypeError("maxEntrySize must be a positive integer if specified");
        }
        this.#initializeSizeTracking();
      }
      this.allowStale = !!allowStale;
      this.noDeleteOnStaleGet = !!noDeleteOnStaleGet;
      this.updateAgeOnGet = !!updateAgeOnGet;
      this.updateAgeOnHas = !!updateAgeOnHas;
      this.ttlResolution = isPosInt(ttlResolution) || ttlResolution === 0 ? ttlResolution : 1;
      this.ttlAutopurge = !!ttlAutopurge;
      this.ttl = ttl || 0;
      if (this.ttl) {
        if (!isPosInt(this.ttl)) {
          throw new TypeError("ttl must be a positive integer if specified");
        }
        this.#initializeTTLTracking();
      }
      if (this.#max === 0 && this.ttl === 0 && this.#maxSize === 0) {
        throw new TypeError("At least one of max, maxSize, or ttl is required");
      }
      if (!this.ttlAutopurge && !this.#max && !this.#maxSize) {
        const code = "LRU_CACHE_UNBOUNDED";
        if (shouldWarn(code)) {
          warned.add(code);
          const msg = "TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.";
          emitWarning(msg, "UnboundedCacheWarning", code, LRUCache);
        }
      }
    }
    /**
     * Return the remaining TTL time for a given entry key
     */
    getRemainingTTL(key) {
      return this.#keyMap.has(key) ? Infinity : 0;
    }
    #initializeTTLTracking() {
      const ttls = new ZeroArray(this.#max);
      const starts = new ZeroArray(this.#max);
      this.#ttls = ttls;
      this.#starts = starts;
      this.#setItemTTL = (index, ttl, start = perf.now()) => {
        starts[index] = ttl !== 0 ? start : 0;
        ttls[index] = ttl;
        if (ttl !== 0 && this.ttlAutopurge) {
          const t = setTimeout(() => {
            if (this.#isStale(index)) {
              this.delete(this.#keyList[index]);
            }
          }, ttl + 1);
          if (t.unref) {
            t.unref();
          }
        }
      };
      this.#updateItemAge = (index) => {
        starts[index] = ttls[index] !== 0 ? perf.now() : 0;
      };
      this.#statusTTL = (status, index) => {
        if (ttls[index]) {
          const ttl = ttls[index];
          const start = starts[index];
          if (!ttl || !start)
            return;
          status.ttl = ttl;
          status.start = start;
          status.now = cachedNow || getNow();
          const age = status.now - start;
          status.remainingTTL = ttl - age;
        }
      };
      let cachedNow = 0;
      const getNow = () => {
        const n = perf.now();
        if (this.ttlResolution > 0) {
          cachedNow = n;
          const t = setTimeout(() => cachedNow = 0, this.ttlResolution);
          if (t.unref) {
            t.unref();
          }
        }
        return n;
      };
      this.getRemainingTTL = (key) => {
        const index = this.#keyMap.get(key);
        if (index === void 0) {
          return 0;
        }
        const ttl = ttls[index];
        const start = starts[index];
        if (!ttl || !start) {
          return Infinity;
        }
        const age = (cachedNow || getNow()) - start;
        return ttl - age;
      };
      this.#isStale = (index) => {
        const s = starts[index];
        const t = ttls[index];
        return !!t && !!s && (cachedNow || getNow()) - s > t;
      };
    }
    // conditionally set private methods related to TTL
    #updateItemAge = () => {
    };
    #statusTTL = () => {
    };
    #setItemTTL = () => {
    };
    /* c8 ignore stop */
    #isStale = () => false;
    #initializeSizeTracking() {
      const sizes = new ZeroArray(this.#max);
      this.#calculatedSize = 0;
      this.#sizes = sizes;
      this.#removeItemSize = (index) => {
        this.#calculatedSize -= sizes[index];
        sizes[index] = 0;
      };
      this.#requireSize = (k, v, size, sizeCalculation) => {
        if (this.#isBackgroundFetch(v)) {
          return 0;
        }
        if (!isPosInt(size)) {
          if (sizeCalculation) {
            if (typeof sizeCalculation !== "function") {
              throw new TypeError("sizeCalculation must be a function");
            }
            size = sizeCalculation(v, k);
            if (!isPosInt(size)) {
              throw new TypeError("sizeCalculation return invalid (expect positive integer)");
            }
          } else {
            throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
          }
        }
        return size;
      };
      this.#addItemSize = (index, size, status) => {
        sizes[index] = size;
        if (this.#maxSize) {
          const maxSize = this.#maxSize - sizes[index];
          while (this.#calculatedSize > maxSize) {
            this.#evict(true);
          }
        }
        this.#calculatedSize += sizes[index];
        if (status) {
          status.entrySize = size;
          status.totalCalculatedSize = this.#calculatedSize;
        }
      };
    }
    #removeItemSize = (_i) => {
    };
    #addItemSize = (_i, _s, _st) => {
    };
    #requireSize = (_k, _v, size, sizeCalculation) => {
      if (size || sizeCalculation) {
        throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
      }
      return 0;
    };
    *#indexes({ allowStale = this.allowStale } = {}) {
      if (this.#size) {
        for (let i = this.#tail; true; ) {
          if (!this.#isValidIndex(i)) {
            break;
          }
          if (allowStale || !this.#isStale(i)) {
            yield i;
          }
          if (i === this.#head) {
            break;
          } else {
            i = this.#prev[i];
          }
        }
      }
    }
    *#rindexes({ allowStale = this.allowStale } = {}) {
      if (this.#size) {
        for (let i = this.#head; true; ) {
          if (!this.#isValidIndex(i)) {
            break;
          }
          if (allowStale || !this.#isStale(i)) {
            yield i;
          }
          if (i === this.#tail) {
            break;
          } else {
            i = this.#next[i];
          }
        }
      }
    }
    #isValidIndex(index) {
      return index !== void 0 && this.#keyMap.get(this.#keyList[index]) === index;
    }
    /**
     * Return a generator yielding `[key, value]` pairs,
     * in order from most recently used to least recently used.
     */
    *entries() {
      for (const i of this.#indexes()) {
        if (this.#valList[i] !== void 0 && this.#keyList[i] !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
          yield [this.#keyList[i], this.#valList[i]];
        }
      }
    }
    /**
     * Inverse order version of {@link LRUCache.entries}
     *
     * Return a generator yielding `[key, value]` pairs,
     * in order from least recently used to most recently used.
     */
    *rentries() {
      for (const i of this.#rindexes()) {
        if (this.#valList[i] !== void 0 && this.#keyList[i] !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
          yield [this.#keyList[i], this.#valList[i]];
        }
      }
    }
    /**
     * Return a generator yielding the keys in the cache,
     * in order from most recently used to least recently used.
     */
    *keys() {
      for (const i of this.#indexes()) {
        const k = this.#keyList[i];
        if (k !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
          yield k;
        }
      }
    }
    /**
     * Inverse order version of {@link LRUCache.keys}
     *
     * Return a generator yielding the keys in the cache,
     * in order from least recently used to most recently used.
     */
    *rkeys() {
      for (const i of this.#rindexes()) {
        const k = this.#keyList[i];
        if (k !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
          yield k;
        }
      }
    }
    /**
     * Return a generator yielding the values in the cache,
     * in order from most recently used to least recently used.
     */
    *values() {
      for (const i of this.#indexes()) {
        const v = this.#valList[i];
        if (v !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
          yield this.#valList[i];
        }
      }
    }
    /**
     * Inverse order version of {@link LRUCache.values}
     *
     * Return a generator yielding the values in the cache,
     * in order from least recently used to most recently used.
     */
    *rvalues() {
      for (const i of this.#rindexes()) {
        const v = this.#valList[i];
        if (v !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
          yield this.#valList[i];
        }
      }
    }
    /**
     * Iterating over the cache itself yields the same results as
     * {@link LRUCache.entries}
     */
    [Symbol.iterator]() {
      return this.entries();
    }
    /**
     * Find a value for which the supplied fn method returns a truthy value,
     * similar to Array.find().  fn is called as fn(value, key, cache).
     */
    find(fn, getOptions = {}) {
      for (const i of this.#indexes()) {
        const v = this.#valList[i];
        const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
        if (value === void 0)
          continue;
        if (fn(value, this.#keyList[i], this)) {
          return this.get(this.#keyList[i], getOptions);
        }
      }
    }
    /**
     * Call the supplied function on each item in the cache, in order from
     * most recently used to least recently used.  fn is called as
     * fn(value, key, cache).  Does not update age or recenty of use.
     * Does not iterate over stale values.
     */
    forEach(fn, thisp = this) {
      for (const i of this.#indexes()) {
        const v = this.#valList[i];
        const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
        if (value === void 0)
          continue;
        fn.call(thisp, value, this.#keyList[i], this);
      }
    }
    /**
     * The same as {@link LRUCache.forEach} but items are iterated over in
     * reverse order.  (ie, less recently used items are iterated over first.)
     */
    rforEach(fn, thisp = this) {
      for (const i of this.#rindexes()) {
        const v = this.#valList[i];
        const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
        if (value === void 0)
          continue;
        fn.call(thisp, value, this.#keyList[i], this);
      }
    }
    /**
     * Delete any stale entries. Returns true if anything was removed,
     * false otherwise.
     */
    purgeStale() {
      let deleted = false;
      for (const i of this.#rindexes({ allowStale: true })) {
        if (this.#isStale(i)) {
          this.delete(this.#keyList[i]);
          deleted = true;
        }
      }
      return deleted;
    }
    /**
     * Get the extended info about a given entry, to get its value, size, and
     * TTL info simultaneously. Like {@link LRUCache#dump}, but just for a
     * single key. Always returns stale values, if their info is found in the
     * cache, so be sure to check for expired TTLs if relevant.
     */
    info(key) {
      const i = this.#keyMap.get(key);
      if (i === void 0)
        return void 0;
      const v = this.#valList[i];
      const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      if (value === void 0)
        return void 0;
      const entry = { value };
      if (this.#ttls && this.#starts) {
        const ttl = this.#ttls[i];
        const start = this.#starts[i];
        if (ttl && start) {
          const remain = ttl - (perf.now() - start);
          entry.ttl = remain;
          entry.start = Date.now();
        }
      }
      if (this.#sizes) {
        entry.size = this.#sizes[i];
      }
      return entry;
    }
    /**
     * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
     * passed to cache.load()
     */
    dump() {
      const arr = [];
      for (const i of this.#indexes({ allowStale: true })) {
        const key = this.#keyList[i];
        const v = this.#valList[i];
        const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
        if (value === void 0 || key === void 0)
          continue;
        const entry = { value };
        if (this.#ttls && this.#starts) {
          entry.ttl = this.#ttls[i];
          const age = perf.now() - this.#starts[i];
          entry.start = Math.floor(Date.now() - age);
        }
        if (this.#sizes) {
          entry.size = this.#sizes[i];
        }
        arr.unshift([key, entry]);
      }
      return arr;
    }
    /**
     * Reset the cache and load in the items in entries in the order listed.
     * Note that the shape of the resulting cache may be different if the
     * same options are not used in both caches.
     */
    load(arr) {
      this.clear();
      for (const [key, entry] of arr) {
        if (entry.start) {
          const age = Date.now() - entry.start;
          entry.start = perf.now() - age;
        }
        this.set(key, entry.value, entry);
      }
    }
    /**
     * Add a value to the cache.
     *
     * Note: if `undefined` is specified as a value, this is an alias for
     * {@link LRUCache#delete}
     */
    set(k, v, setOptions = {}) {
      if (v === void 0) {
        this.delete(k);
        return this;
      }
      const { ttl = this.ttl, start, noDisposeOnSet = this.noDisposeOnSet, sizeCalculation = this.sizeCalculation, status } = setOptions;
      let { noUpdateTTL = this.noUpdateTTL } = setOptions;
      const size = this.#requireSize(k, v, setOptions.size || 0, sizeCalculation);
      if (this.maxEntrySize && size > this.maxEntrySize) {
        if (status) {
          status.set = "miss";
          status.maxEntrySizeExceeded = true;
        }
        this.delete(k);
        return this;
      }
      let index = this.#size === 0 ? void 0 : this.#keyMap.get(k);
      if (index === void 0) {
        index = this.#size === 0 ? this.#tail : this.#free.length !== 0 ? this.#free.pop() : this.#size === this.#max ? this.#evict(false) : this.#size;
        this.#keyList[index] = k;
        this.#valList[index] = v;
        this.#keyMap.set(k, index);
        this.#next[this.#tail] = index;
        this.#prev[index] = this.#tail;
        this.#tail = index;
        this.#size++;
        this.#addItemSize(index, size, status);
        if (status)
          status.set = "add";
        noUpdateTTL = false;
      } else {
        this.#moveToTail(index);
        const oldVal = this.#valList[index];
        if (v !== oldVal) {
          if (this.#hasFetchMethod && this.#isBackgroundFetch(oldVal)) {
            oldVal.__abortController.abort(new Error("replaced"));
            const { __staleWhileFetching: s } = oldVal;
            if (s !== void 0 && !noDisposeOnSet) {
              if (this.#hasDispose) {
                this.#dispose?.(s, k, "set");
              }
              if (this.#hasDisposeAfter) {
                this.#disposed?.push([s, k, "set"]);
              }
            }
          } else if (!noDisposeOnSet) {
            if (this.#hasDispose) {
              this.#dispose?.(oldVal, k, "set");
            }
            if (this.#hasDisposeAfter) {
              this.#disposed?.push([oldVal, k, "set"]);
            }
          }
          this.#removeItemSize(index);
          this.#addItemSize(index, size, status);
          this.#valList[index] = v;
          if (status) {
            status.set = "replace";
            const oldValue = oldVal && this.#isBackgroundFetch(oldVal) ? oldVal.__staleWhileFetching : oldVal;
            if (oldValue !== void 0)
              status.oldValue = oldValue;
          }
        } else if (status) {
          status.set = "update";
        }
      }
      if (ttl !== 0 && !this.#ttls) {
        this.#initializeTTLTracking();
      }
      if (this.#ttls) {
        if (!noUpdateTTL) {
          this.#setItemTTL(index, ttl, start);
        }
        if (status)
          this.#statusTTL(status, index);
      }
      if (!noDisposeOnSet && this.#hasDisposeAfter && this.#disposed) {
        const dt = this.#disposed;
        let task;
        while (task = dt?.shift()) {
          this.#disposeAfter?.(...task);
        }
      }
      return this;
    }
    /**
     * Evict the least recently used item, returning its value or
     * `undefined` if cache is empty.
     */
    pop() {
      try {
        while (this.#size) {
          const val = this.#valList[this.#head];
          this.#evict(true);
          if (this.#isBackgroundFetch(val)) {
            if (val.__staleWhileFetching) {
              return val.__staleWhileFetching;
            }
          } else if (val !== void 0) {
            return val;
          }
        }
      } finally {
        if (this.#hasDisposeAfter && this.#disposed) {
          const dt = this.#disposed;
          let task;
          while (task = dt?.shift()) {
            this.#disposeAfter?.(...task);
          }
        }
      }
    }
    #evict(free) {
      const head = this.#head;
      const k = this.#keyList[head];
      const v = this.#valList[head];
      if (this.#hasFetchMethod && this.#isBackgroundFetch(v)) {
        v.__abortController.abort(new Error("evicted"));
      } else if (this.#hasDispose || this.#hasDisposeAfter) {
        if (this.#hasDispose) {
          this.#dispose?.(v, k, "evict");
        }
        if (this.#hasDisposeAfter) {
          this.#disposed?.push([v, k, "evict"]);
        }
      }
      this.#removeItemSize(head);
      if (free) {
        this.#keyList[head] = void 0;
        this.#valList[head] = void 0;
        this.#free.push(head);
      }
      if (this.#size === 1) {
        this.#head = this.#tail = 0;
        this.#free.length = 0;
      } else {
        this.#head = this.#next[head];
      }
      this.#keyMap.delete(k);
      this.#size--;
      return head;
    }
    /**
     * Check if a key is in the cache, without updating the recency of use.
     * Will return false if the item is stale, even though it is technically
     * in the cache.
     *
     * Will not update item age unless
     * {@link LRUCache.OptionsBase.updateAgeOnHas} is set.
     */
    has(k, hasOptions = {}) {
      const { updateAgeOnHas = this.updateAgeOnHas, status } = hasOptions;
      const index = this.#keyMap.get(k);
      if (index !== void 0) {
        const v = this.#valList[index];
        if (this.#isBackgroundFetch(v) && v.__staleWhileFetching === void 0) {
          return false;
        }
        if (!this.#isStale(index)) {
          if (updateAgeOnHas) {
            this.#updateItemAge(index);
          }
          if (status) {
            status.has = "hit";
            this.#statusTTL(status, index);
          }
          return true;
        } else if (status) {
          status.has = "stale";
          this.#statusTTL(status, index);
        }
      } else if (status) {
        status.has = "miss";
      }
      return false;
    }
    /**
     * Like {@link LRUCache#get} but doesn't update recency or delete stale
     * items.
     *
     * Returns `undefined` if the item is stale, unless
     * {@link LRUCache.OptionsBase.allowStale} is set.
     */
    peek(k, peekOptions = {}) {
      const { allowStale = this.allowStale } = peekOptions;
      const index = this.#keyMap.get(k);
      if (index === void 0 || !allowStale && this.#isStale(index)) {
        return;
      }
      const v = this.#valList[index];
      return this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
    }
    #backgroundFetch(k, index, options, context) {
      const v = index === void 0 ? void 0 : this.#valList[index];
      if (this.#isBackgroundFetch(v)) {
        return v;
      }
      const ac = new AC();
      const { signal } = options;
      signal?.addEventListener("abort", () => ac.abort(signal.reason), {
        signal: ac.signal
      });
      const fetchOpts = {
        signal: ac.signal,
        options,
        context
      };
      const cb = (v2, updateCache = false) => {
        const { aborted } = ac.signal;
        const ignoreAbort = options.ignoreFetchAbort && v2 !== void 0;
        if (options.status) {
          if (aborted && !updateCache) {
            options.status.fetchAborted = true;
            options.status.fetchError = ac.signal.reason;
            if (ignoreAbort)
              options.status.fetchAbortIgnored = true;
          } else {
            options.status.fetchResolved = true;
          }
        }
        if (aborted && !ignoreAbort && !updateCache) {
          return fetchFail(ac.signal.reason);
        }
        const bf2 = p;
        if (this.#valList[index] === p) {
          if (v2 === void 0) {
            if (bf2.__staleWhileFetching) {
              this.#valList[index] = bf2.__staleWhileFetching;
            } else {
              this.delete(k);
            }
          } else {
            if (options.status)
              options.status.fetchUpdated = true;
            this.set(k, v2, fetchOpts.options);
          }
        }
        return v2;
      };
      const eb = (er) => {
        if (options.status) {
          options.status.fetchRejected = true;
          options.status.fetchError = er;
        }
        return fetchFail(er);
      };
      const fetchFail = (er) => {
        const { aborted } = ac.signal;
        const allowStaleAborted = aborted && options.allowStaleOnFetchAbort;
        const allowStale = allowStaleAborted || options.allowStaleOnFetchRejection;
        const noDelete = allowStale || options.noDeleteOnFetchRejection;
        const bf2 = p;
        if (this.#valList[index] === p) {
          const del = !noDelete || bf2.__staleWhileFetching === void 0;
          if (del) {
            this.delete(k);
          } else if (!allowStaleAborted) {
            this.#valList[index] = bf2.__staleWhileFetching;
          }
        }
        if (allowStale) {
          if (options.status && bf2.__staleWhileFetching !== void 0) {
            options.status.returnedStale = true;
          }
          return bf2.__staleWhileFetching;
        } else if (bf2.__returned === bf2) {
          throw er;
        }
      };
      const pcall = (res, rej) => {
        const fmp = this.#fetchMethod?.(k, v, fetchOpts);
        if (fmp && fmp instanceof Promise) {
          fmp.then((v2) => res(v2 === void 0 ? void 0 : v2), rej);
        }
        ac.signal.addEventListener("abort", () => {
          if (!options.ignoreFetchAbort || options.allowStaleOnFetchAbort) {
            res(void 0);
            if (options.allowStaleOnFetchAbort) {
              res = (v2) => cb(v2, true);
            }
          }
        });
      };
      if (options.status)
        options.status.fetchDispatched = true;
      const p = new Promise(pcall).then(cb, eb);
      const bf = Object.assign(p, {
        __abortController: ac,
        __staleWhileFetching: v,
        __returned: void 0
      });
      if (index === void 0) {
        this.set(k, bf, { ...fetchOpts.options, status: void 0 });
        index = this.#keyMap.get(k);
      } else {
        this.#valList[index] = bf;
      }
      return bf;
    }
    #isBackgroundFetch(p) {
      if (!this.#hasFetchMethod)
        return false;
      const b = p;
      return !!b && b instanceof Promise && b.hasOwnProperty("__staleWhileFetching") && b.__abortController instanceof AC;
    }
    async fetch(k, fetchOptions = {}) {
      const {
        // get options
        allowStale = this.allowStale,
        updateAgeOnGet = this.updateAgeOnGet,
        noDeleteOnStaleGet = this.noDeleteOnStaleGet,
        // set options
        ttl = this.ttl,
        noDisposeOnSet = this.noDisposeOnSet,
        size = 0,
        sizeCalculation = this.sizeCalculation,
        noUpdateTTL = this.noUpdateTTL,
        // fetch exclusive options
        noDeleteOnFetchRejection = this.noDeleteOnFetchRejection,
        allowStaleOnFetchRejection = this.allowStaleOnFetchRejection,
        ignoreFetchAbort = this.ignoreFetchAbort,
        allowStaleOnFetchAbort = this.allowStaleOnFetchAbort,
        context,
        forceRefresh = false,
        status,
        signal
      } = fetchOptions;
      if (!this.#hasFetchMethod) {
        if (status)
          status.fetch = "get";
        return this.get(k, {
          allowStale,
          updateAgeOnGet,
          noDeleteOnStaleGet,
          status
        });
      }
      const options = {
        allowStale,
        updateAgeOnGet,
        noDeleteOnStaleGet,
        ttl,
        noDisposeOnSet,
        size,
        sizeCalculation,
        noUpdateTTL,
        noDeleteOnFetchRejection,
        allowStaleOnFetchRejection,
        allowStaleOnFetchAbort,
        ignoreFetchAbort,
        status,
        signal
      };
      let index = this.#keyMap.get(k);
      if (index === void 0) {
        if (status)
          status.fetch = "miss";
        const p = this.#backgroundFetch(k, index, options, context);
        return p.__returned = p;
      } else {
        const v = this.#valList[index];
        if (this.#isBackgroundFetch(v)) {
          const stale = allowStale && v.__staleWhileFetching !== void 0;
          if (status) {
            status.fetch = "inflight";
            if (stale)
              status.returnedStale = true;
          }
          return stale ? v.__staleWhileFetching : v.__returned = v;
        }
        const isStale = this.#isStale(index);
        if (!forceRefresh && !isStale) {
          if (status)
            status.fetch = "hit";
          this.#moveToTail(index);
          if (updateAgeOnGet) {
            this.#updateItemAge(index);
          }
          if (status)
            this.#statusTTL(status, index);
          return v;
        }
        const p = this.#backgroundFetch(k, index, options, context);
        const hasStale = p.__staleWhileFetching !== void 0;
        const staleVal = hasStale && allowStale;
        if (status) {
          status.fetch = isStale ? "stale" : "refresh";
          if (staleVal && isStale)
            status.returnedStale = true;
        }
        return staleVal ? p.__staleWhileFetching : p.__returned = p;
      }
    }
    /**
     * Return a value from the cache. Will update the recency of the cache
     * entry found.
     *
     * If the key is not found, get() will return `undefined`.
     */
    get(k, getOptions = {}) {
      const { allowStale = this.allowStale, updateAgeOnGet = this.updateAgeOnGet, noDeleteOnStaleGet = this.noDeleteOnStaleGet, status } = getOptions;
      const index = this.#keyMap.get(k);
      if (index !== void 0) {
        const value = this.#valList[index];
        const fetching = this.#isBackgroundFetch(value);
        if (status)
          this.#statusTTL(status, index);
        if (this.#isStale(index)) {
          if (status)
            status.get = "stale";
          if (!fetching) {
            if (!noDeleteOnStaleGet) {
              this.delete(k);
            }
            if (status && allowStale)
              status.returnedStale = true;
            return allowStale ? value : void 0;
          } else {
            if (status && allowStale && value.__staleWhileFetching !== void 0) {
              status.returnedStale = true;
            }
            return allowStale ? value.__staleWhileFetching : void 0;
          }
        } else {
          if (status)
            status.get = "hit";
          if (fetching) {
            return value.__staleWhileFetching;
          }
          this.#moveToTail(index);
          if (updateAgeOnGet) {
            this.#updateItemAge(index);
          }
          return value;
        }
      } else if (status) {
        status.get = "miss";
      }
    }
    #connect(p, n) {
      this.#prev[n] = p;
      this.#next[p] = n;
    }
    #moveToTail(index) {
      if (index !== this.#tail) {
        if (index === this.#head) {
          this.#head = this.#next[index];
        } else {
          this.#connect(this.#prev[index], this.#next[index]);
        }
        this.#connect(this.#tail, index);
        this.#tail = index;
      }
    }
    /**
     * Deletes a key out of the cache.
     * Returns true if the key was deleted, false otherwise.
     */
    delete(k) {
      let deleted = false;
      if (this.#size !== 0) {
        const index = this.#keyMap.get(k);
        if (index !== void 0) {
          deleted = true;
          if (this.#size === 1) {
            this.clear();
          } else {
            this.#removeItemSize(index);
            const v = this.#valList[index];
            if (this.#isBackgroundFetch(v)) {
              v.__abortController.abort(new Error("deleted"));
            } else if (this.#hasDispose || this.#hasDisposeAfter) {
              if (this.#hasDispose) {
                this.#dispose?.(v, k, "delete");
              }
              if (this.#hasDisposeAfter) {
                this.#disposed?.push([v, k, "delete"]);
              }
            }
            this.#keyMap.delete(k);
            this.#keyList[index] = void 0;
            this.#valList[index] = void 0;
            if (index === this.#tail) {
              this.#tail = this.#prev[index];
            } else if (index === this.#head) {
              this.#head = this.#next[index];
            } else {
              const pi = this.#prev[index];
              this.#next[pi] = this.#next[index];
              const ni = this.#next[index];
              this.#prev[ni] = this.#prev[index];
            }
            this.#size--;
            this.#free.push(index);
          }
        }
      }
      if (this.#hasDisposeAfter && this.#disposed?.length) {
        const dt = this.#disposed;
        let task;
        while (task = dt?.shift()) {
          this.#disposeAfter?.(...task);
        }
      }
      return deleted;
    }
    /**
     * Clear the cache entirely, throwing away all values.
     */
    clear() {
      for (const index of this.#rindexes({ allowStale: true })) {
        const v = this.#valList[index];
        if (this.#isBackgroundFetch(v)) {
          v.__abortController.abort(new Error("deleted"));
        } else {
          const k = this.#keyList[index];
          if (this.#hasDispose) {
            this.#dispose?.(v, k, "delete");
          }
          if (this.#hasDisposeAfter) {
            this.#disposed?.push([v, k, "delete"]);
          }
        }
      }
      this.#keyMap.clear();
      this.#valList.fill(void 0);
      this.#keyList.fill(void 0);
      if (this.#ttls && this.#starts) {
        this.#ttls.fill(0);
        this.#starts.fill(0);
      }
      if (this.#sizes) {
        this.#sizes.fill(0);
      }
      this.#head = 0;
      this.#tail = 0;
      this.#free.length = 0;
      this.#calculatedSize = 0;
      this.#size = 0;
      if (this.#hasDisposeAfter && this.#disposed) {
        const dt = this.#disposed;
        let task;
        while (task = dt?.shift()) {
          this.#disposeAfter?.(...task);
        }
      }
    }
  };

  // src/gl.js
  function makeShader(gl, type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error("Error compiling shader: " + gl.getShaderInfoLog(shader));
    }
    return shader;
  }
  var Program = class {
    constructor({ gl, vert, frag }) {
      this.gl = gl;
      const vertShader = makeShader(gl, gl.VERTEX_SHADER, vert);
      const fragShader = makeShader(gl, gl.FRAGMENT_SHADER, frag);
      this.program = gl.createProgram();
      gl.attachShader(this.program, vertShader);
      gl.attachShader(this.program, fragShader);
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        throw new Error("Unable to initialize the shader program");
      }
    }
    use() {
      this.gl.useProgram(this.program);
    }
    getUniformLocations(uniformList) {
      const result = {};
      for (const uniformName of uniformList) {
        result[uniformName] = this.gl.getUniformLocation(
          this.program,
          uniformName
        );
      }
      return result;
    }
    getAttribLocations(attribList) {
      const result = {};
      for (const attrName of attribList) {
        result[attrName] = this.gl.getAttribLocation(this.program, attrName);
      }
      return result;
    }
  };
  var Texture = class {
    constructor({ gl, width, height, data, format, type, min, mag }) {
      this.gl = gl;
      const isArray = ArrayBuffer.isView(data) || !data;
      this.format = format ?? gl.RGBA;
      this.type = type ?? gl.UNSIGNED_BYTE;
      this.width = isArray ? width : data.width;
      this.height = isArray ? height : data.height;
      this.min = min ?? gl.NEAREST;
      this.mag = mag ?? gl.NEAREST;
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      if (isArray) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          // level
          gl.RGBA,
          this.width,
          this.height,
          0,
          //border
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          data || null
        );
      } else {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          // level
          this.format,
          this.format,
          this.type,
          data
        );
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.min);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.mag);
      this.unbind();
    }
    bind() {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
    unbind() {
      this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
    subData({ data, xoffset = 0, yoffset = 0, format, type }) {
      const gl = this.gl;
      this.bind();
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        xoffset,
        yoffset,
        format || this.format,
        type || this.type,
        data
      );
      this.unbind();
    }
  };
  var Buffer2 = class {
    constructor({ gl, data }) {
      this.gl = gl;
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    bind() {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    }
  };

  // src/SunCalc.js
  var PI = Math.PI;
  var sin = Math.sin;
  var cos = Math.cos;
  var atan = Math.atan2;
  var rad = PI / 180;
  var e = rad * 23.4397;
  function rightAscension(l) {
    return atan(sin(l) * cos(e), cos(l));
  }
  function sineDeclination(l) {
    return sin(e) * sin(l);
  }
  function solarMeanAnomaly(d) {
    return rad * (357.5291 + 0.98560028 * d);
  }
  function eclipticLongitude(M) {
    const C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 3e-4 * sin(3 * M));
    const P = rad * 102.9372;
    return M + C + P + PI;
  }
  function sunCoords(d) {
    const M = solarMeanAnomaly(d);
    const L = eclipticLongitude(M);
    const sinDec = sineDeclination(L);
    return {
      sinDec,
      cosDec: Math.sqrt(Math.max(0, 1 - sinDec * sinDec)),
      ra: rightAscension(L)
    };
  }
  var dayMs = 1e3 * 60 * 60 * 24;
  var J1970 = 2440588;
  var J2000 = 2451545;
  function toJulian(date) {
    return date.valueOf() / dayMs - 0.5 + J1970;
  }
  function toDays(date) {
    return toJulian(date) - J2000;
  }

  // src/TerminatorTiler.ts
  function tileBounds3857(x, y, z) {
    const res = Math.pow(2, z);
    const MAXEXTENT = 20037508342789244e-9;
    const xmin = MAXEXTENT * (-1 + 2 * x / res);
    const ymin = MAXEXTENT * (1 - 2 * (y + 1) / res);
    const xmax = MAXEXTENT * (-1 + 2 * (x + 1) / res);
    const ymax = MAXEXTENT * (1 - 2 * y / res);
    return [xmin, ymin, xmax, ymax];
  }
  var TerminatorTiler = class {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext("experimental-webgl", {
        willReadFrequently: true,
        attributes: {
          antialias: false,
          depthStencil: false,
          preserveDrawingBuffer: true
        }
      });
      this.gl = gl;
      this.tileTex = new Texture({
        gl,
        width: this.canvas.width,
        height: this.canvas.width
      });
      this.vertexBuffer = new Buffer2({
        gl,
        data: new Float32Array([-4, -4, 4, -4, 0, 4])
      });
      this.program = new Program({
        gl,
        vert: `precision lowp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }`,
        frag: `precision highp float;
        uniform vec2 resolution, fadeRange;
        uniform vec3 sunCoords;
        uniform vec4 aabb;
        uniform float days, siderealTimeOffset, stepping;
        uniform sampler2D texture;
        
        vec2 toWgs84Rad (vec2 xy) {
          return vec2(xy.x, ${Math.PI / 2} - 2.0 * atan(exp(-xy.y)));
        }
        
        // This function adapted from:
        // (c) 2011-2015, Vladimir Agafonkin
        // SunCalc is a JavaScript library for calculating sun/moon position and light phases.
        // https://github.com/mourner/suncalc
        // sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas
        float getSunAltitude (float days, vec2 lngLat, vec3 sunCoords, float siderealTimeOffset) {
          float H = siderealTimeOffset + lngLat.x - sunCoords.z;
          return asin(clamp(sin(lngLat.y) * sunCoords.x + cos(lngLat.y) * sunCoords.y * cos(H),-1.0, 1.0));
        }

        float linearstep(float edge0, float edge1, float value) {
          return clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0);
        }

        float smootherstep(float edge0, float edge1, float value) {
          float x = clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0);
          return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
        }
        
        float steppedstep (float x, float d, float fraction) {
          float xd = x / d;
          float param = smootherstep(-1.0, 1.0, 2.0 * (xd - floor(xd - 0.5) - 1.0) / fraction);
          return d * (param + 0.5 + floor(xd - 0.5));
        }
        
        void main () {
          vec2 uv = (gl_FragCoord.xy / resolution);
        
          // Compute the bbbox in EPSG:3857, divided by the radius of the earth (A)
          vec2 xy = aabb.xw + (aabb.zy - aabb.xw) * uv;
        
          // Convert to lon/lat
          vec2 lngLatRad = toWgs84Rad(xy);
        
          // Compute the altitude of the sun (we don't care about the azimuth)
          float altitude = getSunAltitude(days, lngLatRad, sunCoords, siderealTimeOffset);
        
          // Threshold the value and output it to alpha
          const float step = 6.0;
          float angle = altitude * (180.0 / ${Math.PI});
          float withStep = linearstep(fadeRange.x + step * 0.5, fadeRange.y - step * 0.5, steppedstep(angle, step, 1.0 - stepping));

          float smoothed = smootherstep(fadeRange.x * 2.0, fadeRange.y * 2.0, angle);

          gl_FragColor = texture2D(texture, uv) * mix(smoothed, withStep, stepping);
        }`
      });
      this.attribs = this.program.getAttribLocations(["xy"]);
      this.vertexBuffer.bind();
      gl.vertexAttribPointer(this.attribs.xy, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.uniforms = this.program.getUniformLocations([
        "resolution",
        "aabb",
        "sunCoords",
        "days",
        "fadeRange",
        "stepping",
        "texture",
        "siderealTimeOffset"
      ]);
    }
    render({
      x = 0,
      y = 0,
      z = 0,
      date = Date.now(),
      fadeRange = [0, -18],
      texture = null,
      stepping = 0
    }) {
      const gl = this.gl;
      const { width, height } = this.canvas;
      if (texture)
        this.tileTex.subData({ data: texture });
      this.program.use();
      gl.enableVertexAttribArray(this.attribs.xy);
      const days = toDays(date === void 0 ? Date.now() : date);
      const { sinDec, cosDec, ra } = sunCoords(days);
      const siderealTimeOffset = Math.PI / 180 * (280.16 + 360.9856235 * days) % (2 * Math.PI);
      const aabb = tileBounds3857(x, y, z).map((v) => v / 6378137);
      gl.uniform4fv(this.uniforms.aabb, aabb);
      gl.uniform2f(this.uniforms.resolution, width, height);
      gl.uniform3f(this.uniforms.sunCoords, sinDec, cosDec, ra);
      gl.uniform1f(this.uniforms.days, days);
      gl.uniform1f(this.uniforms.siderealTimeOffset, siderealTimeOffset);
      gl.uniform1f(this.uniforms.stepping, stepping);
      const meanRange = 0.5 * (fadeRange[0] + fadeRange[1]);
      const eps = 1e-15;
      gl.uniform2f(
        this.uniforms.fadeRange,
        Math.max(meanRange + eps, fadeRange[0]),
        Math.min(meanRange - eps, fadeRange[1])
      );
      gl.activeTexture(gl.TEXTURE0);
      this.tileTex.bind();
      gl.uniform1i(this.uniforms.texture, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    async getImageBitmap() {
      return await createImageBitmap(this.canvas, {
        imageOrientation: "flipY"
      });
    }
  };

  // src/TerminatorSource.ts
  var TerminatorSource = class {
    type;
    tileSize;
    tiler;
    _fadeRange;
    _date;
    _stepping;
    tileBitmapCache;
    constructor({
      tileSize = 256,
      fadeRange = [12, -12],
      is2x = window.devicePixelRatio > 1,
      fetchTileImageBitmap,
      date,
      stepping = 0
    }) {
      this.type = "custom";
      this.tileSize = tileSize;
      const renderSize = is2x ? 512 : 256;
      const canvas = document.createElement("canvas");
      canvas.width = renderSize;
      canvas.height = renderSize;
      this.tiler = new TerminatorTiler(canvas);
      this._fadeRange = fadeRange;
      this._date = date ?? Date.now();
      this._stepping = stepping;
      this.tileBitmapCache = new LRUCache({
        max: 50,
        fetchMethod: fetchTileImageBitmap
      });
    }
    clear() {
      this.tileBitmapCache.clear();
    }
    set fadeRange(value) {
      this._fadeRange = value;
      this.clear();
    }
    set stepping(value) {
      this._stepping = value;
      this.clear();
    }
    set date(value) {
      this._date = value;
      this.clear();
    }
    async loadTile({
      x,
      y,
      z
    }) {
      await this.tiler.render({
        x,
        y,
        z,
        date: this._date,
        fadeRange: this._fadeRange,
        stepping: this._stepping,
        texture: await this.tileBitmapCache.fetch(`${z}/${x}/${y}`)
      });
      return this.tiler.getImageBitmap();
    }
  };
})();
