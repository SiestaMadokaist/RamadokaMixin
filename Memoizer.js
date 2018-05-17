const moment = require('moment');
function getMemoizer(){
  if(this.__memoizer__ === undefined || this.__memoizer__ === null){
    this.__memoizer__ = new Memoizer();
  }
  return this.__memoizer__;
}

function propsMemoize(identifier, callback){
  if(this.props[identifier] == undefined){
    return memoize(identifier, callback)
  } else {
    return this.props[identifier];
  }
}


function memoize(identifier, callback, { asyncFunction = false} = {}){
  if(asyncFunction){
    return this.getMemoizer().memoize(identifier, callback);
  } else {
    if(callback.constructor.name === 'AsyncFunction'){
      console.warn(`you're 'memoizing an AsyncFunction called ${identifier}`);
      console.warn(`you might want to use asyncMemoize instead`);
      console.warn(`to silent this message pass an argument called asyncFunction: true`)
      console.warn(`as the 3rd argument in memoize`);
      console.warn(`if you're still not sure where this function called`);
      console.warn(`try setting process.env.FULL_BACKTRACE=true`);
      if(process.env.FULL_BACKTRACE){
        try {
          throw new Error('raised debugging error');
        } catch(err){
          console.err(err.stack);
        };
      };
    };
    return this.getMemoizer().memoize(identifier, callback);
  }
}
function expireMemoize(identifier, callback, expiry = 3000){
  return this.getMemoizer().expireMemoize(identifier, callback, expiry);
}

function expireMemoizeAsync(identifier, callback, expiry = 3000){
  if(typeof(identifier) !== 'string'){ throw new Error('first argument in asyncMemoize should a string identifier'); };
  return this.getMemoizer().expireMemoizeAsync(identifier, callback, expiry);
}

function asyncMemoize(identifier, callback){
  if(typeof(identifier) !== 'string'){ throw new Error('first argument in asyncMemoize should a string identifier'); };
  return this.getMemoizer().asyncMemoize(identifier, callback);
}

function forceMemoize(params){
  return this.getMemoizer().forceMemoize(params);
}

const prototypes = {
  propsMemoize,
  expireMemoizeAsync,
  expireMemoize,
  getMemoizer,
  memoize,
  asyncMemoize,
  forceMemoize,
}

class Memoizer {
  constructor(){
    this.memo = {};
    this.expiry = {};
  }

  expired(identifier){
    const expireTime = this.expiry[identifier];
    const now = moment();
    return now > expireTime;
  }

  async expireMemoizeAsync(identifier, callback, expiry = 3000, ...args){
    const o = {};
    o[identifier] = callback;
    if(this.memo[identifier] === undefined){
      this.expiry[identifier] = moment().add(expiry);
      const promise = o[identifier](...args);
      this.memo[identifier] = promise;
      promise.catch(() => { this.memo[identifier] = undefined });
    } else if(this.expired(identifier)){
      this.expiry[identifier] = moment().add(expiry);
      const promise = o[identifier](...args);
      this.memo[identifier] = promise;
      promise.catch(() => { this.memo[identifier] = undefined });
    };
    return this.memo[identifier];
  }

  expireMemoize(identifier, callback, expiry = 3000, ...args){
    const o = {};
    o[identifier] = callback;
    if(this.memo[identifier] === undefined){
      this.expiry[identifier] = moment().add(expiry);
      this.memo[identifier] = o[identifier](...args);
    } else if(this.expired(identifier)){
      this.expiry[identifier] = moment().add(expiry);
      this.memo[identifier] = o[identifier](...args)
    };
    return this.memo[identifier];
  }

  memoize(identifier, callback, ...args){
    const o = {};
    o[identifier] = callback;
    if(this.memo[identifier] === undefined){
      this.memo[identifier] = o[identifier](...args);
    }
    return this.memo[identifier];
  }

  async asyncMemoize(identifier, callback, ...args){
    const o = {};
    o[identifier] = callback;
    if(this.memo[identifier] === undefined){
      this.memo[identifier] = await o[identifier](...args);
    }
    return this.memo[identifier];
  }

  forceMemoize(dataToMemoize = {}){
    for(let key of Object.keys(dataToMemoize)){
      this.memo[key] = dataToMemoize[key];
    };
  }

  unmemoize(identifier){
    return this.memo[identifier] = undefined;
  }

  static intercept(klass){
    const prototypeKeys = Object.keys(prototypes);
    for(let key of prototypeKeys){
      klass.prototype[key] = prototypes[key];
    }
  }

  static extend(klass){
    return this.intercept(klass);
  }

  static staticIntercept(klass){
    const prototypeKeys = Object.keys(prototypes);
    for(let key of prototypeKeys){
      klass[key] = prototypes[key];
    }
  }

  static staticExtend(klass){
    return this.staticIntercept(klass);
  }

}


if(__filename === process.argv[1]){
  const callback = async (time = 3000) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => { reject(Math.random()) }, time)
    });
  };

  const m = new Memoizer();
  for(var i = 0; i < 30; i++){
    m.expireMemoizeAsync('test', callback, 3000).then(console.log);
  }
}

module.exports = Memoizer;
